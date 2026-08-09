const mongoose = require('mongoose');

const StopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Stop name is required'],
      trim: true,
      unique: true,
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Stop', StopSchema);
