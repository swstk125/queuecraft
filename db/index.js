const mongoose = require("mongoose");
const redis = require("redis");

const connectionString = process.env.MONGODB_URI || "mongodb://localhost/queuecraft";
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

let redisClient = null;

module.exports.initializeDB = async () => {
    try {
        await mongoose.connect(connectionString);
        console.log('connected to mongodb : ', connectionString);
    } catch (error) {
        console.log('erorr while connecting to mongodb', error);
    }
}

module.exports.initializeRedis = async () => {
    try {
        redisClient = redis.createClient({
            url: redisUrl
        });

        redisClient.on('error', (err) => {
            console.log('Redis Client Error', err);
        });

        redisClient.on('connect', () => {
            console.log('connected to redis : ', redisUrl);
        });

        await redisClient.connect();
    } catch (error) {
        console.log('error while connecting to redis', error);
    }
}

module.exports.getRedisClient = () => {
    return redisClient;
}