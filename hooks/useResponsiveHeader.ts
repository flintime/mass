'use client';

import { useEffect } from 'react';
import useMobileDetect from './useMobileDetect';

/**
 * Hook to manage responsive header behavior for business dashboard
 * @param shouldHideHeader If true, the header will be hidden on mobile devices
 * @returns Object with mobile detection status
 */
export default function useResponsiveHeader(shouldHideHeader: boolean = true) {
  const { isMobile, isClient } = useMobileDetect();
  
  useEffect(() => {
    if (!isClient) return;
    
    // Only apply header modifications on mobile if shouldHideHeader is true
    if (isMobile && shouldHideHeader) {
      try {
        const header = document.querySelector('header');
        const main = document.querySelector('main');
        
        if (header && main) {
          // Store original values to restore later
          const originalHeaderDisplay = header.style.display;
          const originalMainPadding = main.style.paddingTop;
          
          // Hide header and adjust main padding
          header.style.display = 'none';
          main.style.paddingTop = '0px';
          
          // Restore on cleanup
          return () => {
            header.style.display = originalHeaderDisplay;
            main.style.paddingTop = originalMainPadding;
          };
        }
      } catch (error) {
        console.error('Error adjusting responsive header:', error);
      }
    }
  }, [isMobile, isClient, shouldHideHeader]);
  
  return { isMobile, isClient };
} 