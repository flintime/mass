'use client';

import { useEffect } from 'react';
import useMobileDetect from './useMobileDetect';

/**
 * Hook to manage responsive header behavior
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
        // Only hide headers that are NOT mobile-dashboard-header
        const headers = document.querySelectorAll('header:not(.mobile-dashboard-header)');
        const main = document.querySelector('main');
        
        if (headers.length > 0 && main) {
          // Store original values to restore later
          const originalHeaderDisplays = Array.from(headers).map(header => ({
            element: header,
            display: (header as HTMLElement).style.display
          }));
          const originalMainPadding = main.style.paddingTop;
          
          // Hide headers that are not mobile-dashboard-header
          headers.forEach(header => {
            (header as HTMLElement).style.display = 'none';
          });
          
          // Adjust main padding
          main.style.paddingTop = '0px';
          
          // Restore on cleanup
          return () => {
            originalHeaderDisplays.forEach(item => {
              (item.element as HTMLElement).style.display = item.display;
            });
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