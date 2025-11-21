const mongoose = require("mongoose");

const user = {
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
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

module.exports = mongoose.model("user", new mongoose.Schema(user));