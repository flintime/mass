import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Review from '../models/review.model';

// Load environment variables
dotenv.config();

async function updateReviewsSchema() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');

    // Find all reviews
    const reviews = await Review.find({});
    console.log(`Found ${reviews.length} reviews to update`);

    // Update each review
    let updatedCount = 0;
    for (const review of reviews) {
      // Only update if the new fields don't exist
      if (review.serviceQualityRating === undefined || review.valueForMoneyRating === undefined) {
        // Set the new fields to the same value as the overall rating
        review.serviceQualityRating = review.rating;
        review.valueForMoneyRating = review.rating;
        await review.save();
        updatedCount++;
      }
    }

    console.log(`Updated ${updatedCount} reviews with new rating fields`);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error updating reviews schema:', error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
updateReviewsSchema(); 