const getModel = require("../../db/model");
const jobStatusEmitter = require("../../websocket/jobStatusEmitter");
const cache = require("../../util/cacheUtils");
const logger = require("../../util/logger");
const metricsService = require("../../util/metricsService");

// Rate limiting configuration
const MAX_ACTIVE_JOBS_PER_USER = 5;
const ACTIVE_JOB_STATUSES = ["pending", "running"];

class JobService{
  constructor() {
    this.jobModel = getModel("job");
  }

  /**
   * Get active job count from cache or DB
   * @param {string} userId - User ID
   * @returns {Promise<number>} Active job count
   */
  async getActiveJobCount(userId) {
    const cacheKey = cache.getActiveJobCountKey(userId);
    
    // Try to get from cache
    const cachedCount = await cache.get(cacheKey);
    if (cachedCount !== null) {
      return cachedCount;
    }
    
    // Get from DB and cache it
    const count = await this.jobModel.countDocuments({
      ownerId: userId,
      status: { $in: ACTIVE_JOB_STATUSES }
    });
    
    // Cache for 30 seconds (short TTL for accuracy)
    await cache.set(cacheKey, count, 30);
    
    return count;
  }

  /**
   * Invalidate active job count cache for a user
   * @param {string} userId - User ID
   */
  async invalidateActiveJobCountCache(userId) {
    const cacheKey = cache.getActiveJobCountKey(userId);
    await cache.del(cacheKey);
  }

  /**
   * Invalidate all job-related caches for a user
   * @param {string} userId - User ID
   */
  async invalidateUserJobsCaches(userId) {
    await this.invalidateActiveJobCountCache(userId);
    // Invalidate all job list caches for this user
    await cache.delPattern(`jobs:user:${userId}:*`);
  }

  /**
   * Create a new job with rate limiting
   * Enforces maximum 5 pending/running jobs per user
   */
  async createJobs (authInfo, payload){
    try {
      const userId = authInfo.userId;
      
      // Check current active job count (with caching)
      const activeJobCount = await this.getActiveJobCount(userId);
      
      // Enforce rate limit
      if (activeJobCount >= MAX_ACTIVE_JOBS_PER_USER) {
        const error = new Error(`Rate limit exceeded. Maximum ${MAX_ACTIVE_JOBS_PER_USER} active jobs allowed.`);
        error.statusCode = 429;
        
        // Record rate limit hit
        await metricsService.recordRateLimitHit();
        
        logger.warn('Job creation rate limit exceeded', {
          userId,
          activeJobCount,
          maxAllowed: MAX_ACTIVE_JOBS_PER_USER,
          jobName: payload.name
        });
        
        throw error;
      }
      
      // Create job
      payload.ownerId = userId;
      payload.con = new Date();
      payload.mon = new Date();
      payload.status = payload.status || "pending";
      
      const job = await this.jobModel.create(payload);
      
      // Invalidate caches
      await this.invalidateUserJobsCaches(userId);
      
      // Cache the new job
      const jobObject = job.toObject ? job.toObject() : job;
      await cache.set(cache.getJobByIdKey(job._id), jobObject, 300);
      
      // Record metrics
      await metricsService.recordJobSubmitted();
      
      // Log job submission
      logger.logJobEvent('submit', jobObject, { userId });
      
      // Emit job created event for WebSocket
      jobStatusEmitter.emitJobCreated(jobObject, userId);
      
      logger.debug('Job created event emitted', { 
        jobId: job._id, 
        userId 
      });
      
      return {success: true, job: job};
      
    } catch (error) {
      logger.error('Error creating job', error, {
        userId: authInfo?.userId,
        jobName: payload?.name
      });
      throw error;
    }
  }

  /**
   * Get jobs for a user (with caching)
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
        
        // Try to get from cache
        const cacheKey = cache.getUserJobsKey(authInfo.userId, query);
        const cachedJobs = await cache.get(cacheKey);
        
        if (cachedJobs) {
          logger.debug('Jobs fetched from cache', { 
            userId: authInfo.userId, 
            count: cachedJobs.length 
          });
          return {success: true, jobs: cachedJobs};
        }
      }
      
      // Get from DB
      const jobs = await this.jobModel.find(filter);
      const jobsArray = jobs.map(job => job.toObject ? job.toObject() : job);
      
      // Cache if user-specific query
      if (authInfo && authInfo.userId) {
        const cacheKey = cache.getUserJobsKey(authInfo.userId, query);
        await cache.set(cacheKey, jobsArray, 60); // Cache for 60 seconds
      }
      
      logger.debug('Jobs fetched from database', { 
        userId: authInfo?.userId, 
        count: jobsArray.length,
        filter 
      });
      
      return {success: true, jobs: jobsArray};
    } catch (error) {
      logger.error('Error getting jobs', error, {
        userId: authInfo?.userId,
        query
      });
      throw error;
    }
  }

  /**
   * Update a job and invalidate caches
   * @param {String} jobId - Job ID
   * @param {Object} payload - Update payload
   * @returns {Promise<Object>} Update result
   */
  async updateJob(jobId, payload) {
    try {
      // Get the job first to know the owner
      const existingJob = await this.jobModel.findById(jobId);
      
      const job = await this.jobModel.updateOne({_id: jobId}, {$set: {...payload, mon: new Date()}});
      
      // Invalidate caches
      if (existingJob && existingJob.ownerId) {
        await this.invalidateUserJobsCaches(existingJob.ownerId);
      }
      await cache.del(cache.getJobByIdKey(jobId));
      
      logger.debug('Job updated', {
        jobId,
        oldStatus: existingJob?.status,
        newStatus: payload.status,
        ownerId: existingJob?.ownerId
      });
      
      return {success: true, job: job};
    } catch (error) {
      logger.error('Error updating job', error, { jobId });
      throw error;
    }
  }

  /**
   * Get a job by ID (with caching)
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job object
   */
  async getJobById(jobId) {
    try {
      // Try cache first
      const cacheKey = cache.getJobByIdKey(jobId);
      const cachedJob = await cache.get(cacheKey);
      
      if (cachedJob) {
        logger.debug('Job fetched from cache', { jobId });
        return cachedJob;
      }
      
      // Get from DB
      const job = await this.jobModel.findById(jobId);
      if (job) {
        const jobObject = job.toObject ? job.toObject() : job;
        await cache.set(cacheKey, jobObject, 300);
        logger.debug('Job fetched from database', { jobId });
        return jobObject;
      }
      
      logger.warn('Job not found', { jobId });
      return null;
    } catch (error) {
      logger.error('Error getting job by ID', error, { jobId });
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