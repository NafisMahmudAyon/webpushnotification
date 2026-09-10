const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    endpoint: {
      type: String,
      required: [true, 'Push endpoint is required'],
      unique: true,
      trim: true
    },
    expirationTime: {
      type: Number,
      default: null
    },
    keys: {
      p256dh: {
        type: String,
        required: [true, 'p256dh key is required'],
        trim: true
      },
      auth: {
        type: String,
        required: [true, 'auth key is required'],
        trim: true
      }
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Prevent re-compilation of model in serverless hot reloads
module.exports = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
