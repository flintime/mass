/**
 * Client-side helper for managing CSRF tokens
 */

let csrfToken: string | null = null;

/**
 * Fetch a new CSRF token from the server
 * @param forceRefresh Force refreshing the token even if we already have one
 * @returns {Promise<string>} The CSRF token
 */
export async function fetchCsrfToken(forceRefresh = false): Promise<string> {
  try {
    // Check if we already have a token and don't need to refresh
    if (csrfToken && !forceRefresh) {
      console.log('Using cached CSRF token');
      return csrfToken;
    }
    
    console.log('Fetching new CSRF token from server...');
    
    // Fetch a new token
    const response = await fetch('/api/csrf', {
      method: 'GET',
      credentials: 'include', // Important to include cookies
      cache: 'no-store', // Don't cache the response
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch CSRF token: ${response.status} ${response.statusText}`);
      // Clear the cached token if fetch failed
      csrfToken = null;
      throw new Error(`Failed to fetch CSRF token: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    csrfToken = data.csrfToken;
    
    if (!csrfToken) {
      console.error('No CSRF token in response');
      throw new Error('No CSRF token in response');
    }
    
    console.log('Successfully fetched new CSRF token');
    return csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    // Clear the cached token on error
    csrfToken = null;
    throw error;
  }
}

/**
 * Clear the cached CSRF token
 */
export function clearCsrfToken(): void {
  console.log('Clearing cached CSRF token');
  csrfToken = null;
}

/**
 * Create fetch options with CSRF protection
 * @param options The fetch options
 * @returns {Promise<RequestInit>} The fetch options with CSRF token
 */
export async function withCsrf(options: RequestInit = {}): Promise<RequestInit> {
  const token = await fetchCsrfToken();
  
  return {
    ...options,
    credentials: 'include',
    headers: {
      ...options.headers,
      'X-CSRF-Token': token,
    },
  };
}

/**
 * Send a POST request with CSRF protection
 * @param url The URL to fetch
 * @param data The data to send
 * @param options Additional fetch options
 * @returns {Promise<Response>} The fetch response
 */
export async function postWithCsrf(
  url: string,
  data: any,
  options: RequestInit = {}
): Promise<Response> {
  try {
    // First attempt with potentially cached token
    const csrfOptions = await withCsrf({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
      credentials: 'include', // Ensure credentials are included
      ...options,
    });
    
    console.log('Making CSRF-protected request to:', url);
    const response = await fetch(url, csrfOptions);
    
    // If it's a CSRF error (403), try refreshing the token and retry once
    if (response.status === 403) {
      const responseData = await response.json();
      if (responseData.error && responseData.error.includes('session')) {
        console.log('CSRF validation failed, refreshing token and retrying...');
        
        // Force refresh the CSRF token
        await fetchCsrfToken(true);
        
        // Retry with fresh token
        const refreshedOptions = await withCsrf({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          body: JSON.stringify(data),
          credentials: 'include', // Ensure credentials are included
          ...options,
        });
        
        console.log('Retrying request with fresh CSRF token');
        return fetch(url, refreshedOptions);
      }
    }
    
    return response;
  } catch (error) {
    console.error('Error in postWithCsrf:', error);
    throw error;
  }
} 