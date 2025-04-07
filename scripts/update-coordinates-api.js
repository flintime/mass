// This script updates business coordinates using the API endpoint
// This is useful if you have access to the API but not direct DB access

// Load environment variables from .env files
require('dotenv').config();
try {
  require('dotenv').config({ path: '.env.local' });
} catch (error) {
  console.log('No .env.local file found, using .env only');
}

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// For debugging, print current directory and available env files
console.log('Current directory:', process.cwd());
console.log('Environment files:');
['.env', '.env.local', '.env.development', '.env.production'].forEach(file => {
  if (fs.existsSync(path.join(process.cwd(), file))) {
    console.log(`- ${file} exists`);
  } else {
    console.log(`- ${file} does not exist`);
  }
});

// Configuration
const API_URL = 'http://localhost:3000/api'; // Change to your actual API URL
const DEFAULT_COORDINATES = {
  latitude: 40.7128,
  longitude: -74.0060,
};

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
console.log('Google Maps API Key defined:', !!GOOGLE_MAPS_API_KEY);

if (!GOOGLE_MAPS_API_KEY) {
  console.error('Missing Google Maps API Key. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment.');
  process.exit(1);
}

// Main function
async function updateBusinessCoordinates() {
  try {
    console.log('Fetching businesses through API...');
    
    // Step 1: Get a list of all businesses
    const response = await axios.post(`${API_URL}/search/businesses`, {
      latitude: DEFAULT_COORDINATES.latitude,
      longitude: DEFAULT_COORDINATES.longitude,
      query: '',
      radius: 1000 // Large radius to get as many as possible
    });
    
    console.log(`Found ${response.data.length} businesses`);
    
    if (response.data.length === 0) {
      console.warn('No businesses found. Make sure the API is returning results.');
      return;
    }
    
    // Step 2: Find businesses with missing or invalid coordinates
    const businessesWithoutCoordinates = response.data.filter(business => {
      const hasValidCoords = 
        business.latitude && 
        business.longitude && 
        typeof business.latitude === 'number' && 
        typeof business.longitude === 'number' &&
        !isNaN(business.latitude) &&
        !isNaN(business.longitude) &&
        business.latitude !== 0 &&
        business.longitude !== 0;
      
      return !hasValidCoords;
    });
    
    console.log(`Found ${businessesWithoutCoordinates.length} businesses with missing/invalid coordinates`);
    
    // Log some businesses for debugging
    if (businessesWithoutCoordinates.length > 0) {
      console.log('Sample businesses with missing coordinates:');
      businessesWithoutCoordinates.slice(0, 3).forEach(business => {
        console.log('-'.repeat(50));
        console.log(`ID: ${business._id}`);
        console.log(`Name: ${business.business_name}`);
        console.log(`Address: ${business.address}, ${business.city}, ${business.state} ${business.zip_code}`);
        console.log(`Coordinates: Lat ${business.latitude}, Lng ${business.longitude}`);
      });
    }
    
    // Update coordinates for businesses with valid addresses
    let updated = 0;
    let failed = 0;
    
    for (const business of businessesWithoutCoordinates) {
      if (business.address && business.city && business.state && business.zip_code) {
        try {
          console.log(`Updating coordinates for ${business.business_name}...`);
          
          // Build the address string
          const address = `${business.address}, ${business.city}, ${business.state} ${business.zip_code}`;
          
          // Use Google Geocoding API to get coordinates
          const geocodeResponse = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
          );
          
          if (geocodeResponse.data.status === 'OK' && geocodeResponse.data.results.length > 0) {
            const location = geocodeResponse.data.results[0].geometry.location;
            const latitude = location.lat;
            const longitude = location.lng;
            
            console.log(`New coordinates: Lat ${latitude}, Lng ${longitude}`);
            
            // Call API to update the business with new coordinates
            // You would need to create this endpoint in your API
            await axios.post(`${API_URL}/business/${business._id}/update-coordinates`, {
              latitude,
              longitude
            });
            
            console.log(`Successfully updated coordinates for ${business.business_name}`);
            updated++;
          } else {
            console.warn(`Geocoding failed for ${business.business_name}: ${geocodeResponse.data.status}`);
            failed++;
          }
        } catch (error) {
          console.error(`Error updating ${business.business_name}:`, error.message);
          failed++;
        }
        
        // Add a delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        console.warn(`${business.business_name} is missing address information`);
        failed++;
      }
    }
    
    console.log('\nUpdate summary:');
    console.log(`Total businesses processed: ${businessesWithoutCoordinates.length}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Failed to update: ${failed}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the script
updateBusinessCoordinates(); 