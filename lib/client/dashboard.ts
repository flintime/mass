import { withCsrf } from './csrf';

/**
 * Fetch dashboard data with CSRF protection
 * @returns {Promise<any>} The dashboard data
 */
export async function fetchDashboardData(): Promise<any> {
  try {
    // Use withCsrf to include the CSRF token in the request
    const options = await withCsrf();
    
    const response = await fetch('/api/business/dashboard-data', options);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error ${response.status}: Failed to fetch dashboard data`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
} 