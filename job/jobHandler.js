const JobService = require("../api/service/JobService");

const leaseJobs = async (jobData, jobCounter) => {
  const { _id: jobId, name } = jobData;
  let status = "failed";

  try {
    await JobService.updateJob(jobData._id, {status: "running"});
    
    // Wait for the job to complete (10 seconds)
    await new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Job ${jobId} (${name || 'unnamed'}) leased for 10 seconds`);
        
        // Deterministic failure logic for assignment demonstration:
        // 1. Jobs with "fail" in name ALWAYS fail (for DLQ demonstration)
        // 2. Otherwise, every 3rd job fails (for general retry demonstration)
        const shouldAlwaysFail = name && name.toLowerCase().includes('fail');
        
        if(shouldAlwaysFail) {
          status = "failed";
          console.log(`Job ${jobId} (${name}) - marked to always fail for DLQ demo`);
        } else if(jobCounter % 3 == 0) {
          status = "failed";
          console.log(`Job ${jobId} (${name}) - failed (counter: ${jobCounter})`);
        } else {
          status = "success";
          console.log(`Job ${jobId} (${name}) - succeeded`);
        }
        resolve();
      }, 10000);
    });

    // Process the result after the timeout completes
    if(status == "failed") {
      await retryFailedJobs(jobData, jobCounter);
    } else if(status == "success") {
      await ackJobs(jobData);
    }
  } catch (error) {
    console.error('Error leasing job:', error);
    status = "failed";
    await retryFailedJobs(jobData, jobCounter);
  }
}

const ackJobs = async (jobData) => {
  const { _id: jobId } = jobData;
  console.log(`Job ${jobId} acknowledged`);
  try {
    await JobService.updateJob(jobData._id, {status: "completed"});
  } catch (error) {
    console.error('Error acknowledging job:', error);
  }
}

const retryFailedJobs = async (jobData, jobCounter) => {
  const { _id: jobId } = jobData;
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
      console.log(`Job ${jobId} marked for retry (attempt ${retryCount}/3)`);
    }
  } catch (error) {
    console.error('Error retrying failed job:', error);
  }
}

const dlqJobs = async (jobData) => {
  const { _id: jobId } = jobData;
  console.log(`Job ${jobId} DLQed`);
  try {
    await JobService.updateJob(jobData._id, {status: "dlq"});
  } catch (error) {
    console.error('Error DLQing job:', error);
  }
}

module.exports = {
  leaseJobs,
  ackJobs,
  retryFailedJobs,
  dlqJobs
}