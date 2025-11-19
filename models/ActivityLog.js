const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  taskTitle: {
    type: String,
    required: [ true, 'Task title is required']
  },
  fromMember: {
    name: String
  },
  toMember: {
  name: {
    type: String,
    required: [true, 'To member name is required']
  }
   },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);