/**
 * Job Event Bridge using Redis Pub/Sub
 * Bridges job events between job processor and WebSocket server
 */

const { getRedisClient } = require('../db');
const config = require('../config');

/**
 * Publish job event to Redis
 * Used by job processor to send events
 */
async function publishJobEvent(eventType, data) {
  try {
    const redis = getRedisClient();
    if (!redis) {
      console.error('❌ Redis client not available for publishing');
      return;
    }

    const message = JSON.stringify({
      type: eventType,
      data: data,
      timestamp: new Date().toISOString()
    });

    const channel = config.get('redis.jobEventsChannel');
    await redis.publish(channel, message);
    console.log(`📤 Published to Redis: ${eventType}`, data._id || data.job?._id);
  } catch (error) {
    console.error('Error publishing job event:', error);
  }
}

/**
 * Subscribe to job events from Redis
 * Used by WebSocket server to receive events
 */
async function subscribeToJobEvents(callback) {
  try {
    const redis = getRedisClient();
    if (!redis) {
      console.error('❌ Redis client not available for subscribing');
      return null;
    }

    // Create a duplicate client for pub/sub
    const subscriber = redis.duplicate();
    await subscriber.connect();

    const channel = config.get('redis.jobEventsChannel');
    await subscriber.subscribe(channel, (message) => {
      try {
        const event = JSON.parse(message);
        console.log(`📥 Received from Redis: ${event.type}`, event.data._id || event.data.job?._id);
        callback(event.type, event.data);
      } catch (error) {
        console.error('Error parsing job event:', error);
      }
    });

    console.log('✅ Subscribed to job events channel');
    return subscriber;
  } catch (error) {
    console.error('Error subscribing to job events:', error);
    return null;
  }
}

module.exports = {
  publishJobEvent,
  subscribeToJobEvents
};

