const mongoose = require("mongoose");

const job = {
  name: {
    type: String,
  },
  ownerId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "running", "completed", "dlq"],
    default: "pending"
  },
  con: {
    type: Date, 
    default: Date.now
  },
  mon: {
    type: Date, 
    default: Date.now
  },
}

module.exports = mongoose.model("job", new mongoose.Schema(job));