'use client';

import React from 'react';
import { Marker } from 'react-leaflet';
import { Waypoint } from '../../types/waypoint';
import L from 'leaflet';

interface WaypointMarkerProps {
  waypoint: Waypoint;
  onClick: (waypoint: Waypoint) => void;
}

export default function WaypointMarker({ waypoint, onClick }: WaypointMarkerProps) {
  // Create custom icon based on waypoint type
  const createCustomIcon = (type: string) => {
    const iconSize = [24, 24];
    const iconAnchor = [12, 12];
    
    let iconColor: string;
    let iconSymbol: string;
    
    if (type === 'finish-start') {
      iconColor = '#FF6B35'; // Orange for finish/start
      iconSymbol = '🏁'; // Flag emoji
    } else {
      iconColor = '#4ECDC4'; // Teal for intermediary
      iconSymbol = '📍'; // Pin emoji
    }
    
    return L.divIcon({
      className: 'custom-waypoint-marker',
      html: `
        <div style="
          background-color: ${iconColor};
          border: 2px solid white;
          border-radius: 50%;
          width: ${iconSize[0]}px;
          height: ${iconSize[1]}px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          cursor: pointer;
          font-size: 12px;
        ">
          ${iconSymbol}
        </div>
      `,
      iconSize: iconSize as [number, number],
      iconAnchor: iconAnchor as [number, number],
    });
  };

  return (
    <Marker
      position={[waypoint.coordinates.lat, waypoint.coordinates.lng]}
      icon={createCustomIcon(waypoint.type)}
      eventHandlers={{
        click: () => onClick(waypoint),
      }}
    />
  );
}
