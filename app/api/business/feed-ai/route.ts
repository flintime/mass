import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import { updateBusinessVectorStore, indexBusinessData } from '@/app/lib/vector-store';
import { indexBusinessDataToVectorStore } from '@/app/lib/rag-local';
import { AIFeed, IAIFeed, Service, Promotion, FAQ, PaymentMethod, CustomResponse, BusinessHours } from '@/app/models/ai-feed.model';
import { validateToken } from '@/lib/csrf';
import { headers } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { type: 'cash', enabled: true, details: 'Cash payments accepted' },
  { type: 'card', enabled: true, details: 'All major credit/debit cards accepted' },
  { type: 'online', enabled: true, details: 'Secure online payments available' }
];

// Verify business auth directly in the route to avoid import issues
async function verifyBusinessAuth(req: NextRequest): Promise<string | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verify(token, JWT_SECRET) as { businessId: string };

    if (!decoded.businessId) {
      return null;
    }

    return decoded.businessId;
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

// GET endpoint to fetch Feed AI data
export async function GET(req: NextRequest) {
  try {
    const businessId = await verifyBusinessAuth(req);
    if (!businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Fetch AI Feed data
    const feedData = await AIFeed.findOne({ 
      businessId: new mongoose.Types.ObjectId(businessId) 
    }, { _id: 0 }).lean() as IAIFeed | null;

    // Default business hours if none exist
    const defaultBusinessHours: BusinessHours = {
      monday: { open: "09:00", close: "17:00", isOpen: true },
      tuesday: { open: "09:00", close: "17:00", isOpen: true },
      wednesday: { open: "09:00", close: "17:00", isOpen: true },
      thursday: { open: "09:00", close: "17:00", isOpen: true },
      friday: { open: "09:00", close: "17:00", isOpen: true },
      saturday: { open: "10:00", close: "15:00", isOpen: true },
      sunday: { open: "00:00", close: "00:00", isOpen: false }
    };

    // Ensure all fields are properly initialized
    const responseData = {
      services: feedData?.services || [],
      promotions: feedData?.promotions || [],
      faqs: feedData?.faqs || [],
      paymentMethods: feedData?.paymentMethods || DEFAULT_PAYMENT_METHODS,
      customResponses: feedData?.customResponses || [],
      businessHours: feedData?.businessHours ? {
        monday: { open: feedData.businessHours.monday.open, close: feedData.businessHours.monday.close, isOpen: feedData.businessHours.monday.isOpen },
        tuesday: { open: feedData.businessHours.tuesday.open, close: feedData.businessHours.tuesday.close, isOpen: feedData.businessHours.tuesday.isOpen },
        wednesday: { open: feedData.businessHours.wednesday.open, close: feedData.businessHours.wednesday.close, isOpen: feedData.businessHours.wednesday.isOpen },
        thursday: { open: feedData.businessHours.thursday.open, close: feedData.businessHours.thursday.close, isOpen: feedData.businessHours.thursday.isOpen },
        friday: { open: feedData.businessHours.friday.open, close: feedData.businessHours.friday.close, isOpen: feedData.businessHours.friday.isOpen },
        saturday: { open: feedData.businessHours.saturday.open, close: feedData.businessHours.saturday.close, isOpen: feedData.businessHours.saturday.isOpen },
        sunday: { open: feedData.businessHours.sunday.open, close: feedData.businessHours.sunday.close, isOpen: feedData.businessHours.sunday.isOpen }
      } : defaultBusinessHours
    };

    console.log('Retrieved AI feed data:', {
      businessId,
      hasData: !!feedData,
      fields: Object.keys(responseData),
      hasBusinessHours: !!feedData?.businessHours
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching Feed AI data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Feed AI data' },
      { status: 500 }
    );
  }
}

// POST endpoint to update Feed AI data
export async function POST(req: NextRequest) {
  try {
    // 1. CSRF Validation
    const headersList = headers();
    const csrfToken = headersList.get('x-csrf-token');
    if (!csrfToken) {
      console.error('Missing CSRF token');
      return NextResponse.json(
        { error: 'Your session appears to be invalid. Please refresh the page and try again.' },
        { status: 403 }
      );
    }

    // Get cookies from the request and validate CSRF token
    const cookieHeader = headersList.get('cookie');
    if (!validateToken(csrfToken, cookieHeader || '')) {
      console.error('Invalid CSRF token');
      return NextResponse.json(
        { error: 'Your session has expired or is invalid. Please refresh the page and try again.' },
        { status: 403 }
      );
    }

    // 2. Authentication
    const businessId = await verifyBusinessAuth(req);
    if (!businessId) {
      console.error('Authentication failed - no business ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    console.log('Database connected');

    // Parse and validate request data
    const data = await req.json();
    
    // Prepare update data with validation
    const updateData = {
      services: Array.isArray(data.services) ? data.services
        .filter((service: Partial<Service>) => service.name?.trim())
        .map((service: Partial<Service>) => ({
          name: String(service.name).trim(),
          description: service.description ? String(service.description).trim() : undefined,
          price: service.price !== undefined ? Number(service.price) : undefined,
          duration: service.duration !== undefined ? Number(service.duration) : undefined
        })) : [],
        
      promotions: Array.isArray(data.promotions) ? data.promotions
        .filter((promo: Partial<Promotion>) => promo.name?.trim() && promo.description?.trim())
        .map((promo: Partial<Promotion>) => ({
          name: String(promo.name).trim(),
          description: String(promo.description).trim(),
        discountType: ['percentage', 'fixed'].includes(promo.discountType as string) ? promo.discountType as 'percentage' | 'fixed' : 'fixed',
          discountValue: Math.max(0, Number(promo.discountValue) || 0),
        isFirstTimeOnly: Boolean(promo.isFirstTimeOnly),
        validUntil: String(promo.validUntil || new Date().toISOString().split('T')[0]),
        isActive: Boolean(promo.isActive)
        })) : [],
        
      faqs: Array.isArray(data.faqs) ? data.faqs
        .filter((faq: Partial<FAQ>) => faq.question?.trim() && faq.answer?.trim())
        .map((faq: Partial<FAQ>) => ({
          question: String(faq.question).trim(),
          answer: String(faq.answer).trim()
        })) : [],
        
      paymentMethods: Array.isArray(data.paymentMethods) ? data.paymentMethods
        .map((method: Partial<PaymentMethod>) => ({
          type: ['cash', 'card', 'online'].includes(method.type as string) ? method.type as 'cash' | 'card' | 'online' : 'cash',
            enabled: Boolean(method.enabled),
          details: String(method.details || '').trim()
        })) : DEFAULT_PAYMENT_METHODS,
        
      customResponses: Array.isArray(data.customResponses) ? data.customResponses
        .filter((response: Partial<CustomResponse>) => response.trigger?.trim() && response.response?.trim())
        .map((response: Partial<CustomResponse>) => ({
          trigger: String(response.trigger).trim(),
          response: String(response.response).trim(),
        isActive: Boolean(response.isActive)
        })) : [],
        
      businessHours: data.businessHours ? {
        monday: validateDayHours(data.businessHours.monday),
        tuesday: validateDayHours(data.businessHours.tuesday),
        wednesday: validateDayHours(data.businessHours.wednesday),
        thursday: validateDayHours(data.businessHours.thursday),
        friday: validateDayHours(data.businessHours.friday),
        saturday: validateDayHours(data.businessHours.saturday),
        sunday: validateDayHours(data.businessHours.sunday)
      } : undefined
    };

    // Function to validate day hours
    function validateDayHours(day: any) {
      if (!day) return { open: "09:00", close: "17:00", isOpen: false };
      
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      // Return only the required fields
      return {
        open: timeRegex.test(day.open) ? day.open : "09:00",
        close: timeRegex.test(day.close) ? day.close : "17:00",
        isOpen: Boolean(day.isOpen)
      };
    }

    console.log('Attempting to update with validated data:', {
      businessId,
      serviceCount: updateData.services.length,
      promotionCount: updateData.promotions.length,
      faqCount: updateData.faqs.length,
      customResponseCount: updateData.customResponses.length,
      hasBusinessHours: !!updateData.businessHours
    });

    // Use findOneAndUpdate with upsert for atomic operation
    const updatedDoc = await AIFeed.findOneAndUpdate(
      { businessId: new mongoose.Types.ObjectId(businessId) },
      {
      $set: {
        ...updateData,
          lastUpdated: new Date()
        }
      },
      { 
        new: true,
        upsert: true,
        runValidators: true,
        lean: true,
        projection: { _id: 0 }  // Exclude _id field from the response
      }
    ) as IAIFeed | null;

    if (!updatedDoc) {
      throw new Error('Failed to update AI Feed data');
    }

    // Verify the update
    const verificationDoc = await AIFeed.findOne({
      businessId: new mongoose.Types.ObjectId(businessId)
    }, { _id: 0 }).lean() as IAIFeed | null;

    if (!verificationDoc) {
      throw new Error('Failed to verify update');
    }

    // Clean the response data
    const cleanResponse = {
      ...verificationDoc,
      businessHours: verificationDoc.businessHours ? {
        monday: { open: verificationDoc.businessHours.monday.open, close: verificationDoc.businessHours.monday.close, isOpen: verificationDoc.businessHours.monday.isOpen },
        tuesday: { open: verificationDoc.businessHours.tuesday.open, close: verificationDoc.businessHours.tuesday.close, isOpen: verificationDoc.businessHours.tuesday.isOpen },
        wednesday: { open: verificationDoc.businessHours.wednesday.open, close: verificationDoc.businessHours.wednesday.close, isOpen: verificationDoc.businessHours.wednesday.isOpen },
        thursday: { open: verificationDoc.businessHours.thursday.open, close: verificationDoc.businessHours.thursday.close, isOpen: verificationDoc.businessHours.thursday.isOpen },
        friday: { open: verificationDoc.businessHours.friday.open, close: verificationDoc.businessHours.friday.close, isOpen: verificationDoc.businessHours.friday.isOpen },
        saturday: { open: verificationDoc.businessHours.saturday.open, close: verificationDoc.businessHours.saturday.close, isOpen: verificationDoc.businessHours.saturday.isOpen },
        sunday: { open: verificationDoc.businessHours.sunday.open, close: verificationDoc.businessHours.sunday.close, isOpen: verificationDoc.businessHours.sunday.isOpen }
      } : undefined
    };

    // Update vector stores
    try {
      console.log('Updating vector stores for business');
      await Promise.all([
        updateBusinessVectorStore(businessId),
        indexBusinessData(businessId),
      ]);
        console.log('Vector stores updated successfully');
      } catch (vectorStoreError) {
        console.error('Error updating vector stores:', vectorStoreError);
      // Don't fail the request - the data was saved successfully
    }

    return NextResponse.json(cleanResponse);
  } catch (error) {
    console.error('Error updating Feed AI data:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update Feed AI data',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 