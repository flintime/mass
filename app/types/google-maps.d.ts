// Google Maps type definitions
declare global {
  interface Window {
    google: typeof google;
  }
}

declare namespace google.maps {
  class Map {
    constructor(mapDiv: Element, opts?: MapOptions);
  }

  interface MapOptions {
    center?: LatLng | LatLngLiteral;
    zoom?: number;
    [key: string]: any;
  }
  
  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }

  interface LatLngLiteral {
    lat: number;
    lng: number;
  }
  
  namespace event {
    function clearInstanceListeners(instance: any): void;
  }
  
  namespace places {
    class Autocomplete {
      constructor(inputElement: HTMLInputElement, options?: AutocompleteOptions);
      addListener(eventName: string, handler: () => void): void;
      getPlace(): PlaceResult;
    }

    interface AutocompleteOptions {
      componentRestrictions?: {
        country: string | string[];
      };
      fields?: string[];
      types?: string[];
      [key: string]: any;
    }

    interface PlaceResult {
      address_components?: AddressComponent[];
      formatted_address?: string;
      [key: string]: any;
    }

    interface AddressComponent {
      long_name: string;
      short_name: string;
      types: string[];
    }
  }
}

// This empty export makes this file a module
export {}; 