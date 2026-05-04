const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema(
  {
    menuName: {
      type: String,
      default: ''
    },
    createdBy: {
      type: String,
      default: ''
    },
    imageURL: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      default: 'pending'
    },
    submittedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    strict: false,
    collection: 'request'
  }
);

module.exports = mongoose.model('Request', requestSchema);
