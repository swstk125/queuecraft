const JobService = require("../api/service/JobService");
const JobHandler = require("./jobHandler.js");

const getJobs = async () => {
  const data = await JobService.getJobs({}, {status: "pending"});
  if (data.success) {
    for (const job of data.jobs) {
      console.log(job);
    }
  }
  return data;
}

const initializeJobProcessor = async () => {
  console.log('Job processor initialized');
  while (true) {
    try {
      const pendingJobs = await getJobs();
      if(pendingJobs.success && pendingJobs.jobs.length > 0) {
        var jobCounter = 0;
        for (const job of pendingJobs.jobs) {
          // lease jobs
          jobCounter++;
          await JobHandler.leaseJobs(job, jobCounter);
        }
        // Small delay between batches to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      else {
        console.log('No pending jobs found');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error('Error in job processor loop:', error);
      // Wait before retrying to prevent rapid error loops
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

module.exports = initializeJobProcessor;
