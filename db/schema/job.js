const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  ownerId: {
    type: String,
    required: true,
    index: true  // Index for faster queries by owner
  },
  status: {
    type: String,
    enum: ["pending", "running", "completed", "dlq"],
    default: "pending",
    index: true  // Index for faster queries by status
  },
  con: {
    type: Date, 
    default: Date.now
  },
  mon: {
    type: Date, 
    default: Date.now
  },
});

// Compound index for optimal rate limiting query performance
// This index is specifically optimized for counting active jobs by owner
jobSchema.index({ ownerId: 1, status: 1 });

// Index for cleanup and monitoring queries
jobSchema.index({ status: 1, con: 1 });

module.exports = mongoose.model("job", jobSchema);