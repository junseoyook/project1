const mongoose = require('mongoose');

const entryLogSchema = new mongoose.Schema({
  reservationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    required: true
  },
  licensePlate: {
    type: String,
    required: true
  },
  entryTime: {
    type: Date,
    required: true
  },
  exitTime: {
    type: Date
  },
  type: {
    type: String,
    enum: ['entry', 'exit'],
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    required: true
  },
  reason: {
    type: String
  }
});

module.exports = mongoose.model('EntryLog', entryLogSchema); 