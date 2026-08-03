import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { useState, useEffect } from 'react';

interface GoogleMapProps {
  markers: Array<{
    id: string;
    lat: number;
    lng: number;
    status: 'active' | 'flagged' | 'inactive';
    title?: string;
  }>;
}

function MapUpdater({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (map && center) {
      map.panTo(center);
    }
  }, [map, center.lat, center.lng]);
  return null;
}

export default function GoogleMap({ markers }: GoogleMapProps) {
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  // Default to central India if no markers
  const defaultCenter = { lat: 21.1458, lng: 79.0882 };
  const firstMarker = markers[0];
  const center = firstMarker
    ? { lat: firstMarker.lat, lng: firstMarker.lng } 
    : defaultCenter;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="w-full h-full bg-surface-container-low flex items-center justify-center rounded-xl border border-border-default">
        <p className="text-secondary font-label-md">Google Maps API Key missing</p>
      </div>
    );
  }

  const getPinColor = (status: string) => {
    switch (status) {
      case 'active': return '#137333'; // verified-green
      case 'flagged': return '#B45309'; // flagged-amber
      case 'inactive': return '#C5221F'; // at-risk-red
      default: return '#1a73e8'; // primary-container
    }
  };

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-border-default relative">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultZoom={11}
          defaultCenter={center}
          mapId="DEMO_MAP_ID" // Replace with a real Map ID for custom styling
          disableDefaultUI={true}
          zoomControl={true}
          className="w-full h-full"
        >
          <MapUpdater center={center} />
          {markers.map((marker) => (
            <AdvancedMarker
              key={marker.id}
              position={{ lat: marker.lat, lng: marker.lng }}
              onClick={() => setSelectedMarkerId(marker.id)}
              title={marker.title}
            >
              <Pin
                background={getPinColor(marker.status)}
                borderColor={getPinColor(marker.status)}
                glyphColor="#fff"
                scale={selectedMarkerId === marker.id ? 1.2 : 1}
              />
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
