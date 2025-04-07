'use client';

import { Providers } from './providers'
import { ConditionalHeader } from './components/ConditionalHeader'
import GoogleMapsScript from './components/GoogleMapsScript'

interface RootLayoutClientProps {
  children: React.ReactNode;
}

export function RootLayoutClient({ children }: RootLayoutClientProps) {
  return (
    <>
      <GoogleMapsScript />
      <Providers>
        <ConditionalHeader>
          {children}
        </ConditionalHeader>
      </Providers>
    </>
  );
} 