/**
 * Singleton utility to load the Google Maps API only once
 */

// Global state
let isLoading = false;
let isLoaded = false;
let loadPromise: Promise<void> | null = null;
let scriptElement: HTMLScriptElement | null = null;

export const GoogleMapsLoader = {
  /**
   * Load the Google Maps API script
   * @returns Promise that resolves when the API is loaded
   */
  load(): Promise<void> {
    // If already loaded, return resolved promise
    if (isLoaded && window.google?.maps?.places) {
      console.log('Google Maps already loaded, using existing instance');
      return Promise.resolve();
    }

    // If currently loading, return the existing promise
    if (isLoading && loadPromise) {
      console.log('Google Maps currently loading, waiting for completion');
      return loadPromise;
    }

    // Start loading
    console.log('Starting Google Maps script loading');
    isLoading = true;
    loadPromise = new Promise<void>((resolve, reject) => {
      try {
        // Check if API key exists
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          throw new Error('Google Maps API key is missing');
        }

        // Check if script is already in DOM but not fully loaded
        const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]') as HTMLScriptElement;
        if (existingScript) {
          console.log('Found existing Google Maps script in DOM');
          scriptElement = existingScript;
          
          // If Google is already defined, we might just need to wait a bit for it to fully initialize
          if (window.google) {
            const checkLoaded = setInterval(() => {
              if (window.google?.maps?.places) {
                clearInterval(checkLoaded);
                clearTimeout(timeout);
                console.log('Google Maps Places library detected');
                isLoaded = true;
                resolve();
              }
            }, 100);
            
            // Set timeout in case it never loads
            const timeout = setTimeout(() => {
              clearInterval(checkLoaded);
              console.error('Timed out waiting for Google Maps to initialize');
              isLoading = false;
              loadPromise = null;
              reject(new Error('Timed out waiting for existing Google Maps script'));
            }, 5000);
            
            return;
          } else {
            // If the script element exists but window.google is not defined,
            // the script might be still loading or it might have failed
            console.log('Script exists but Google object not defined, waiting for load event');
            
            // Set up event listeners
            existingScript.addEventListener('load', function handleLoad() {
              existingScript.removeEventListener('load', handleLoad);
              
              setTimeout(() => {
                if (window.google?.maps?.places) {
                  console.log('Google Maps loaded from existing script');
                  isLoaded = true;
                  resolve();
                } else {
                  console.error('Script loaded but Google Maps Places not available');
                  isLoading = false;
                  loadPromise = null;
                  reject(new Error('Google Maps Places library not loaded correctly'));
                }
              }, 500);
            });
            
            existingScript.addEventListener('error', function handleError() {
              existingScript.removeEventListener('error', handleError);
              console.error('Error loading existing Google Maps script');
              isLoading = false;
              loadPromise = null;
              reject(new Error('Error loading existing Google Maps script'));
            });
            
            // If the script has been in the DOM for a while but hasn't loaded, it might be stuck
            // Set a timeout just in case
            setTimeout(() => {
              if (!isLoaded) {
                console.error('Existing script timed out, removing and trying again');
                isLoading = false;
                loadPromise = null;
                
                // Remove the potentially broken script and reject
                if (existingScript.parentNode) {
                  existingScript.parentNode.removeChild(existingScript);
                }
                
                reject(new Error('Existing Google Maps script timed out'));
              }
            }, 5000);
            
            return;
          }
        }

        // Create and append the script
        console.log('Creating new Google Maps script element');
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        scriptElement = script;
        
        // Handle script load error
        script.onerror = () => {
          console.error('Failed to load Google Maps script');
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
          scriptElement = null;
          isLoading = false;
          loadPromise = null;
          reject(new Error('Failed to load Google Maps script'));
        };
        
        // Handle successful script load
        script.onload = () => {
          console.log('Google Maps script loaded, checking for Places library');
          // Verify that the Places library is available
          setTimeout(() => {
            if (window.google?.maps?.places) {
              console.log('Google Maps Places library verified');
              isLoaded = true;
              resolve();
            } else {
              console.error('Google Maps Places library not loaded correctly');
              if (script.parentNode) {
                script.parentNode.removeChild(script);
              }
              scriptElement = null;
              isLoading = false;
              loadPromise = null;
              reject(new Error('Google Maps Places library not loaded correctly'));
            }
          }, 500);
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error('Error during Google Maps script loading:', error);
        isLoading = false;
        loadPromise = null;
        reject(error instanceof Error ? error : new Error('Unknown error loading Google Maps'));
      }
    });

    return loadPromise;
  },

  /**
   * Reset the loader state - useful for testing or if the API needs to be reloaded
   */
  reset(): void {
    if (scriptElement && scriptElement.parentNode) {
      scriptElement.parentNode.removeChild(scriptElement);
    }
    scriptElement = null;
    isLoaded = false;
    isLoading = false;
    loadPromise = null;
  }
}; 