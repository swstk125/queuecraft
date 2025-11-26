const amqp = require('amqplib');
const config = require('../config');
const logger = require('../util/logger');

class RabbitMQConnection {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    
    // Queue configuration
    this.QUEUE_NAME = 'job-queue';
    this.DLQ_EXCHANGE = 'dlx';
    this.DLQ_QUEUE = 'job-dlq';
    this.DLQ_ROUTING_KEY = 'job-routing-key';
  }

  /**
   * Initialize RabbitMQ connection and setup queues
   */
  async connect() {
    try {
      if (this.isConnected) {
        logger.debug('RabbitMQ already connected');
        return;
      }

      const rabbitmqUrl = config.get('rabbitmq.url') || 'amqp://localhost:5672';
      
      logger.info('Connecting to RabbitMQ', { url: rabbitmqUrl });
      
      // Create connection
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      
      // Setup queues
      await this.setupQueues();
      
      this.isConnected = true;
      
      logger.info('RabbitMQ connected successfully');

      // Handle connection errors
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error', err);
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed, reconnecting...');
        this.isConnected = false;
        // Reconnect after 5 seconds
        setTimeout(() => this.connect(), 5000);
      });

    } catch (error) {
      logger.error('Failed to connect to RabbitMQ', error);
      this.isConnected = false;
      // Retry connection after 5 seconds
      setTimeout(() => this.connect(), 5000);
      throw error;
    }
  }

  /**
   * Setup queues with Dead Letter Queue configuration
   */
  async setupQueues() {
    try {
      // 1. Create Dead Letter Exchange
      await this.channel.assertExchange(this.DLQ_EXCHANGE, 'direct', { 
        durable: true 
      });

      // 2. Create Dead Letter Queue
      await this.channel.assertQueue(this.DLQ_QUEUE, { 
        durable: true 
      });

      // 3. Bind DLQ to DLX
      await this.channel.bindQueue(
        this.DLQ_QUEUE, 
        this.DLQ_EXCHANGE, 
        this.DLQ_ROUTING_KEY
      );

      // 4. Create main job queue with DLQ configuration
      await this.channel.assertQueue(this.QUEUE_NAME, {
        durable: true,
        arguments: {
          // Send to DLX when message is rejected/nacked
          'x-dead-letter-exchange': this.DLQ_EXCHANGE,
          'x-dead-letter-routing-key': this.DLQ_ROUTING_KEY,
        }
      });

      // 5. Set prefetch for rate limiting (concurrency control)
      const concurrency = config.get('job.concurrency') || 5;
      await this.channel.prefetch(concurrency);

      logger.info('RabbitMQ queues setup complete', {
        mainQueue: this.QUEUE_NAME,
        dlqQueue: this.DLQ_QUEUE,
        concurrency
      });

    } catch (error) {
      logger.error('Failed to setup RabbitMQ queues', error);
      throw error;
    }
  }

  /**
   * Publish a job to the queue
   * @param {Object} jobData - Job data to publish
   * @param {Object} options - Publishing options
   * @returns {Promise<boolean>} Success status
   */
  async publishJob(jobData, options = {}) {
    try {
      if (!this.isConnected || !this.channel) {
        throw new Error('RabbitMQ not connected');
      }

      const message = Buffer.from(JSON.stringify(jobData));
      
      const publishOptions = {
        persistent: true, // Survive broker restarts
        headers: {
          'x-retry-count': options.retryCount || 0,
          'jobId': jobData.jobId || jobData._id,
          'timestamp': new Date().toISOString()
        },
        ...options
      };

      const sent = this.channel.sendToQueue(
        this.QUEUE_NAME,
        message,
        publishOptions
      );

      if (sent) {
        logger.debug('Job published to RabbitMQ', {
          jobId: jobData.jobId || jobData._id,
          queueName: this.QUEUE_NAME
        });
      } else {
        logger.warn('RabbitMQ queue is full, message buffered', {
          jobId: jobData.jobId || jobData._id
        });
      }

      return sent;

    } catch (error) {
      logger.error('Failed to publish job to RabbitMQ', error, {
        jobData
      });
      throw error;
    }
  }

  /**
   * Consume jobs from the queue
   * @param {Function} messageHandler - Async function to handle each message
   * @returns {Promise<string>} Consumer tag
   */
  async consumeJobs(messageHandler) {
    try {
      if (!this.isConnected || !this.channel) {
        throw new Error('RabbitMQ not connected');
      }

      logger.info('Starting RabbitMQ consumer', {
        queueName: this.QUEUE_NAME
      });

      const consumerTag = await this.channel.consume(
        this.QUEUE_NAME,
        async (msg) => {
          if (!msg) {
            logger.warn('Consumer cancelled by server');
            return;
          }

          const jobData = JSON.parse(msg.content.toString());
          const retryCount = msg.properties.headers['x-retry-count'] || 0;
          const jobId = msg.properties.headers['jobId'];

          logger.debug('Job received from RabbitMQ', {
            jobId,
            retryCount
          });

          try {
            // Call the provided message handler
            await messageHandler(jobData, {
              retryCount,
              jobId,
              msg
            });

            // ACK: Successfully processed
            this.channel.ack(msg);
            
            logger.debug('Job acknowledged', { jobId });

          } catch (error) {
            logger.error('Job processing failed', error, { 
              jobId, 
              retryCount 
            });

            await this.handleFailedJob(msg, jobData, retryCount, error);
          }
        },
        {
          noAck: false // Require manual acknowledgement
        }
      );

      logger.info('RabbitMQ consumer started', {
        consumerTag: consumerTag.consumerTag
      });

      return consumerTag.consumerTag;

    } catch (error) {
      logger.error('Failed to start RabbitMQ consumer', error);
      throw error;
    }
  }

  /**
   * Handle failed job with retry logic
   * @param {Object} msg - RabbitMQ message
   * @param {Object} jobData - Job data
   * @param {number} retryCount - Current retry count
   * @param {Error} error - Error that caused failure
   */
  async handleFailedJob(msg, jobData, retryCount, error) {
    const maxRetries = 3;
    const jobId = msg.properties.headers['jobId'];

    try {
      if (retryCount < maxRetries) {
        // RETRY: Nack and republish with delay
        this.channel.nack(msg, false, false); // Don't requeue immediately

        // Republish with incremented retry count and exponential backoff
        const retryDelay = 5000 * Math.pow(2, retryCount); // 5s, 10s, 20s
        
        logger.info('Job will be retried', {
          jobId,
          retryCount: retryCount + 1,
          maxRetries,
          retryDelay: `${retryDelay}ms`
        });

        setTimeout(async () => {
          await this.publishJob(jobData, {
            retryCount: retryCount + 1
          });
        }, retryDelay);

      } else {
        // DLQ: Max retries exceeded, send to Dead Letter Queue
        logger.warn('Job failed after max retries, moving to DLQ', {
          jobId,
          retryCount,
          maxRetries,
          error: error.message
        });

        // Nack without requeue → automatically goes to DLQ
        this.channel.nack(msg, false, false);
      }

    } catch (error) {
      logger.error('Error handling failed job', error, { jobId });
      // Nack and requeue as fallback
      this.channel.nack(msg, false, true);
    }
  }

  /**
   * Get jobs from DLQ (for monitoring/retry)
   * @param {number} limit - Maximum number of messages to retrieve
   * @returns {Promise<Array>} Array of DLQ messages
   */
  async getDLQJobs(limit = 10) {
    try {
      const dlqJobs = [];
      
      for (let i = 0; i < limit; i++) {
        const msg = await this.channel.get(this.DLQ_QUEUE, { noAck: false });
        
        if (!msg) break; // No more messages
        
        const jobData = JSON.parse(msg.content.toString());
        dlqJobs.push({
          jobData,
          retryCount: msg.properties.headers['x-retry-count'],
          timestamp: msg.properties.headers['timestamp']
        });

        // Ack the message (remove from DLQ)
        this.channel.ack(msg);
      }

      return dlqJobs;

    } catch (error) {
      logger.error('Error retrieving DLQ jobs', error);
      throw error;
    }
  }

  /**
   * Get queue stats
   * @returns {Promise<Object>} Queue statistics
   */
  async getQueueStats() {
    try {
      if (!this.isConnected || !this.channel) {
        throw new Error('RabbitMQ not connected');
      }

      const mainQueue = await this.channel.checkQueue(this.QUEUE_NAME);
      const dlqQueue = await this.channel.checkQueue(this.DLQ_QUEUE);

      return {
        mainQueue: {
          messageCount: mainQueue.messageCount,
          consumerCount: mainQueue.consumerCount
        },
        dlq: {
          messageCount: dlqQueue.messageCount,
          consumerCount: dlqQueue.consumerCount
        }
      };
    } catch (error) {
      logger.error('Error getting queue stats', error);
      throw error;
    }
  }

  /**
   * Close RabbitMQ connection
   */
  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
      logger.info('RabbitMQ connection closed');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection', error);
    }
  }
}

// Export singleton instance
module.exports = new RabbitMQConnection();

