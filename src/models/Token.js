// © NextCartBD - Developed by Mahin Ltd (Tanvir)

import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  token: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['verifyEmail', 'resetPassword'],
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
    expires: '1h', // Token will automatically delete after 1 hour
  },
});

const Token = mongoose.model('Token', tokenSchema);
export default Token;