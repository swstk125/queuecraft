const JobService = require("../api/service/JobService");

const leaseJobs = async (jobData, jobCounter) => {
  const { _id: jobId } = jobData;
  let status = "failed";

  try {
    await JobService.updateJob(jobData._id, {status: "running"});
    
    // Wait for the job to complete (10 seconds)
    await new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Job ${jobId} leased for 10 seconds`);
        if(jobCounter % 3 == 0) {
          status = "failed";
        } else {
          status = "success";
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
      // Update retryCount in database
      await JobService.updateJob(jobData._id, {status: "pending"});
      jobData.retryCount = retryCount;
      await leaseJobs(jobData, jobCounter);
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