const getModel = require("../../db/model");

// Rate limiting configuration
const MAX_ACTIVE_JOBS_PER_USER = 5;
const ACTIVE_JOB_STATUSES = ["pending", "running"];

class JobService{
  constructor() {
    this.jobModel = getModel("job");
  }

  /**
   * Create a new job with rate limiting
   * Enforces maximum 5 pending/running jobs per user
   */
  async createJobs (authInfo, payload){
    try {
      const userId = authInfo.userId;
      
      // Check current active job count
      const activeJobCount = await this.jobModel.countDocuments({
        ownerId: userId,
        status: { $in: ACTIVE_JOB_STATUSES }
      });
      
      // Enforce rate limit
      if (activeJobCount >= MAX_ACTIVE_JOBS_PER_USER) {
        const error = new Error(`Rate limit exceeded. Maximum ${MAX_ACTIVE_JOBS_PER_USER} active jobs allowed.`);
        error.statusCode = 429;
        throw error;
      }
      
      // Create job
      payload.ownerId = userId;
      payload.con = new Date();
      payload.mon = new Date();
      payload.status = payload.status || "pending";
      
      const job = await this.jobModel.create(payload);
      return {success: true, job: job};
      
    } catch (error) {
      console.error('Error creating job:', error);
      throw error;
    }
  }

  /**
   * Get jobs for a user
   * @param {Object} authInfo - Authentication information
   * @param {Object} query - Query filters
   * @returns {Promise<Object>} List of jobs
   */
  async getJobs(authInfo, query) {
    try {
      const filter = {...query};
      // Only filter by ownerId if authInfo and userId are provided
      if (authInfo && authInfo.userId) {
        filter.ownerId = authInfo.userId;
      }
      const jobs = await this.jobModel.find(filter);
      return {success: true, jobs: jobs};
    } catch (error) {
      console.error('Error getting jobs:', error);
      throw error;
    }
  }

  /**
   * Update a job
   * @param {String} jobId - Job ID
   * @param {Object} payload - Update payload
   * @returns {Promise<Object>} Update result
   */
  async updateJob(jobId, payload) {
    try {
      const job = await this.jobModel.updateOne({_id: jobId}, {$set: {...payload, mon: new Date()}});
      return {success: true, job: job};
    } catch (error) {
      console.error('Error updating job:', error);
      throw error;
    }
  }

  /**
   * Get the maximum allowed active jobs per user
   * @returns {Number} Maximum active jobs limit
   */
  getMaxActiveJobsLimit() {
    return MAX_ACTIVE_JOBS_PER_USER;
  }
}

module.exports = new JobService();