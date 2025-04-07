import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerEmail: {
    type: String,
    required: true,
    trim: true
  },
  customerPhone: {
    type: String,
    required: true,
    trim: true
  },
  serviceName: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: String, // Store as YYYY-MM-DD format
    required: true
  },
  time: {
    type: String, // Store as HH:mm format (24-hour)
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'canceled', 'completed'],
    default: 'pending'
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
bookingSchema.index({ businessId: 1, date: 1, time: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ created_at: -1 });

export const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema); 