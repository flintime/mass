import dbConnect from '@/lib/db';
import Business, { IBusiness } from '@/models/business.model';

async function fixBusinessData() {
  try {
    await dbConnect();
    console.log('Connected to database');

    // Get all businesses
    const businesses = await Business.find({});
    console.log(`Found ${businesses.length} businesses to update`);

    for (const business of businesses) {
      let needsUpdate = false;

      // Fix ZIP code format
      const zipCode = business.get('zip_code');
      if (typeof zipCode === 'number') {
        const formattedZip = String(zipCode).padStart(5, '0');
        business.set('zip_code', formattedZip);
        needsUpdate = true;
      }

      // Add location field if missing
      const latitude = business.get('latitude') as number | undefined;
      const longitude = business.get('longitude') as number | undefined;
      if (latitude && longitude && !business.get('location')) {
        business.set('location', {
          type: 'Point',
          coordinates: [longitude, latitude] // GeoJSON uses [longitude, latitude] order
        });
        needsUpdate = true;
      }

      if (needsUpdate) {
        await business.save();
        console.log(`Updated business: ${business.get('business_name')}`);
      } else {
        console.log(`No updates needed for business: ${business.get('business_name')}`);
      }
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

fixBusinessData(); 