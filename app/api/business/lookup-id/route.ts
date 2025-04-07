import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';

/**
 * API endpoint to look up a business's MongoDB ObjectId by its unique_id or email
 * GET /api/business/lookup-id?uniqueId=proplusbillerica
 * GET /api/business/lookup-id?email=business@example.com
 */
export async function GET(request: Request) {
  try {
    // Get params from the URL
    const url = new URL(request.url);
    const uniqueId = url.searchParams.get('uniqueId');
    const email = url.searchParams.get('email');
    
    if (!uniqueId && !email) {
      console.warn('Missing identifier parameter in request');
      return NextResponse.json(
        { error: 'Missing unique ID or email parameter' },
        { status: 400 }
      );
    }
    
    // Connect to database
    await dbConnect();
    console.log('Connected to database for business lookup');
    
    // Use the mongoose connection directly
    const db = mongoose.connection.db;
    
    // Check database connection
    if (!db) {
      console.error('Database connection failed for business lookup');
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }
    
    // Find the business by the provided identifier
    let business;
    try {
      if (email) {
        console.log('Looking up business by email:', email);
        business = await db.collection('businesses').findOne(
          { email: email.toLowerCase() },
          { projection: { _id: 1, business_name: 1, unique_id: 1, stripe_customer_id: 1, stripe_subscription_id: 1, email: 1, subscription: 1, status: 1, current_period_end: 1, canceled_at: 1, is_active: 1 } }
        );
      } else if (uniqueId) {
        console.log('Looking up MongoDB ObjectId for unique_id:', uniqueId);
        // First try exact match on unique_id (case-sensitive)
        business = await db.collection('businesses').findOne(
          { unique_id: uniqueId }, 
          { projection: { _id: 1, business_name: 1, unique_id: 1, stripe_customer_id: 1, stripe_subscription_id: 1, email: 1, subscription: 1, status: 1, current_period_end: 1, canceled_at: 1, is_active: 1 } }
        );
        
        // If not found, try case-insensitive search
        if (!business) {
          console.log(`No exact match for unique_id: ${uniqueId}, trying case-insensitive search`);
          business = await db.collection('businesses').findOne(
            { unique_id: { $regex: new RegExp(`^${uniqueId}$`, 'i') } }, 
            { projection: { _id: 1, business_name: 1, unique_id: 1, stripe_customer_id: 1, stripe_subscription_id: 1, email: 1, subscription: 1, status: 1, current_period_end: 1, canceled_at: 1, is_active: 1 } }
          );
        }
        
        // If still not found, try other fields like business_name or slug
        if (!business) {
          console.log(`No case-insensitive match for unique_id: ${uniqueId}, trying business_name`);
          business = await db.collection('businesses').findOne(
            { business_name: { $regex: new RegExp(uniqueId, 'i') } }, 
            { projection: { _id: 1, business_name: 1, unique_id: 1, stripe_customer_id: 1, stripe_subscription_id: 1, email: 1, subscription: 1, status: 1, current_period_end: 1, canceled_at: 1, is_active: 1 } }
          );
        }
      }
    } catch (err) {
      console.error('Database query error during business lookup:', err);
      return NextResponse.json(
        { error: 'Database query failed', details: err instanceof Error ? err.message : 'Unknown error' },
        { status: 500 }
      );
    }
    
    if (!business) {
      const searchParam = email ? `email: ${email}` : `unique_id: ${uniqueId}`;
      console.log(`No business found with ${searchParam}`);
      
      // Try alternative lookup methods only for uniqueId
      if (uniqueId && !email) {
        try {
          // Check if the unique_id might actually be a MongoDB ObjectId
          if (/^[0-9a-fA-F]{24}$/.test(uniqueId)) {
            console.log('Input looks like a MongoDB ObjectId, trying direct _id lookup');
            business = await db.collection('businesses').findOne(
              { _id: new mongoose.Types.ObjectId(uniqueId) },
              { 
                projection: { 
                  _id: 1, 
                  business_name: 1, 
                  unique_id: 1, 
                  email: 1,
                  stripe_customer_id: 1, 
                  stripe_subscription_id: 1,
                  subscription: 1,
                  status: 1,
                  current_period_end: 1,
                  canceled_at: 1,
                  is_active: 1
                } 
              }
            );
            
            if (business) {
              console.log(`Found business by _id: ${business._id} (${business.business_name || 'Unnamed'})`);
              console.log('ALL BUSINESS FIELDS:', Object.keys(business));
              console.log('STRIPE-RELATED FIELDS:', Object.keys(business).filter(k => k.includes('stripe') || k.includes('Stripe')));
              return NextResponse.json(business);
            }
          }
        } catch (err) {
          console.error('Error during alternative lookup:', err);
        }
      }
      
      return NextResponse.json(
        { error: 'Business not found', searchedFor: email || uniqueId },
        { status: 404 }
      );
    }
    
    console.log(`Found business: ${business._id} (${business.business_name || 'Unnamed'})`);
    
    return NextResponse.json(business);
    
  } catch (error: any) {
    console.error('Error looking up business:', error.message, error.stack);
    
    return NextResponse.json(
      { error: 'Failed to look up business', details: error.message },
      { status: 500 }
    );
  }
} 