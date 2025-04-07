import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';

const DEFAULT_PAYMENT_METHODS = [
  { type: 'cash', enabled: true, details: 'Cash payments accepted' },
  { type: 'card', enabled: true, details: 'All major credit/debit cards accepted' },
  { type: 'online', enabled: true, details: 'Secure online payments available' }
];

// Define interfaces for the model types
interface IAIFeedDocument extends mongoose.Document {
  businessId: mongoose.Types.ObjectId;
  services: Service[];
  promotions: Promotion[];
  faqs: FAQ[];
  paymentMethods: PaymentMethod[];
  customResponses: CustomResponse[];
  lastUpdated: Date;
  businessHours: BusinessHours;
}

// Define interfaces for the data types
interface Service {
  name: string;
  description: string;
  price: number;
  duration: number;
}

interface Promotion {
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isFirstTimeOnly: boolean;
  validUntil: string;
  isActive: boolean;
}

interface FAQ {
  question: string;
  answer: string;
}

interface PaymentMethod {
  type: 'cash' | 'card' | 'online';
  enabled: boolean;
  details: string;
}

interface CustomResponse {
  trigger: string;
  response: string;
  isActive: boolean;
}

interface BusinessHours {
  monday: { open: string; close: string; isOpen: boolean };
  tuesday: { open: string; close: string; isOpen: boolean };
  wednesday: { open: string; close: string; isOpen: boolean };
  thursday: { open: string; close: string; isOpen: boolean };
  friday: { open: string; close: string; isOpen: boolean };
  saturday: { open: string; close: string; isOpen: boolean };
  sunday: { open: string; close: string; isOpen: boolean };
}

// Define the AIFeed schema directly here to avoid import issues
const aiFeedSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    unique: true
  },
  services: [{
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    duration: { type: Number, required: true, min: 5 }
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
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  businessHours: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      monday: { open: "09:00", close: "17:00", isOpen: true },
      tuesday: { open: "09:00", close: "17:00", isOpen: true },
      wednesday: { open: "09:00", close: "17:00", isOpen: true },
      thursday: { open: "09:00", close: "17:00", isOpen: true },
      friday: { open: "09:00", close: "17:00", isOpen: true },
      saturday: { open: "10:00", close: "15:00", isOpen: true },
      sunday: { open: "00:00", close: "00:00", isOpen: false }
    }
  }
}, {
  timestamps: true,
  strict: true
});

// Get or create the model
let AIFeed: mongoose.Model<IAIFeedDocument>;
let isSchemaInitialized = false;

async function initializeSchema() {
  if (isSchemaInitialized) {
    return;
  }

  try {
    // Try to get the existing model
    AIFeed = mongoose.model<IAIFeedDocument>('AIFeed');
  } catch {
    // If it doesn't exist, create it
    AIFeed = mongoose.model<IAIFeedDocument>('AIFeed', aiFeedSchema);
  }

  isSchemaInitialized = true;
}

// GET endpoint to fetch Feed AI data publicly
export async function GET(req: NextRequest) {
  try {
    // Get businessId from query parameter
    const url = new URL(req.url);
    const businessId = url.searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    console.log('Public Feed AI request for business:', businessId);
    
    await dbConnect();
    await initializeSchema();

    // Validate that businessId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return NextResponse.json({ error: 'Invalid business ID format' }, { status: 400 });
    }

    // Fetch AI Feed data
    const feedData = await AIFeed.findOne({ 
      businessId: new mongoose.Types.ObjectId(businessId) 
    }).lean();

    // Default business hours
    const defaultBusinessHours = {
      monday: { open: "09:00", close: "17:00", isOpen: true },
      tuesday: { open: "09:00", close: "17:00", isOpen: true },
      wednesday: { open: "09:00", close: "17:00", isOpen: true },
      thursday: { open: "09:00", close: "17:00", isOpen: true },
      friday: { open: "09:00", close: "17:00", isOpen: true },
      saturday: { open: "10:00", close: "15:00", isOpen: true },
      sunday: { open: "00:00", close: "00:00", isOpen: false }
    };

    if (!feedData) {
      console.log('No feed data found for business:', businessId);
      return NextResponse.json({
        services: [],
        promotions: [],
        faqs: [],
        paymentMethods: DEFAULT_PAYMENT_METHODS,
        customResponses: [],
        businessHours: defaultBusinessHours
      });
    }

    // Ensure all fields are properly initialized
    const responseData = {
      services: feedData.services || [],
      promotions: feedData.promotions || [],
      faqs: feedData.faqs || [],
      paymentMethods: feedData.paymentMethods || DEFAULT_PAYMENT_METHODS,
      customResponses: feedData.customResponses || [],
      businessHours: feedData.businessHours || defaultBusinessHours
    };

    console.log('Retrieved public AI feed data for business:', businessId, {
      counts: {
        services: responseData.services.length,
        promotions: responseData.promotions.length,
        faqs: responseData.faqs.length,
        customResponses: responseData.customResponses.length,
      },
      hasBusinessHours: !!feedData.businessHours
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in public Feed AI endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 