const getModel = require("../../db/model");

class JobService{
  constructor() {
    this.jobModel = getModel("job");
  }

  /**
   * Create a new job
   * @param {Object} authInfo - Authentication information
   * @param {Object} payload - Job payload data
   * @returns {Promise<Object>} Created job object
   */
  async createJobs (authInfo, payload){
    // create job
    try {
      payload.ownerId = authInfo.userId;
      payload.con = new Date();
      payload.mon = new Date();
      const job = await this.jobModel.create(payload);
      return {success: true, job: job};
    } catch (error) {
      console.error('Error creating job:', error);
      throw error;
    }
  }

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

  async updateJob(jobId, payload) {
    try {
      const job = await this.jobModel.updateOne({_id: jobId}, {$set: {...payload, mon: new Date()}});
      return {success: true, job: job};
    } catch (error) {
      console.error('Error updating job:', error);
      throw error;
    }
  }
}

module.exports = new JobService();