import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default leaflet icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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
    if (center) {
      map.flyTo([center.lat, center.lng], map.getZoom());
    }
  }, [map, center.lat, center.lng]);
  return null;
}

// Custom icons based on status
const createCustomIcon = (color: string) => {
  return new L.DivIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const getPinColor = (status: string) => {
  switch (status) {
    case 'active': return '#137333'; // verified-green
    case 'flagged': return '#B45309'; // flagged-amber
    case 'inactive': return '#C5221F'; // at-risk-red
    default: return '#1a73e8'; // primary-container
  }
};

export default function GoogleMap({ markers }: GoogleMapProps) {

  // Default to central India if no markers
  const defaultCenter = { lat: 21.1458, lng: 79.0882 };
  const firstMarker = markers[0];
  const center = firstMarker
    ? { lat: firstMarker.lat, lng: firstMarker.lng } 
    : defaultCenter;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-border-default relative z-0">
      <MapContainer 
        center={[center.lat, center.lng]} 
        zoom={11} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={center} />

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={createCustomIcon(getPinColor(marker.status))}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-title-sm text-title-sm mb-1">{marker.title || 'ASHA Worker'}</h3>
                <p className="font-label-sm text-secondary capitalize">Status: {marker.status}</p>
                <p className="font-label-sm text-secondary text-xs mt-1 text-gray-500">
                  {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
