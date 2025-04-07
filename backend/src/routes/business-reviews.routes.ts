import express, { Request, Response } from 'express';
import { authenticateBusiness } from '../middleware/auth.middleware';
import Review, { IReview } from '../models/review.model';
import mongoose, { Document } from 'mongoose';

const router = express.Router();

// Get all reviews for the business
router.get('/', authenticateBusiness, async (req: any, res: Response) => {
  try {
    const reviews = await Review.find({ businessId: req.business.id })
      .sort({ createdAt: -1 });
    
    res.json(reviews);
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// Get review statistics
router.get('/stats', authenticateBusiness, async (req: any, res: Response) => {
  try {
    const reviews = await Review.find({ businessId: req.business.id });
    
    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / totalReviews;
    
    const ratingDistribution = {
      1: reviews.filter(r => r.rating === 1).length,
      2: reviews.filter(r => r.rating === 2).length,
      3: reviews.filter(r => r.rating === 3).length,
      4: reviews.filter(r => r.rating === 4).length,
      5: reviews.filter(r => r.rating === 5).length,
    };

    res.json({
      totalReviews,
      averageRating: averageRating || 0,
      ratingDistribution
    });
  } catch (error: any) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({ message: 'Failed to fetch review statistics' });
  }
});

// Reply to a review
router.post('/:reviewId/reply', authenticateBusiness, async (req: any, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { reply } = req.body;

    console.log('Replying to review:', { reviewId, businessId: req.business.id, reply });

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      console.error('Invalid review ID format:', reviewId);
      return res.status(400).json({ message: 'Invalid review ID format' });
    }

    const review = await Review.findOneAndUpdate(
      { 
        _id: new mongoose.Types.ObjectId(reviewId),
        businessId: new mongoose.Types.ObjectId(req.business.id)
      },
      {
        $set: {
          reply: reply,
          replyDate: new Date()
        }
      },
      { new: true }
    );

    if (!review) {
      console.error('Review not found:', { reviewId, businessId: req.business.id });
      return res.status(404).json({ message: 'Review not found' });
    }

    console.log('Review reply saved successfully:', {
      reviewId: review._id,
      businessId: review.businessId,
      reply: review.reply,
      replyDate: review.replyDate
    });

    res.json(review);
  } catch (error: any) {
    console.error('Error replying to review:', error);
    res.status(500).json({ message: 'Failed to reply to review', error: error.message });
  }
});

// Edit a reply to a review
router.put('/:reviewId/reply', authenticateBusiness, async (req: any, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { reply } = req.body;

    console.log('Editing reply to review:', { reviewId, businessId: req.business.id, reply });

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      console.error('Invalid review ID format:', reviewId);
      return res.status(400).json({ message: 'Invalid review ID format' });
    }

    // Check if review exists and has a reply
    const existingReview = await Review.findOne({
      _id: new mongoose.Types.ObjectId(reviewId),
      businessId: new mongoose.Types.ObjectId(req.business.id)
    });

    if (!existingReview) {
      console.error('Review not found:', { reviewId, businessId: req.business.id });
      return res.status(404).json({ message: 'Review not found' });
    }

    if (!existingReview.reply) {
      console.error('No reply exists for this review:', { reviewId });
      return res.status(400).json({ message: 'No reply exists for this review' });
    }

    const review = await Review.findOneAndUpdate(
      { 
        _id: new mongoose.Types.ObjectId(reviewId),
        businessId: new mongoose.Types.ObjectId(req.business.id)
      },
      {
        $set: {
          reply: reply,
          replyDate: new Date() // Update the reply date when editing
        }
      },
      { new: true }
    );

    if (!review) {
      console.error('Failed to update review reply:', { reviewId });
      return res.status(500).json({ message: 'Failed to update review reply' });
    }

    console.log('Review reply edited successfully:', {
      reviewId: review._id,
      businessId: review.businessId,
      reply: review.reply,
      replyDate: review.replyDate
    });

    res.json(review);
  } catch (error: any) {
    console.error('Error editing review reply:', error);
    res.status(500).json({ message: 'Failed to edit review reply', error: error.message });
  }
});

// Delete a reply from a review
router.delete('/:reviewId/reply', authenticateBusiness, async (req: any, res: Response) => {
  try {
    const { reviewId } = req.params;

    console.log('Deleting reply from review:', { reviewId, businessId: req.business.id });

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      console.error('Invalid review ID format:', reviewId);
      return res.status(400).json({ message: 'Invalid review ID format' });
    }

    // Check if review exists and has a reply
    const existingReview = await Review.findOne({
      _id: new mongoose.Types.ObjectId(reviewId),
      businessId: new mongoose.Types.ObjectId(req.business.id)
    });

    if (!existingReview) {
      console.error('Review not found:', { reviewId, businessId: req.business.id });
      return res.status(404).json({ message: 'Review not found' });
    }

    if (!existingReview.reply) {
      console.error('No reply exists for this review:', { reviewId });
      return res.status(400).json({ message: 'No reply exists for this review' });
    }

    const review = await Review.findOneAndUpdate(
      { 
        _id: new mongoose.Types.ObjectId(reviewId),
        businessId: new mongoose.Types.ObjectId(req.business.id)
      },
      {
        $unset: {
          reply: "",
          replyDate: ""
        }
      },
      { new: true }
    );

    if (!review) {
      console.error('Failed to delete review reply:', { reviewId });
      return res.status(500).json({ message: 'Failed to delete review reply' });
    }

    console.log('Review reply deleted successfully:', {
      reviewId: review._id,
      businessId: review.businessId
    });

    res.json(review);
  } catch (error: any) {
    console.error('Error deleting review reply:', error);
    res.status(500).json({ message: 'Failed to delete review reply', error: error.message });
  }
});

// Update review status
router.put('/:reviewId/status', authenticateBusiness, async (req: any, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const review = await Review.findOne({
      _id: reviewId,
      businessId: req.business.id
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Update status using $set to avoid TypeScript error
    await Review.updateOne(
      { _id: reviewId },
      { $set: { status } }
    );

    const updatedReview = await Review.findById(reviewId);
    res.json(updatedReview);
  } catch (error: any) {
    console.error('Error updating review status:', error);
    res.status(500).json({ message: 'Failed to update review status' });
  }
});

export default router; 