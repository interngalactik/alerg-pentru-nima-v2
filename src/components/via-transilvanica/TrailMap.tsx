'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { LocationOn, Add as AddIcon } from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { parseGPX, ParsedGPX, GPXTrack } from '@/lib/gpxParser';
import { Waypoint, WaypointFormData } from '../../types/waypoint';
import { WaypointService } from '../../lib/waypointService';
import { AdminAuthService } from '../../lib/adminAuthService';
import WaypointMarker from './WaypointMarker';
import WaypointForm from './WaypointForm';
import WaypointDisplay from './WaypointDisplay';

interface TrailMapProps {
  currentLocation: { lat: number; lng: number };
  progress: number;
  completedDistance: number;
  onStartPointChange?: (startPoint: [number, number] | null) => void;
}

const TrailMap: React.FC<TrailMapProps> = ({ currentLocation, progress, completedDistance, onStartPointChange }) => {
  const [isClient, setIsClient] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [gpxData, setGpxData] = useState<ParsedGPX | null>(null);
  const [uploadedTracks, setUploadedTracks] = useState<GPXTrack[]>([]);
  const [gpxLoading, setGpxLoading] = useState(false);
  const [gpxError, setGpxError] = useState<string | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selectedWaypoint, setSelectedWaypoint] = useState<Waypoint | null>(null);
  const [showWaypointForm, setShowWaypointForm] = useState(false);
  const [editingWaypoint, setEditingWaypoint] = useState<Waypoint | null>(null);
  const [formCoordinates, setFormCoordinates] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [isAdmin, setIsAdmin] = useState(false);
  const mapRef = useRef<any>(null);

  // Get all route points from GPX tracks
  const allRoutePoints = useMemo(() => {
    if (!gpxData || gpxData.tracks.length === 0) {
      return [];
    }
    return gpxData.tracks.flatMap(track => track.points);
  }, [gpxData]);

  // Get start and end points from GPX data
  const startPoint = useMemo(() => {
    return allRoutePoints.length > 0 ? allRoutePoints[0] : null;
  }, [allRoutePoints]);

  // Manual end point coordinates for Via Transilvanica
  const endPoint: [number, number] = [44.624535, 22.666960];

  // Notify parent component when start point changes
  useEffect(() => {
    if (startPoint && onStartPointChange) {
      onStartPointChange(startPoint);
    }
  }, [startPoint, onStartPointChange]);

  // Load waypoints on component mount
  useEffect(() => {
    const loadWaypoints = async () => {
      try {
        console.log('Loading waypoints...');
        const waypointsData = await WaypointService.getAllWaypoints();
        console.log('Waypoints loaded:', waypointsData);
        setWaypoints(waypointsData);
      } catch (error) {
        console.error('Error loading waypoints:', error);
      }
    };

    loadWaypoints();

    // Subscribe to waypoint changes
    const unsubscribe = WaypointService.subscribeToWaypoints((waypointsData) => {
      console.log('Waypoints updated via subscription:', waypointsData);
      setWaypoints(waypointsData);
    });

    return unsubscribe;
  }, []);

  // Check admin status using the authentication service
  useEffect(() => {
    const checkAdminStatus = async () => {
      const isAdminUser = await AdminAuthService.isAdminLoggedIn();
      setIsAdmin(isAdminUser);
    };
    
    // Check initial status
    checkAdminStatus();
    
    // Set up interval to check admin status periodically
    const interval = setInterval(checkAdminStatus, 30000); // Check every 30 seconds
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Waypoint management functions
  const handleWaypointClick = (waypoint: Waypoint) => {
    setSelectedWaypoint(waypoint);
  };

  const handleAddWaypoint = (data: WaypointFormData) => {
    console.log('handleAddWaypoint called with:', data);
    setEditingWaypoint(null);
    setShowWaypointForm(true);
    // Store the coordinates for the form
    setFormCoordinates(data.coordinates);
    console.log('Form coordinates set to:', data.coordinates);
  };

  const handleWaypointSubmit = async (data: WaypointFormData) => {
    try {
      if (editingWaypoint) {
        await WaypointService.updateWaypoint(editingWaypoint.id, data);
      } else {
        await WaypointService.addWaypoint(data);
      }
      setShowWaypointForm(false);
      setEditingWaypoint(null);
    } catch (error) {
      console.error('Error saving waypoint:', error);
    }
  };

  const handleWaypointEdit = (waypoint: Waypoint) => {
    setEditingWaypoint(waypoint);
    setShowWaypointForm(true);
    setSelectedWaypoint(null);
  };

  const handleWaypointDelete = async (waypointId: string) => {
    try {
      await WaypointService.deleteWaypoint(waypointId);
      setSelectedWaypoint(null);
    } catch (error) {
      console.error('Error deleting waypoint:', error);
    }
  };

  // Initialize client-side rendering and load GPX data
  useEffect(() => {
    setIsClient(true);
    
    // Import Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    // Wait for Leaflet to be available
    const checkLeaflet = () => {
      console.log('Checking for Leaflet...');
      if (typeof window !== 'undefined' && (window as any).L) {
        console.log('Leaflet found, setting leafletLoaded to true');
        setLeafletLoaded(true);
      } else {
        console.log('Leaflet not found, retrying...');
        setTimeout(checkLeaflet, 100);
      }
    };
    checkLeaflet();

    // Load the predefined GPX file
    const loadGPXFile = async () => {
      setGpxLoading(true);
      setGpxError(null);
      
      try {
        console.log('Loading GPX file...');
        const response = await fetch('/gpx/via-transilvanica.gpx');
        
        if (response.ok) {
          const gpxContent = await response.text();
          console.log('GPX file loaded, size:', gpxContent.length, 'characters');
          
          if (gpxContent.length < 100) {
            throw new Error('GPX file appears to be empty or too small');
          }
          
          const parsed = parseGPX(gpxContent);
          setGpxData(parsed);
          setUploadedTracks(parsed.tracks);
          console.log('GPX file parsed successfully:', parsed);
        } else {
          throw new Error(`Failed to load GPX file: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error('Error loading GPX file:', error);
        setGpxError(error instanceof Error ? error.message : 'Unknown error loading GPX file');
        console.warn('Using fallback route due to GPX loading error');
      } finally {
        setGpxLoading(false);
      }
    };

    loadGPXFile();

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Safe icon creation function
  const createIcon = (iconUrl: string, size: [number, number], anchor: [number, number], popupAnchor: [number, number]) => {
    if (typeof window !== 'undefined' && (window as any).L) {
      return new (window as any).L.Icon({
        iconUrl,
        iconSize: size,
        iconAnchor: anchor,
        popupAnchor
      });
    }
    return undefined;
  };

  const centerMap = () => {
    if (mapRef.current) {
      mapRef.current.setView([currentLocation.lat, currentLocation.lng], 10);
    }
  };

  const fitBounds = () => {
    if (mapRef.current && gpxData && typeof window !== 'undefined') {
      const allPoints = [
        ...gpxData.waypoints.map(wp => [wp.lat, wp.lng] as [number, number]),
        ...gpxData.tracks.flatMap(track => track.points)
      ];
      
      if (allPoints.length > 0) {
        const bounds = (window as any).L.latLngBounds(allPoints);
        mapRef.current.fitBounds(bounds);
      }
    }
  };

  // Don't render map until client-side and Leaflet is loaded
  if (!isClient || !leafletLoaded) {
    return (
      <Box sx={{ width: '100%', height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography>Loading map...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 500, position: 'relative' }}>
      {/* Map controls */}
      <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          onClick={centerMap}
          startIcon={<LocationOn />}
          sx={{ backgroundColor: 'white', color: 'var(--blue)', boxShadow: 2 }}
        >
          Center
        </Button>
        {gpxData && (
          <Button
            variant="contained"
            onClick={fitBounds}
            sx={{ backgroundColor: 'white', color: 'var(--blue)', boxShadow: 2 }}
          >
            Fit Route
          </Button>
        )}

      </Box>

      {/* Progress overlay */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          backgroundColor: 'rgba(255,255,255,0.9)',
          padding: 2,
          borderRadius: 1,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          zIndex: 1000,
          maxWidth: 300
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
          {progress.toFixed(1)}% complet
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {completedDistance} / 1400 km
        </Typography>
        
        {gpxLoading && (
          <Typography variant="caption" display="block" color="primary">
            Loading GPX file...
          </Typography>
        )}
        
        {gpxError && (
          <Typography variant="caption" display="block" color="error">
            GPX Error: {gpxError}
          </Typography>
        )}
        
        {gpxData && !gpxLoading && !gpxError && (
          <Typography variant="caption" display="block" color="success.main">
            GPX loaded: {gpxData.tracks.length} tracks, {gpxData.waypoints.length} waypoints
          </Typography>
        )}
      </Box>



      {/* Map Container */}
      <MapContainer
        center={[currentLocation.lat, currentLocation.lng]}
        zoom={8}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Uploaded GPX tracks */}
        {uploadedTracks.map((track, trackIndex) => (
          <Polyline
            key={`track-${trackIndex}`}
            positions={track.points}
            color="#ff6b35"
            weight={isAdmin ? 4 : 3}
            opacity={0.8}
            eventHandlers={{
              click: (e) => {
                if (isAdmin) {
                  // Find the closest track point to the clicked location
                  const clickedLatLng = e.latlng;
                  let closestPoint = track.points[0];
                  let minDistance = Infinity;
                  
                  track.points.forEach(point => {
                    const distance = Math.sqrt(
                      Math.pow(clickedLatLng.lat - point[0], 2) + 
                      Math.pow(clickedLatLng.lng - point[1], 2)
                    );
                    if (distance < minDistance) {
                      minDistance = distance;
                      closestPoint = point;
                    }
                  });
                  
                  console.log('Track clicked at:', clickedLatLng, 'closest point:', closestPoint);
                  
                  // Open waypoint form with the closest point coordinates
                  handleAddWaypoint({
                    name: '',
                    type: 'intermediary',
                    details: '',
                    coordinates: { lat: closestPoint[0], lng: closestPoint[1] }
                  });
                }
              },
              mouseover: (e) => {
                if (isAdmin) {
                  e.target.setStyle({ weight: 5, color: '#4caf50' });
                }
              },
              mouseout: (e) => {
                e.target.setStyle({ weight: isAdmin ? 4 : 3, color: '#ff6b35' });
              }
            }}
          />
        ))}

        {/* Uploaded GPX waypoints */}
        {gpxData?.waypoints.map((waypoint, index) => (
          <Marker 
            key={`waypoint-${index}`}
            position={[waypoint.lat, waypoint.lng]}
            icon={createIcon(
              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyQzIgMTcuNTIgNi40OCAyMiAxMiAyMkMxNy41MiAyMiAyMiAxNy41MiAyMiAxMkMyMiA2LjQ4IDE3LjUyIDIgMTIgMloiIGZpbGw9IiMzRjk5RjUiLz4KPHBhdGggZD0iTTEyIDEzQzEzLjY2IDEzIDE1IDExLjY2IDE1IDEwQzE1IDguMzQgMTMuNjYgNyAxMiA3QzEwLjM0IDcgOSA4LjM0IDkgMTBDOSAxMS42NiAxMC4zNCAxMyAxMiAxM1oiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
              [20, 20],
              [10, 10],
              [0, -10]
            )}
          >
            <Popup>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {waypoint.name || `Waypoint ${index + 1}`}
              </Typography>
              {waypoint.description && (
                <Typography variant="caption" display="block">
                  {waypoint.description}
                </Typography>
              )}
              {waypoint.elevation && (
                <Typography variant="caption" display="block">
                  Elevation: {waypoint.elevation}m
                </Typography>
              )}
            </Popup>
          </Marker>
        ))}

        {/* Start marker */}
        {startPoint && (
          <Marker 
            position={startPoint}
            icon={createIcon(
              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyQzIgMTcuNTIgNi40OCAyMiAxMiAyMkMxNy41MiAyMiAyMiAxNy41MiAyMiAxMkMyMiA2LjQ4IDE3LjUyIDIgMTIgMloiIGZpbGw9IiM0Y2FmNTAiLz4KPHBhdGggZD0iTTEyIDEzQzEzLjY2IDEzIDE1IDExLjY2IDE1IDEwQzE1IDguMzQgMTMuNjYgNyAxMiA3QzEwLjM0IDcgOSA4LjM0IDkgMTBDOSAxMS42NiAxMC4zNCAxMyAxMiAxM1oiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
              [24, 24],
              [12, 12],
              [0, -12]
            )}
          >
            <Popup>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                Start - {startPoint[0].toFixed(4)}, {startPoint[1].toFixed(4)}
              </Typography>
              <Typography variant="caption">
                Începutul traseului Via Transilvanica
              </Typography>
            </Popup>
          </Marker>
        )}

        {/* End marker */}
        <Marker 
          position={endPoint}
          icon={createIcon(
            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiNmZjY2MDAiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNCIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
            [24, 24],
            [12, 12],
            [0, -12]
          )}
        >
          <Popup>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Destinație - {endPoint[0].toFixed(4)}, {endPoint[1].toFixed(4)}
            </Typography>
            <Typography variant="caption">
              Sfârșitul traseului Via Transilvanica
            </Typography>
          </Popup>
        </Marker>

        {/* Current location marker */}
        <Marker 
          position={[currentLocation.lat, currentLocation.lng]}
          icon={createIcon(
            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyQzIgMTcuNTIgNi40OCAyMiAxMiAyMkMxNy41MiAyMiAyMiAxNy41MiAyMiAxMkMyMiA2LjQ4IDE3LjUyIDIgMTIgMloiIGZpbGw9IiNGNDQzMzYiLz4KPHBhdGggZD0iTTEyIDEzQzEzLjY2IDEzIDE1IDExLjY2IDE1IDEwQzE1IDguMzQgMTMuNjYgNyAxMiA3QzEwLjM0IDcgOSA4LjM0IDkgMTBDOSAxMS42NiAxMC4zNCAxMyAxMiAxM1oiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
            [24, 24],
            [12, 12],
            [0, -12]
          )}
        >
          <Popup>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Locația ta
            </Typography>
            <Typography variant="caption">
              {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
            </Typography>
          </Popup>
        </Marker>

        {/* Waypoint markers */}
        {waypoints.map((waypoint) => (
          <WaypointMarker
            key={waypoint.id}
            waypoint={waypoint}
            onClick={handleWaypointClick}
          />
        ))}


      </MapContainer>

      {/* Legend */}
      <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, backgroundColor: '#4caf50', borderRadius: '50%' }} />
          <Typography variant="caption">Start</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, backgroundColor: '#f44336', borderRadius: '50%' }} />
          <Typography variant="caption">Locația ta</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, backgroundColor: '#ff6600', borderRadius: '50%' }} />
          <Typography variant="caption">Destinație</Typography>
        </Box>
        {gpxData && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, backgroundColor: '#ff6b35' }} />
              <Typography variant="caption">GPX Track</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, backgroundColor: '#3F99F5', borderRadius: '50%' }} />
              <Typography variant="caption">GPX Waypoint</Typography>
            </Box>
            {isAdmin && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, backgroundColor: '#4caf50' }} />
                <Typography variant="caption">Click Track to Add Waypoint</Typography>
              </Box>
            )}
          </>
        )}
        
        {/* Waypoint legend */}
        {waypoints.length > 0 && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, backgroundColor: '#4ECDC4', borderRadius: '50%' }} />
              <Typography variant="caption">Punct intermediar</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, backgroundColor: '#FF6B35', borderRadius: '50%' }} />
              <Typography variant="caption">Finish/Start</Typography>
            </Box>
          </>
        )}
      </Box>

      {/* Waypoint Form Dialog */}
      <WaypointForm
        isOpen={showWaypointForm}
        onClose={() => {
          setShowWaypointForm(false);
          setEditingWaypoint(null);
          setFormCoordinates({ lat: 0, lng: 0 });
        }}
        onSubmit={handleWaypointSubmit}
        initialData={editingWaypoint || undefined}
        coordinates={editingWaypoint?.coordinates || formCoordinates}
      />

      {/* Waypoint Display Dialog */}
      {selectedWaypoint && (
        <WaypointDisplay
          waypoint={selectedWaypoint}
          isAdmin={isAdmin}
          onEdit={handleWaypointEdit}
          onDelete={handleWaypointDelete}
          onClose={() => setSelectedWaypoint(null)}
        />
      )}
    </Box>
  );
};

export default TrailMap; 