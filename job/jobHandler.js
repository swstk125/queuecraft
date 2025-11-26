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
    logger.error('Error fetching updated job', error, { jobId });
    return null;
  }
};

/**
 * Main job processing function for RabbitMQ integration
 * Handles the complete job lifecycle: lease -> process -> ack/nack
 * 
 * @param {Object} jobData - Job data from RabbitMQ message
 * @param {number} jobCounter - Global job counter for demo purposes
 * @throws {Error} If job processing fails (triggers RabbitMQ retry/DLQ)
 */
const processJob = async (jobData, jobCounter) => {
  const jobId = jobData.jobId || jobData._id;
  const { name, ownerId } = jobData;
  const startTime = Date.now();

  try {
    // LEASE: Update job status to running
    logger.info('Job leased for processing', { jobId, name });
    await JobService.updateJob(jobId, { status: "running" });
    
    // Fetch updated job and emit event
    const runningJob = await getUpdatedJob(jobId);
    if (runningJob) {
      jobStatusEmitter.emitJobStatusUpdated(runningJob, 'pending');
      
      // Record metrics and log
      await metricsService.recordJobStarted();
      logger.logJobEvent('start', runningJob, { jobCounter });
    }
    
    // PROCESS: Simulate job execution (10 seconds)
    // In production, this would be actual work (API calls, data processing, etc.)
    const jobResult = await executeJobLogic(name, jobCounter);
    
    // Record processing time
    const processingTime = Date.now() - startTime;
    await metricsService.recordJobProcessingTime(jobId, processingTime);
    
    if (jobResult.success) {
      // ACK: Job succeeded, mark as completed
      await JobService.updateJob(jobId, { status: "completed" });
      
      const completedJob = await getUpdatedJob(jobId);
      if (completedJob) {
        jobStatusEmitter.emitJobCompleted(completedJob);
        jobStatusEmitter.emitJobStatusUpdated(completedJob, 'running');
        
        // Record metrics and log
        await metricsService.recordJobCompleted();
        logger.logJobEvent('finish', completedJob, { 
          processingTime: `${processingTime}ms` 
        });
      }
      
      logger.info('Job completed successfully', { jobId, processingTime });
      
    } else {
      // Job failed - throw error to trigger RabbitMQ retry/DLQ logic
      throw new Error(jobResult.error || 'Job execution failed');
    }
    
  } catch (error) {
    logger.error('Job processing failed', error, { jobId, name, ownerId });
    
    // Update job status to failed (RabbitMQ will handle retry)
    try {
      await JobService.updateJob(jobId, { status: "failed" });
      const failedJob = await getUpdatedJob(jobId);
      if (failedJob) {
        jobStatusEmitter.emitJobStatusUpdated(failedJob, 'running');
      }
    } catch (updateError) {
      logger.error('Error updating failed job status', updateError, { jobId });
    }
    
    // Re-throw to let RabbitMQ handle retry/DLQ
    throw error;
  }
};

/**
 * Execute the actual job logic
 * This is where the real work happens in production
 * 
 * @param {string} name - Job name
 * @param {number} jobCounter - Job counter
 * @returns {Promise<Object>} Result with success flag and optional error
 */
const executeJobLogic = async (name, jobCounter) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Deterministic failure logic for assignment demonstration:
      // 1. Jobs with "fail" in name ALWAYS fail (for DLQ demonstration)
      // 2. Otherwise, every 3rd job fails (for general retry demonstration)
      const shouldAlwaysFail = name && name.toLowerCase().includes('fail');
      
      if (shouldAlwaysFail) {
        logger.debug('Job marked to fail', { 
          name, 
          reason: 'name contains "fail"' 
        });
        resolve({ success: false, error: 'Job name contains "fail"' });
      } else if (jobCounter % 3 === 0) {
        logger.debug('Job failed', { 
          name, 
          jobCounter, 
          reason: 'every 3rd job fails' 
        });
        resolve({ success: false, error: 'Simulated failure (every 3rd job)' });
      } else {
        logger.debug('Job succeeded', { name, jobCounter });
        resolve({ success: true });
      }
    }, 10000); // 10 second processing time
  });
};

/**
 * Handle DLQ job (called by RabbitMQ when max retries exceeded)
 * Updates the database status to 'dlq' for monitoring
 * 
 * @param {Object} jobData - Job data
 */
const handleDLQJob = async (jobData) => {
  const jobId = jobData.jobId || jobData._id;
  const { name, ownerId } = jobData;
  
  try {
    logger.warn('Job moved to Dead Letter Queue', { jobId, name });
    
    await JobService.updateJob(jobId, { status: "dlq" });
    
    // Fetch updated job and emit events
    const dlqJob = await getUpdatedJob(jobId);
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
    logger.error('Error handling DLQ job', error, { jobId, name, ownerId });
  }
};

/**
 * Legacy function kept for backward compatibility
 * Use processJob instead for RabbitMQ integration
 */
const leaseJobs = async (jobData, jobCounter) => {
  logger.warn('leaseJobs is deprecated, use processJob instead');
  return processJob(jobData, jobCounter);
};

module.exports = {
  processJob,
  handleDLQJob,
  leaseJobs, // Kept for backward compatibility
  getUpdatedJob
};
