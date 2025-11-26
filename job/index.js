const rabbitmq = require('./rabbitmqConnection');
const JobHandler = require('./jobHandler');
const logger = require('../util/logger');
const config = require('../config');

/**
 * Initialize the RabbitMQ-based job processor
 * This replaces the old database polling approach with proper message queue consumption
 */
const initializeJobProcessor = async () => {
  try {
    logger.info('Initializing RabbitMQ job processor', {
      concurrency: config.get('job.concurrency'),
      service: 'jobProcessor'
    });

    // Connect to RabbitMQ and setup queues
    await rabbitmq.connect();

    let globalJobCounter = 0; // Track job counter for demo purposes

    // Start consuming jobs from RabbitMQ queue
    await rabbitmq.consumeJobs(async (jobData, metadata) => {
      const { jobId, retryCount, msg } = metadata;

      globalJobCounter++;

      logger.info('Processing job from RabbitMQ', {
        jobId,
        retryCount,
        jobCounter: globalJobCounter,
        jobName: jobData.name
      });

      try {
        // Process the job using the existing handler
        // The handler will update DB status and emit WebSocket events
        await JobHandler.processJob(jobData, globalJobCounter);

        logger.info('Job processed successfully', {
          jobId,
          jobCounter: globalJobCounter
        });

      } catch (error) {
        logger.error('Job processing failed in consumer', error, {
          jobId,
          retryCount,
          jobCounter: globalJobCounter
        });

        // Re-throw to let RabbitMQ connection handle retry/DLQ logic
        throw error;
      }
    });

    logger.info('RabbitMQ job processor started successfully');

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, closing RabbitMQ connection');
      await rabbitmq.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, closing RabbitMQ connection');
      await rabbitmq.close();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to initialize RabbitMQ job processor', error);
    // Wait before retrying to prevent rapid restart loops
    setTimeout(() => {
      logger.info('Retrying RabbitMQ connection...');
      initializeJobProcessor();
    }, 5000);
  }
};

module.exports = initializeJobProcessor;
