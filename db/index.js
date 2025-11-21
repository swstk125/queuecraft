const mongoose = require("mongoose");
const connectionString = process.env.MONGODB_URI || "mongodb://localhost/queuecraft";

module.exports.initializeDB = async () => {
    try {
        await mongoose.connect(connectionString);
        console.log('connected to mongodb : ', connectionString);
    } catch (error) {
        console.log('erorr while connecting to mongodb', error);
    }
}