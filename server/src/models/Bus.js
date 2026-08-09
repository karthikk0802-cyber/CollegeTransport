const mongoose = require('mongoose');

const BusSchema = new mongoose.Schema(
  {
    busCode: {
      type: String,
      required: [true, 'Bus code is required (e.g. C2, C10)'],
      unique: true,
      trim: true,
    },
    plateNumber: {
      type: String,
      required: [true, 'Plate number is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'LIVE', 'STALE', 'OFFLINE'],
      default: 'NOT_STARTED',
    },
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedRoute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      default: null,
    },
    currentTrip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Bus', BusSchema);
