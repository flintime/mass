import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import Business from '@/backend/src/models/business.model';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = verify(token, JWT_SECRET) as { businessId: string };

    const business = await Business.findById(decoded.businessId).select('-password');
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Determine FAQs based on available data
    let faqs = business.faqs || [];
    
    // If there are no FAQs but there is a legacy FAQ, convert it
    if ((!faqs || faqs.length === 0) && business.faq_question && business.faq_answer) {
      faqs = [{ question: business.faq_question, answer: business.faq_answer }];
    }

    return NextResponse.json({
      id: business._id,
      business_name: business.business_name,
      email: business.email,
      created_at: business.created_at,
      description: business.description,
      phone: business.phone,
      Business_Category: business.Business_Category,
      Business_Subcategories: business.Business_Subcategories,
      address: business.address,
      city: business.city,
      state: business.state,
      zip_code: business.zip_code,
      Website: business.Website,
      business_features: business.business_features,
      services: business.services || [],
      faq_question: business.faq_question,
      faq_answer: business.faq_answer,
      faqs: faqs,
      images: business.images,
      latitude: business.latitude,
      longitude: business.longitude,
      location: business.location,
      years_in_business: business.years_in_business
    });
  } catch (error: any) {
    console.error('Get business error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 