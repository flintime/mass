import express from 'express';
import { Types } from 'mongoose';
import Review from '../models/review.model';
import Business from '../models/business.model';
import { authenticateUser } from '../middleware/auth.middleware';
import type { AuthRequest } from '../middleware/auth.middleware';

const router = express.Router();

// GET /api/reviews/:businessId/check
// Check if user has already reviewed this business
router.get('/:businessId/check', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const { businessId } = req.params;

    if (!Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({ error: 'Invalid business ID' });
    }

    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const existingReview = await Review.findOne({
      businessId: new Types.ObjectId(businessId),
      userId: req.user.id
    });

    res.json({ hasReviewed: !!existingReview });
  } catch (error) {
    console.error('Error checking review status:', error);
    res.status(500).json({ error: 'Failed to check review status' });
  }
});

// GET /api/reviews/:businessId
// Fetch reviews for a specific business
router.get('/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Validate businessId
    if (!Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({ error: 'Invalid business ID' });
    }

    // Check if business exists
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Get total count of reviews
    const totalReviews = await Review.countDocuments({
      businessId
    });

    console.log(`Found ${totalReviews} total reviews for business ${businessId}`);

    // Fetch reviews with pagination
    const reviews = await Review.find({
      businessId
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log(`Returning ${reviews.length} reviews for page ${page}`);

    // Calculate average rating
    const aggregateResult = await Review.aggregate([
      {
        $match: {
          businessId: new Types.ObjectId(businessId)
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          averageServiceQuality: { $avg: '$serviceQualityRating' },
          averageValueForMoney: { $avg: '$valueForMoneyRating' }
        }
      }
    ]);

    const averageRating = aggregateResult[0]?.averageRating || 0;
    const averageServiceQuality = aggregateResult[0]?.averageServiceQuality || 0;
    const averageValueForMoney = aggregateResult[0]?.averageValueForMoney || 0;
    
    console.log(`Average rating for business ${businessId}: ${averageRating}`);
    console.log(`Average service quality for business ${businessId}: ${averageServiceQuality}`);
    console.log(`Average value for money for business ${businessId}: ${averageValueForMoney}`);

    res.json({
      reviews,
      totalReviews,
      averageRating,
      averageServiceQuality,
      averageValueForMoney,
      currentPage: page,
      totalPages: Math.ceil(totalReviews / limit)
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST /api/reviews/:businessId
// Submit a new review
router.post('/:businessId', authenticateUser, async (req: AuthRequest, res) => {
  try {
    console.log('Review submission request received');
    console.log('Authenticated user:', req.user);
    console.log('Request body:', req.body);
    
    const { businessId } = req.params;
    const { rating, serviceQualityRating, valueForMoneyRating, comment, customerName, customerEmail, images } = req.body;
    
    console.log('Rating values received:', { 
      rating, 
      serviceQualityRating, 
      valueForMoneyRating,
      ratingType: typeof rating,
      serviceQualityRatingType: typeof serviceQualityRating,
      valueForMoneyRatingType: typeof valueForMoneyRating
    });

    // Validate businessId
    if (!Types.ObjectId.isValid(businessId)) {
      console.error('Invalid business ID format:', businessId);
      return res.status(400).json({ error: 'Invalid business ID format' });
    }

    if (!req.user?.id) {
      console.error('No user ID in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate business exists
    const business = await Business.findById(businessId);
    if (!business) {
      console.error(`Business not found: ${businessId}`);
      return res.status(404).json({ error: 'Business not found' });
    }

    // Check if user has already reviewed this business
    const existingReview = await Review.findOne({
      businessId: new Types.ObjectId(businessId),
      userId: req.user.id
    });

    if (existingReview) {
      console.error(`User ${req.user.id} has already reviewed business ${businessId}`);
      return res.status(400).json({ error: 'You have already reviewed this business' });
    }

    // Validate required fields
    if (!rating) {
      console.error('Missing required field:', { rating });
      return res.status(400).json({ error: 'Rating is required' });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      console.error('Invalid rating value:', rating);
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Create new review
    const parsedRating = Number(rating);
    const parsedServiceQualityRating = Number(serviceQualityRating);
    const parsedValueForMoneyRating = Number(valueForMoneyRating);
    
    const review = new Review({
      businessId: new Types.ObjectId(businessId),
      userId: req.user.id,
      rating: parsedRating,
      serviceQualityRating: (serviceQualityRating === '0' || serviceQualityRating === 0 || 
                            serviceQualityRating === undefined || serviceQualityRating === '' ||
                            isNaN(parsedServiceQualityRating)) 
        ? parsedRating 
        : parsedServiceQualityRating,
      valueForMoneyRating: (valueForMoneyRating === '0' || valueForMoneyRating === 0 || 
                           valueForMoneyRating === undefined || valueForMoneyRating === '' ||
                           isNaN(parsedValueForMoneyRating)) 
        ? parsedRating 
        : parsedValueForMoneyRating,
      comment,
      customerName: customerName || 'Anonymous',
      customerEmail: customerEmail || '',
      images: images || [] // Add images array from Digital Ocean Spaces
    });

    console.log('Creating new review:', JSON.stringify(review.toJSON(), null, 2));
    await review.save();
    console.log('Review saved successfully');

    res.status(201).json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ 
      error: 'Failed to submit review',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/reviews/:businessId
// Update an existing review
router.put('/:businessId', authenticateUser, async (req: AuthRequest, res) => {
  try {
    console.log('Review update request received');
    console.log('Authenticated user:', req.user);
    console.log('Request body:', req.body);
    
    const { businessId } = req.params;
    const { rating, serviceQualityRating, valueForMoneyRating, comment, images } = req.body;
    
    console.log('Rating values received:', { 
      rating, 
      serviceQualityRating, 
      valueForMoneyRating,
      ratingType: typeof rating,
      serviceQualityRatingType: typeof serviceQualityRating,
      valueForMoneyRatingType: typeof valueForMoneyRating
    });

    // Validate businessId
    if (!Types.ObjectId.isValid(businessId)) {
      console.error('Invalid business ID format:', businessId);
      return res.status(400).json({ error: 'Invalid business ID format' });
    }

    if (!req.user?.id) {
      console.error('No user ID in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Find the existing review
    const existingReview = await Review.findOne({
      businessId: new Types.ObjectId(businessId),
      userId: req.user.id
    });

    if (!existingReview) {
      console.error(`No review found for user ${req.user.id} and business ${businessId}`);
      return res.status(404).json({ error: 'Review not found' });
    }

    // Validate required fields
    if (!rating) {
      console.error('Missing required field:', { rating });
      return res.status(400).json({ error: 'Rating is required' });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      console.error('Invalid rating value:', rating);
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Update the review
    const parsedRating = Number(rating);
    const parsedServiceQualityRating = Number(serviceQualityRating);
    const parsedValueForMoneyRating = Number(valueForMoneyRating);
    
    existingReview.rating = parsedRating;
    existingReview.serviceQualityRating = (serviceQualityRating === '0' || serviceQualityRating === 0 || 
                                          serviceQualityRating === undefined || serviceQualityRating === '' ||
                                          isNaN(parsedServiceQualityRating)) 
      ? parsedRating 
      : parsedServiceQualityRating;
    existingReview.valueForMoneyRating = (valueForMoneyRating === '0' || valueForMoneyRating === 0 || 
                                         valueForMoneyRating === undefined || valueForMoneyRating === '' ||
                                         isNaN(parsedValueForMoneyRating)) 
      ? parsedRating 
      : parsedValueForMoneyRating;
    existingReview.comment = comment;
    existingReview.updatedAt = new Date();
    
    // Update images if provided
    if (images && Array.isArray(images)) {
      existingReview.images = images;
    }

    console.log('Updating review:', JSON.stringify(existingReview.toJSON(), null, 2));
    await existingReview.save();
    console.log('Review updated successfully');

    res.json(existingReview);
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ 
      error: 'Failed to update review',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 