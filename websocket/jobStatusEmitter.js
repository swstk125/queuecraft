/**
 * Job Status Event Emitter with Redis Pub/Sub
 * Emits job status changes for WebSocket broadcasting across processes
 */

const EventEmitter = require('events');
const { publishJobEvent } = require('./jobEventBridge');

class JobStatusEmitter extends EventEmitter {
  constructor() {
    super();
  }

  /**
   * Emit job created event
   * @param {Object} job - Created job object
   * @param {String} userId - User ID who created the job
   */
  emitJobCreated(job, userId) {
    const data = { job, userId, timestamp: new Date() };
    // Emit locally (for same process)
    this.emit('job:created', data);
    // Publish to Redis (for cross-process)
    publishJobEvent('job:created', data);
  }

  /**
   * Emit job status updated event
   * @param {Object} job - Updated job object
   * @param {String} oldStatus - Previous status
   */
  emitJobStatusUpdated(job, oldStatus) {
    const data = { 
      job, 
      oldStatus, 
      newStatus: job.status,
      timestamp: new Date() 
    };
    // Emit locally
    this.emit('job:status:updated', data);
    // Publish to Redis
    publishJobEvent('job:status:updated', data);
  }

  /**
   * Emit job moved to DLQ
   * @param {Object} job - Job moved to DLQ
   */
  emitJobMovedToDLQ(job) {
    const data = { job, timestamp: new Date() };
    // Emit locally
    this.emit('job:dlq', data);
    // Publish to Redis
    publishJobEvent('job:dlq', data);
  }

  /**
   * Emit job completed event
   * @param {Object} job - Completed job
   */
  emitJobCompleted(job) {
    const data = { job, timestamp: new Date() };
    // Emit locally
    this.emit('job:completed', data);
    // Publish to Redis
    publishJobEvent('job:completed', data);
  }
}

// Export singleton instance
module.exports = new JobStatusEmitter();

