import mongoose, { Schema, Document } from 'mongoose';

export interface IAIFeed extends Document {
  businessId: mongoose.Types.ObjectId;
  services: string[];
  businessHours: string;
  specialties: string[];
  description: string;
  keywords: string[];
  responseTemplates: string[];
  customTraining: string;
  lastUpdated: Date;
  autoSync: boolean;
}

const aiFeedSchema = new Schema<IAIFeed>({
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    unique: true
  },
  services: [{
    type: String,
    trim: true
  }],
  businessHours: {
    type: String,
    trim: true
  },
  specialties: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    trim: true
  },
  keywords: [{
    type: String,
    trim: true
  }],
  responseTemplates: [{
    type: String,
    trim: true
  }],
  customTraining: {
    type: String,
    trim: true,
    default: ''
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  autoSync: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Add index for faster queries
aiFeedSchema.index({ businessId: 1 });

export default mongoose.model<IAIFeed>('AIFeed', aiFeedSchema); 