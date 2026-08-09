const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema(
  {
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'AUTO_EXPIRED', 'FORCE_STOPPED'],
      default: 'ACTIVE',
    },
    startTime: {
      type: Date,
      default: Date.now,
      required: true,
    },
    endTime: {
      type: Date,
    },
    maxDurationHours: {
      type: Number,
      default: 4,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Trip', TripSchema);
