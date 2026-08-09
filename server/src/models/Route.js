const mongoose = require('mongoose');

const RouteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Route name is required'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    stops: [
      {
        stop: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Stop',
          required: true,
        },
        sequence: {
          type: Number,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Auto sort stops sequence when loading (or we can handle it at database query level)
module.exports = mongoose.model('Route', RouteSchema);
