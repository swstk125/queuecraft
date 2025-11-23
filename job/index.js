const JobService = require("../api/service/JobService");
const JobHandler = require("./jobHandler.js");
const config = require("../config");

// Get concurrency level from config
const CONCURRENCY = config.get('job.concurrency');

// Utility to split jobs into N-sized batches
const chunk = (array, size) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

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
  console.log('Job processor initialized with concurrency:', CONCURRENCY);
  let globalJobCounter = 0; // Track global job counter
  
  while (true) {
    try {
      const pendingJobs = await getJobs();

      if (pendingJobs.success && pendingJobs.jobs.length > 0) {
        const batches = chunk(pendingJobs.jobs, CONCURRENCY);

        for (const batch of batches) {
          await Promise.all(
            batch.map((job) => {
              globalJobCounter++;
              return JobHandler.leaseJobs(job, globalJobCounter);
            })
          );
        }
      } else {
        // Add delay when no jobs are pending to prevent database hammering
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error('Error in job processor loop:', error);
      // Wait before retrying to prevent rapid error loops
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

module.exports = initializeJobProcessor;
