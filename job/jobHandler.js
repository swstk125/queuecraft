const JobService = require("../api/service/JobService");
const jobStatusEmitter = require("../websocket/jobStatusEmitter");
const getModel = require("../db/model");
const cache = require("../util/cacheUtils");
const logger = require("../util/logger");
const metricsService = require("../util/metricsService");

// Helper to fetch updated job from database (with cache invalidation)
const getUpdatedJob = async (jobId) => {
  try {
    // Invalidate cache first to ensure fresh data
    await cache.del(cache.getJobByIdKey(jobId));
    
    const jobModel = getModel("job");
    const job = await jobModel.findById(jobId);
    
    // Cache the updated job
    if (job) {
      const jobObject = job.toObject();
      await cache.set(cache.getJobByIdKey(jobId), jobObject, 300);
      return jobObject;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching updated job:', error);
    return null;
  }
};

const leaseJobs = async (jobData, jobCounter) => {
  const { _id: jobId, name, ownerId } = jobData;
  let status = "failed";
  const startTime = Date.now();

  try {
    // Update job status to running
    await JobService.updateJob(jobData._id, {status: "running"});
    
    // Fetch updated job and emit event
    const updatedJob = await getUpdatedJob(jobData._id);
    if (updatedJob) {
      jobStatusEmitter.emitJobStatusUpdated(updatedJob, 'pending');
      
      // Record metrics and log
      await metricsService.recordJobStarted();
      logger.logJobEvent('start', updatedJob, { jobCounter });
    }
    
    // Wait for the job to complete (10 seconds)
    await new Promise((resolve) => {
      setTimeout(() => {
        // Deterministic failure logic for assignment demonstration:
        // 1. Jobs with "fail" in name ALWAYS fail (for DLQ demonstration)
        // 2. Otherwise, every 3rd job fails (for general retry demonstration)
        const shouldAlwaysFail = name && name.toLowerCase().includes('fail');
        
        if(shouldAlwaysFail) {
          status = "failed";
          logger.debug('Job marked to fail', { 
            jobId, 
            name, 
            reason: 'name contains "fail"' 
          });
        } else if(jobCounter % 3 == 0) {
          status = "failed";
          logger.debug('Job failed', { 
            jobId, 
            name, 
            jobCounter, 
            reason: 'every 3rd job fails' 
          });
        } else {
          status = "success";
          logger.debug('Job succeeded', { jobId, name, jobCounter });
        }
        resolve();
      }, 10000);
    });

    // Record processing time
    const processingTime = Date.now() - startTime;
    await metricsService.recordJobProcessingTime(jobId, processingTime);

    // Process the result after the timeout completes
    if(status == "failed") {
      await retryFailedJobs(jobData, jobCounter);
    } else if(status == "success") {
      await ackJobs(jobData, processingTime);
    }
  } catch (error) {
    logger.error('Error leasing job', error, { jobId, name, ownerId });
    status = "failed";
    await retryFailedJobs(jobData, jobCounter);
  }
}

const ackJobs = async (jobData, processingTime) => {
  const { _id: jobId, name, ownerId } = jobData;
  try {
    await JobService.updateJob(jobData._id, {status: "completed"});
    
    // Fetch updated job and emit events
    const completedJob = await getUpdatedJob(jobData._id);
    if (completedJob) {
      jobStatusEmitter.emitJobCompleted(completedJob);
      jobStatusEmitter.emitJobStatusUpdated(completedJob, 'running');
      
      // Record metrics and log
      await metricsService.recordJobCompleted();
      logger.logJobEvent('finish', completedJob, { 
        processingTime: `${processingTime}ms` 
      });
    }
  } catch (error) {
    logger.error('Error acknowledging job', error, { jobId, name, ownerId });
  }
}

const retryFailedJobs = async (jobData, jobCounter) => {
  const { _id: jobId, name, ownerId } = jobData;
  let retryCount = jobData.retryCount || 0;
  try {
    retryCount++;
    if(retryCount > 3) {
      await dlqJobs(jobData);
    } else {
      // Update retryCount AND status in database - DO NOT retry immediately
      // Let the job processor pick it up in the next cycle
      await JobService.updateJob(jobData._id, {
        status: "pending",
        retryCount: retryCount
      });
      
      // Fetch updated job and emit event
      const retryJob = await getUpdatedJob(jobData._id);
      if (retryJob) {
        jobStatusEmitter.emitJobStatusUpdated(retryJob, 'running');
        
        // Record metrics and log
        await metricsService.recordJobRetry();
        logger.logJobEvent('retry', retryJob, { 
          retryCount, 
          maxRetries: 3,
          reason: 'Job execution failed'
        });
      }
    }
  } catch (error) {
    logger.error('Error retrying failed job', error, { 
      jobId, 
      name, 
      ownerId, 
      retryCount 
    });
  }
}

const dlqJobs = async (jobData) => {
  const { _id: jobId, name, ownerId } = jobData;
  try {
    await JobService.updateJob(jobData._id, {status: "dlq"});
    
    // Fetch updated job and emit events
    const dlqJob = await getUpdatedJob(jobData._id);
    if (dlqJob) {
      jobStatusEmitter.emitJobMovedToDLQ(dlqJob);
      jobStatusEmitter.emitJobStatusUpdated(dlqJob, 'running');
      
      // Record metrics and log
      await metricsService.recordJobDLQ();
      logger.logJobEvent('dlq', dlqJob, { 
        reason: 'Max retries exceeded',
        maxRetries: 3
      });
    }
  } catch (error) {
    logger.error('Error moving job to DLQ', error, { jobId, name, ownerId });
  }
}

module.exports = {
  leaseJobs,
  ackJobs,
  retryFailedJobs,
  dlqJobs
}