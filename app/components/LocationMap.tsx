'use client'

import { useEffect, useRef } from 'react'
import { Loader } from "@googlemaps/js-api-loader"

interface LocationMapProps {
  lat: number
  lng: number
}

export default function LocationMap({ lat, lng }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        version: "weekly",
      })

      const { Map } = await loader.importLibrary('maps')

      const mapOptions: google.maps.MapOptions = {
        center: { lat, lng },
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
      }

      const map = new Map(mapRef.current as HTMLElement, mapOptions)

      new google.maps.Marker({
        position: { lat, lng },
        map: map,
      })
    }

    initMap()
  }, [lat, lng])

  return <div ref={mapRef} style={{ width: '100%', height: '300px' }} />
}

