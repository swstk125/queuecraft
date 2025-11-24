const JobService = require("../api/service/JobService");
const JobHandler = require("./jobHandler.js");
const config = require("../config");
const logger = require("../util/logger");

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
  // Sort by creation date (con) in ascending order to ensure FIFO (First In First Out)
  const data = await JobService.getJobs({}, {status: "pending"}, {con: 1});
  if (data.success && data.jobs.length > 0) {
    logger.debug('Fetched pending jobs', { 
      count: data.jobs.length,
      jobIds: data.jobs.map(j => j._id).slice(0, 5) // Log first 5 job IDs
    });
  }
  return data;
}



const initializeJobProcessor = async () => {
  logger.info('Job processor initialized', { 
    concurrency: CONCURRENCY,
    service: 'jobProcessor'
  });
  
  let globalJobCounter = 0; // Track global job counter
  
  while (true) {
    try {
      const pendingJobs = await getJobs();

      if (pendingJobs.success && pendingJobs.jobs.length > 0) {
        const batches = chunk(pendingJobs.jobs, CONCURRENCY);

        logger.debug('Processing job batches', {
          totalJobs: pendingJobs.jobs.length,
          batchCount: batches.length,
          concurrency: CONCURRENCY
        });

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
        const pollingDelay = config.get('job.pollingDelay');
        await new Promise(resolve => setTimeout(resolve, pollingDelay));
      }
    } catch (error) {
      logger.error('Error in job processor loop', error, {
        service: 'jobProcessor'
      });
      // Wait before retrying to prevent rapid error loops
      const errorRetryDelay = config.get('job.errorRetryDelay');
      await new Promise(resolve => setTimeout(resolve, errorRetryDelay));
    }
  }
};

module.exports = initializeJobProcessor;
