import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import Business from '@/backend/src/models/business.model';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to get business from token
async function getBusinessFromToken(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = verify(token, JWT_SECRET) as { businessId: string };
    return await Business.findById(decoded.businessId);
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// GET endpoint to retrieve FAQs
export async function GET(request: Request) {
  try {
    const business = await getBusinessFromToken(request);
    if (!business) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // If we have the new faqs array, return it
    if (business.faqs && business.faqs.length > 0) {
      return NextResponse.json({ faqs: business.faqs });
    }
    
    // Otherwise, fall back to the legacy single FAQ
    if (business.faq_question && business.faq_answer) {
      return NextResponse.json({
        faqs: [{
          question: business.faq_question,
          answer: business.faq_answer
        }]
      });
    }
    
    // No FAQs available
    return NextResponse.json({ faqs: [] });
  } catch (error) {
    console.error('Error getting FAQs:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to get FAQs' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update FAQs
export async function PUT(request: Request) {
  try {
    const business = await getBusinessFromToken(request);
    if (!business) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { faqs } = await request.json();
    
    if (!Array.isArray(faqs)) {
      console.error('Invalid FAQs format received:', faqs);
      return NextResponse.json(
        { message: 'Invalid data format. Expected an array of FAQs.' },
        { status: 400 }
      );
    }

    console.log('Updating FAQs for business ID:', business._id);
    console.log('FAQs data to update:', JSON.stringify(faqs, null, 2));

    // Make sure all FAQs have question and answer fields
    const validFaqs = faqs.filter(faq => faq.question?.trim() && faq.answer?.trim());
    
    if (validFaqs.length !== faqs.length) {
      console.warn(`Found ${faqs.length - validFaqs.length} invalid FAQs that were filtered out`);
    }

    // First, update the single FAQ fields if we have at least one FAQ
    if (validFaqs.length > 0) {
      await Business.findByIdAndUpdate(
        business._id,
        { 
          $set: {
            faqs: validFaqs,
            faq_question: validFaqs[0].question,
            faq_answer: validFaqs[0].answer
          }
        },
        { new: true, runValidators: true }
      );
      console.log('Updated FAQs and single FAQ fields successfully');
    } else {
      // If no FAQs, just update the faqs array to empty
      await Business.findByIdAndUpdate(
        business._id,
        { $set: { faqs: [] } },
        { new: true, runValidators: true }
      );
      console.log('Cleared FAQs array');
    }

    // Get the updated business to return
    const updatedBusiness = await Business.findById(business._id);
    if (!updatedBusiness) {
      console.error('Business not found after update');
      return NextResponse.json(
        { message: 'Business not found after update' },
        { status: 404 }
      );
    }

    console.log('Final updated FAQs:', updatedBusiness.faqs);
    return NextResponse.json({
      message: 'FAQs updated successfully',
      faqs: updatedBusiness.faqs || []
    });
  } catch (error) {
    console.error('Error updating FAQs:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update FAQs' },
      { status: 500 }
    );
  }
} 