import dbConnect from '@/lib/db';
import BusinessModel from '@/models/business.model';

async function migrateBusiness() {
  try {
    await dbConnect();
    console.log('Connected to database');

    // Get all businesses
    const businesses = await BusinessModel.find({});
    console.log(`Found ${businesses.length} businesses to update`);

    // Update each business with location field
    for (const business of businesses) {
      if (business.latitude && business.longitude) {
        business.location = {
          type: 'Point',
          coordinates: [business.longitude, business.latitude] // GeoJSON uses [longitude, latitude] order
        };
        await business.save();
        console.log(`Updated business: ${business.business_name}`);
      } else {
        console.log(`Skipping business ${business.business_name} - missing coordinates`);
      }
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateBusiness(); 