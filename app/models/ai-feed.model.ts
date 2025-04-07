import mongoose, { Schema } from 'mongoose';

// Define interfaces for the model types
export interface DayHours {
  open: string;
  close: string;
  isOpen: boolean;
}

export interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface Service {
  name: string;
  description?: string;
  price?: number;
  duration?: number;
}

export interface Promotion {
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isFirstTimeOnly: boolean;
  validUntil: string;
  isActive: boolean;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface PaymentMethod {
  type: 'cash' | 'card' | 'online';
  enabled: boolean;
  details: string;
}

export interface CustomResponse {
  trigger: string;
  response: string;
  isActive: boolean;
}

export interface IAIFeed extends mongoose.Document {
  businessId: mongoose.Types.ObjectId;
  services: Service[];
  promotions: Promotion[];
  faqs: FAQ[];
  paymentMethods: PaymentMethod[];
  customResponses: CustomResponse[];
  businessHours: BusinessHours;
  lastUpdated: Date;
}

// Define the AIFeed schema
const aiFeedSchema: Schema = new Schema({
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    unique: true
  },
  services: [{
    name: { type: String, required: true },
    description: { type: String, required: false },
    price: { type: Number, required: false, min: 0 },
    duration: { type: Number, required: false, min: 0 }
  }],
  promotions: [{
    name: { type: String, required: true },
    description: { type: String, required: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    isFirstTimeOnly: { type: Boolean, default: false },
    validUntil: { type: String, required: true },
    isActive: { type: Boolean, default: true }
  }],
  faqs: [{
    question: { type: String, required: true },
    answer: { type: String, required: true }
  }],
  paymentMethods: [{
    type: { type: String, enum: ['cash', 'card', 'online'], required: true },
    enabled: { type: Boolean, default: true },
    details: { type: String, default: '' }
  }],
  customResponses: [{
    trigger: { type: String, required: true },
    response: { type: String, required: true },
    isActive: { type: Boolean, default: true }
  }],
  businessHours: {
    type: {
      monday: {
        open: { type: String, required: true },
        close: { type: String, required: true },
        isOpen: { type: Boolean, required: true }
      },
      tuesday: {
        open: { type: String, required: true },
        close: { type: String, required: true },
        isOpen: { type: Boolean, required: true }
      },
      wednesday: {
        open: { type: String, required: true },
        close: { type: String, required: true },
        isOpen: { type: Boolean, required: true }
      },
      thursday: {
        open: { type: String, required: true },
        close: { type: String, required: true },
        isOpen: { type: Boolean, required: true }
      },
      friday: {
        open: { type: String, required: true },
        close: { type: String, required: true },
        isOpen: { type: Boolean, required: true }
      },
      saturday: {
        open: { type: String, required: true },
        close: { type: String, required: true },
        isOpen: { type: Boolean, required: true }
      },
      sunday: {
        open: { type: String, required: true },
        close: { type: String, required: true },
        isOpen: { type: Boolean, required: true }
      }
    },
    required: true,
    _id: false
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  strict: true
});

// Add pre-save middleware to update lastUpdated timestamp
aiFeedSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Add pre-save middleware to ensure arrays are initialized
aiFeedSchema.pre('save', function(next) {
  if (!this.services) this.services = [];
  if (!this.promotions) this.promotions = [];
  if (!this.faqs) this.faqs = [];
  if (!this.paymentMethods) this.paymentMethods = [];
  if (!this.customResponses) this.customResponses = [];
  next();
});

// Add validation for time format
aiFeedSchema.path('businessHours').validate(function(value: BusinessHours) {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  return days.every(day => {
    const dayHours = value[day as keyof BusinessHours];
    return timeRegex.test(dayHours.open) && timeRegex.test(dayHours.close);
  });
}, 'Invalid time format. Use HH:mm format (00:00-23:59)');

// Export the model
export const AIFeed = mongoose.models.AIFeed || mongoose.model<IAIFeed>('AIFeed', aiFeedSchema); 