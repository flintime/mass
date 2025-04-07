import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import { Business } from '@/models/Business';
import mongoose from 'mongoose';

// Business registration validation schema
const businessSchema = z.object({
  business_name: z.string().min(1, "Business name is required"),
  unique_id: z.string().min(1, "Username is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(10, "Valid phone number is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip_code: z.string().min(5, "Zip code is required"),
  Website: z.string().optional(),
  description: z.string().optional(),
  Business_Category: z.string().min(1, "Business category is required"),
  Business_Subcategories: z.array(z.string()).optional(),
  latitude: z.number(),
  longitude: z.number(),
  agreeToTerms: z.boolean().optional(),
  acknowledgeAI: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    await dbConnect();
    
    // Parse request body
    const body = await req.json();
    console.log("Received business registration body:", JSON.stringify({
      ...body,
      password: body.password ? "[REDACTED]" : undefined
    }));
    
    // Extra validation to ensure unique_id is never null or empty
    if (!body.unique_id || body.unique_id.trim() === '') {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 10);
      const businessNameSlug = body.business_name
        ? body.business_name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)
        : 'business';
      body.unique_id = `${businessNameSlug}-${timestamp}-${randomString}`;
      console.log(`Generated fallback unique_id: ${body.unique_id}`);
    }

    // Validate input data
    const validationResult = businessSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.format();
      console.error("Validation failed:", errors);
      return NextResponse.json({ 
        error: "Validation failed", 
        details: errors 
      }, { status: 400 });
    }
    
    const businessData = validationResult.data;
    
    // Check if business with email already exists
    const existingEmailBusiness = await Business.findOne({ email: businessData.email });
    if (existingEmailBusiness) {
      console.warn(`Business with email ${businessData.email} already exists`);
      return NextResponse.json({ 
        error: "Business with this email already exists" 
      }, { status: 409 });
    }
    
    // Check if business with unique_id already exists
    const existingIdBusiness = await Business.findOne({ unique_id: businessData.unique_id });
    if (existingIdBusiness) {
      console.warn(`Business with unique_id ${businessData.unique_id} already exists`);
      // Generate a new unique_id since this one is taken
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 10);
      const businessNameSlug = businessData.business_name
        .toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
      businessData.unique_id = `${businessNameSlug}-${timestamp}-${randomString}`;
      console.log(`Generated new unique_id: ${businessData.unique_id}`);
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(businessData.password, 10);
    
    // Clean phone number - remove non-numeric characters
    const cleanPhone = businessData.phone.replace(/\D/g, '');
    
    // Track consent
    const now = new Date();
    const consentRecords = {
      termsAndConditions: {
        accepted: !!businessData.agreeToTerms,
        timestamp: now
      },
      aiAcknowledgment: {
        accepted: !!businessData.acknowledgeAI,
        timestamp: now
      }
    };
    
    // Prepare business data with additional fields
    const businessToCreate = {
      ...businessData,
      password: hashedPassword,
      phone: cleanPhone,
      location: {
        type: 'Point',
        coordinates: [businessData.longitude, businessData.latitude]
      },
      consentRecords,
      // Set all subscription fields
      is_active: false, // Set to false until payment is completed
      subscription: {
        status: 'canceled',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        current_period_end: null,
        canceled_at: null
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      _id: new mongoose.Types.ObjectId()
    };
    
    console.log("Creating business with unique_id:", businessToCreate.unique_id);
    
    try {
      // Create new business
      const newBusiness = new Business(businessToCreate);
      await newBusiness.save();
      
      console.log(`Business registered successfully with ID: ${newBusiness._id} and unique_id: ${newBusiness.unique_id}`);
      
      return NextResponse.json({ 
        success: true,
        message: "Business registered successfully",
        businessId: newBusiness._id,
        businessEmail: newBusiness.email
      });
    } catch (dbError: any) {
      console.error("Database error:", dbError);
      if (dbError.code === 11000) {
        const keyPattern = dbError.keyPattern ? Object.keys(dbError.keyPattern).join(', ') : 'unknown';
        return NextResponse.json({
          error: `Duplicate value for ${keyPattern}`,
          details: dbError.keyValue
        }, { status: 409 });
      }
      throw dbError;
    }
    
  } catch (error: any) {
    console.error("Error in business registration:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to register business" 
    }, { status: 500 });
  }
} 