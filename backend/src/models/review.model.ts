import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  businessId: mongoose.Types.ObjectId;
  userId: string;
  rating: number;
  serviceQualityRating: number;
  valueForMoneyRating: number;
  comment: string;
  customerName: string;
  customerEmail: string;
  appointmentId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  reply?: string;
  replyDate?: Date;
  images?: string[]; // Array of image URLs from Digital Ocean Spaces
}

const reviewSchema = new Schema<IReview>({
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  serviceQualityRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 3
  },
  valueForMoneyRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 3
  },
  comment: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  appointmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  images: {
    type: [String],
    default: []
  },
  reply: {
    type: String,
    trim: true
  },
  replyDate: {
    type: Date
  }
}, {
  timestamps: true
});

export default mongoose.model<IReview>('Review', reviewSchema); 