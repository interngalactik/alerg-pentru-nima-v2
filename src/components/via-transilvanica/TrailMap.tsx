'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Box, Typography, Paper, Button, CircularProgress } from '@mui/material';
import { LocationOn, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { parseGPX, ParsedGPX, GPXTrack, calculateDistance } from '@/lib/gpxParser';
import { Waypoint, WaypointFormData } from '../../types/waypoint';
import { WaypointService } from '../../lib/waypointService';
import { AdminAuthService } from '../../lib/adminAuthService';
import { locationService, LocationPoint } from '../../lib/locationService';
import WaypointForm from './WaypointForm';

// Map Click Handler Component for Coordinate Selection
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface TrailMapProps {
  currentLocation: { lat: number; lng: number };
  progress: number;
  completedDistance: number;
  onStartPointChange?: (startPoint: [number, number] | null) => void;
  onProgressUpdate?: (progress: { completedDistance: number; totalDistance: number; progressPercentage: number }) => void;
}

const TrailMap: React.FC<TrailMapProps> = ({ currentLocation, progress, completedDistance, onStartPointChange, onProgressUpdate }) => {
  const [isClient, setIsClient] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [gpxData, setGpxData] = useState<ParsedGPX | null>(null);
  const [uploadedTracks, setUploadedTracks] = useState<GPXTrack[]>([]);
  const [gpxLoading, setGpxLoading] = useState(false);
  const [gpxError, setGpxError] = useState<string | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [showWaypointForm, setShowWaypointForm] = useState(false);
  const [editingWaypoint, setEditingWaypoint] = useState<Waypoint | null>(null);
  const [formCoordinates, setFormCoordinates] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentLocationPoint, setCurrentLocationPoint] = useState<LocationPoint | null>(null);
  const [elevationCursorPosition, setElevationCursorPosition] = useState<[number, number] | null>(null);
  const mapRef = useRef<any>(null);
  const lastProgressUpdateRef = useRef<{ completedDistance: number; totalDistance: number; progressPercentage: number } | null>(null);

  // Get all route points from GPX tracks
  const allRoutePoints = useMemo(() => {
    if (!gpxData || gpxData.tracks.length === 0) {
      return [];
    }
    return gpxData.tracks.flatMap(track => track.points);
  }, [gpxData]);

  // Helper function to calculate total distance of a track
  const calculateTotalTrackDistance = (points: [number, number][]) => {
    if (points.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += calculateDistance(points[i - 1], points[i]);
    }
    return totalDistance;
  };

  // Calculate distance to waypoint from current location along the GPX track
  // This function now calculates the actual distance along the trail path instead of straight-line distance
  const calculateDistanceToWaypoint = useMemo(() => {
    return (waypointCoordinates: { lat: number; lng: number }): number => {
      // Validate coordinates to prevent infinite loops
      if (!waypointCoordinates || 
          Math.abs(waypointCoordinates.lat) < 0.001 || 
          Math.abs(waypointCoordinates.lng) < 0.001 ||
          !currentLocationPoint || 
          !gpxData || 
          gpxData.tracks.length === 0) {
        // Fallback to direct distance if no GPX data or invalid coordinates
        if (!currentLocationPoint || !waypointCoordinates) return 0;
        const currentLatLng: [number, number] = [currentLocationPoint.lat, currentLocationPoint.lng];
        const waypointLatLng: [number, number] = [waypointCoordinates.lat, waypointCoordinates.lng];
        return calculateDistance(currentLatLng, waypointLatLng);
      }
      
      const track = gpxData.tracks[0];
      const points = track.points;
      
      // Find closest point on track for current location
      let currentLocationIndex = 0;
      let currentLocationMinDistance = Infinity;
      
      points.forEach((trackPoint, index) => {
        const distance = calculateDistance(
          [currentLocationPoint.lat, currentLocationPoint.lng],
          trackPoint
        );
        if (distance < currentLocationMinDistance) {
          currentLocationMinDistance = distance;
          currentLocationIndex = index;
        }
      });
      
      // Find closest point on track for waypoint
      let waypointIndex = 0;
      let waypointMinDistance = Infinity;
      
      points.forEach((trackPoint, index) => {
        const distance = calculateDistance(
          [waypointCoordinates.lat, waypointCoordinates.lng],
          trackPoint
        );
        if (distance < waypointMinDistance) {
          waypointMinDistance = distance;
          waypointIndex = index;
        }
      });
      
      // Calculate distance along the track between these points
      const startIndex = Math.min(currentLocationIndex, waypointIndex);
      const endIndex = Math.max(currentLocationIndex, waypointIndex);
      
      let trackDistance = 0;
      for (let i = startIndex; i < endIndex; i++) {
        trackDistance += calculateDistance(points[i], points[i + 1]);
      }
      
      return trackDistance;
    };
  }, [currentLocationPoint, gpxData]);

  // Calculate actual track distance between two points along the GPX route
  // This function calculates the distance along the actual GPX trail instead of straight-line distance
  const calculateTrackDistanceBetweenPoints = (point1: [number, number], point2: [number, number]): number => {
    if (!gpxData || gpxData.tracks.length === 0) {
      // Fallback to direct distance if no GPX data
      return calculateDistance(point1, point2);
    }
    
    const track = gpxData.tracks[0];
    const points = track.points;
    
    // Find closest points on track for both coordinates
    let point1Index = 0;
    let point2Index = 0;
    let minDist1 = Infinity;
    let minDist2 = Infinity;
    
    points.forEach((trackPoint, index) => {
      const dist1 = calculateDistance(point1, trackPoint);
      const dist2 = calculateDistance(point2, trackPoint);
      
      if (dist1 < minDist1) {
        minDist1 = dist1;
        point1Index = index;
      }
      
      if (dist2 < minDist2) {
        minDist2 = dist2;
        point2Index = index;
      }
    });
    
    // Calculate distance along the track between these points
    const startIndex = Math.min(point1Index, point2Index);
    const endIndex = Math.max(point1Index, point2Index);
    
    let trackDistance = 0;
    for (let i = startIndex; i < endIndex; i++) {
      trackDistance += calculateDistance(points[i], points[i + 1]);
    }
    
    return trackDistance;
  };

  // Sort waypoints by their position along the GPX track
  const sortedWaypoints = useMemo(() => {
    if (!waypoints.length || !gpxData || gpxData.tracks.length === 0) {
      return waypoints;
    }

    const track = gpxData.tracks[0];
    const points = track.points;

    // Calculate the closest track point index for each waypoint
    const waypointsWithTrackIndex = waypoints.map(waypoint => {
      let closestIndex = 0;
      let minDistance = Infinity;

      points.forEach((point, index) => {
        const distance = calculateDistance(
          [waypoint.coordinates.lat, waypoint.coordinates.lng],
          point
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      return {
        ...waypoint,
        trackIndex: closestIndex
      };
    });

    // Sort by track index (position along the route)
    return waypointsWithTrackIndex
      .sort((a, b) => a.trackIndex - b.trackIndex)
      .map(({ trackIndex, ...waypoint }) => waypoint); // Remove trackIndex from final result
  }, [waypoints, gpxData]);

  // Calculate distance from the last waypoint on the map or from start point
  const calculateDistanceFromLastWaypoint = (currentWaypointIndex: number): { distance: number; fromName: string } => {
    if (!sortedWaypoints.length) return { distance: 0, fromName: '' };
    
    const currentWaypoint = sortedWaypoints[currentWaypointIndex];
    
    // For the first waypoint, calculate distance from start point
    if (currentWaypointIndex === 0) {
      if (startPoint) {
        const currentLatLng: [number, number] = [currentWaypoint.coordinates.lat, currentWaypoint.coordinates.lng];
        const startLatLng: [number, number] = [startPoint[0], startPoint[1]];
        const distance = calculateTrackDistanceBetweenPoints(startLatLng, currentLatLng);
        return { distance, fromName: 'Start' };
      }
      return { distance: 0, fromName: '' };
    }
    
    // For other waypoints, calculate from previous waypoint
    const previousWaypoint = sortedWaypoints[currentWaypointIndex - 1];
    if (!previousWaypoint) {
      if (startPoint) {
        const currentLatLng: [number, number] = [currentWaypoint.coordinates.lat, currentWaypoint.coordinates.lng];
        const startLatLng: [number, number] = [startPoint[0], startPoint[1]];
        const distance = calculateTrackDistanceBetweenPoints(startLatLng, currentLatLng);
        return { distance, fromName: 'Start' };
      }
      return { distance: 0, fromName: '' };
    }
    
    const currentLatLng: [number, number] = [currentWaypoint.coordinates.lat, currentWaypoint.coordinates.lng];
    const previousLatLng: [number, number] = [previousWaypoint.coordinates.lat, previousWaypoint.coordinates.lng];
    
    const distance = calculateTrackDistanceBetweenPoints(previousLatLng, currentLatLng);
    return { distance, fromName: previousWaypoint.name };
  };

  // Check if current location has passed a waypoint
  const hasPassedWaypoint = (waypointCoordinates: { lat: number; lng: number }): boolean => {
    if (!currentLocationPoint || !gpxData || gpxData.tracks.length === 0) return false;
    
    const track = gpxData.tracks[0];
    const points = track.points;
    
    // Find closest point on track to current location
    let currentClosestIndex = 0;
    let currentMinDistance = Infinity;
    
    points.forEach((point, index) => {
      const distance = calculateDistance(
        [currentLocationPoint.lat, currentLocationPoint.lng],
        point
      );
      if (distance < currentMinDistance) {
        currentMinDistance = distance;
        currentClosestIndex = index;
      }
    });
    
    // Find closest point on track to waypoint
    let waypointClosestIndex = 0;
    let waypointMinDistance = Infinity;
    
    points.forEach((point, index) => {
      const distance = calculateDistance(
        [waypointCoordinates.lat, waypointCoordinates.lng],
        point
      );
      if (distance < waypointMinDistance) {
        waypointMinDistance = distance;
        waypointClosestIndex = index;
      }
    });
    
    // If current location is further along the track than the waypoint, we've passed it
    return currentClosestIndex > waypointClosestIndex;
  };



  // Get start and end points from GPX data
  const startPoint = useMemo(() => {
    return allRoutePoints.length > 0 ? allRoutePoints[0] : null;
  }, [allRoutePoints]);

  // Calculate progress along the track based on current location
  const trackProgress = useMemo(() => {
    if (!gpxData || !currentLocationPoint || gpxData.tracks.length === 0) {
      return { completedPoints: [], remainingPoints: [], completedDistance: 0, totalDistance: 0, progressPercentage: 0 };
    }

    const track = gpxData.tracks[0]; // Use the first track
    const points = track.points;
    
    if (points.length === 0) {
      return { completedPoints: [], remainingPoints: [], completedDistance: 0, totalDistance: 0, progressPercentage: 0 };
    }

    // Find the closest point on the track to current location
    let closestPointIndex = 0;
    let minDistance = Infinity;

    points.forEach((point, index) => {
      const distance = calculateDistance(
        [currentLocationPoint.lat, currentLocationPoint.lng],
        point
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestPointIndex = index;
      }
    });

    // If current location is more than 5km from the track, don't count progress
    if (minDistance > 5) {
      console.log('Current location too far from track:', minDistance, 'km');
      return { 
        completedPoints: [], 
        remainingPoints: points, 
        completedDistance: 0, 
        totalDistance: calculateTotalTrackDistance(points), 
        progressPercentage: 0 
      };
    }

    // Split track into completed and remaining portions
    const completedPoints = points.slice(0, closestPointIndex + 1);
    const remainingPoints = points.slice(closestPointIndex + 1);
    
    // Calculate distances
    const completedDistance = calculateTotalTrackDistance(completedPoints);
    const totalDistance = calculateTotalTrackDistance(points);
    const progressPercentage = totalDistance > 0 ? (completedDistance / totalDistance) * 100 : 0;

    return {
      completedPoints,
      remainingPoints,
      completedDistance,
      totalDistance,
      progressPercentage
    };
  }, [gpxData, currentLocationPoint]);

  // Manual end point coordinates for Via Transilvanica
  const endPoint: [number, number] = [44.624535, 22.666960];

  // Notify parent component when start point changes
  useEffect(() => {
    if (startPoint && onStartPointChange) {
      onStartPointChange(startPoint);
    }
  }, [startPoint, onStartPointChange]);

  // Notify parent component when progress updates
  useEffect(() => {
    if (trackProgress.totalDistance > 0 && onProgressUpdate && trackProgress.progressPercentage > 0) {
      // Check if progress has actually changed to prevent duplicate updates
      const currentProgress = {
        completedDistance: trackProgress.completedDistance,
        totalDistance: trackProgress.totalDistance,
        progressPercentage: trackProgress.progressPercentage
      };

      const lastProgress = lastProgressUpdateRef.current;
      if (lastProgress && 
          lastProgress.completedDistance === currentProgress.completedDistance &&
          lastProgress.totalDistance === currentProgress.totalDistance &&
          lastProgress.progressPercentage === currentProgress.progressPercentage) {
        return; // No change, don't update
      }

      // Debounce progress updates to prevent rapid successive calls
      const timeoutId = setTimeout(() => {
        onProgressUpdate(currentProgress);
        lastProgressUpdateRef.current = currentProgress;
      }, 100); // 100ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [trackProgress.completedDistance, trackProgress.totalDistance, trackProgress.progressPercentage, onProgressUpdate]);

  // Load waypoints on component mount
  useEffect(() => {
    const loadWaypoints = async () => {
      try {
        // console.log('Loading waypoints...');
        const waypointsData = await WaypointService.getAllWaypoints();
        // console.log('Waypoints loaded:', waypointsData);
        setWaypoints(waypointsData);
      } catch (error) {
        console.error('Error loading waypoints:', error);
      }
    };

    loadWaypoints();

    // Subscribe to waypoint changes
    const unsubscribe = WaypointService.subscribeToWaypoints((waypointsData) => {
      // Filter out invalid waypoints with coordinates 0,0
      const validWaypoints = waypointsData.filter(waypoint => 
        waypoint.coordinates && 
        Math.abs(waypoint.coordinates.lat) > 0.001 && 
        Math.abs(waypoint.coordinates.lng) > 0.001
      );
      
      // Log if we found invalid waypoints
      if (validWaypoints.length !== waypointsData.length) {
        console.warn(`Filtered out ${waypointsData.length - validWaypoints.length} invalid waypoints with coordinates 0,0`);
        
        // Find and remove invalid waypoints from database
        waypointsData.forEach(waypoint => {
          if (!waypoint.coordinates || 
              Math.abs(waypoint.coordinates.lat) < 0.001 || 
              Math.abs(waypoint.coordinates.lng) < 0.001) {
            console.warn(`Removing invalid waypoint: ${waypoint.name} (ID: ${waypoint.id})`);
            WaypointService.deleteWaypoint(waypoint.id).catch(error => {
              console.error('Failed to remove invalid waypoint:', error);
            });
          }
        });
      }
      
      setWaypoints(validWaypoints);
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

  // Track current location from Garmin InReach
  useEffect(() => {
    const loadInitialLocation = async () => {
      try {
        const latestLocation = await locationService.getLatestLocation();
        setCurrentLocationPoint(latestLocation);
      } catch (error) {
        console.error('Error loading initial location:', error);
      }
    };

    // Load initial location
    loadInitialLocation();

    // Subscribe to real-time location updates
    const unsubscribe = locationService.onLatestLocationUpdate((latestLocation) => {
      // console.log('Current location updated:', latestLocation);
      if (latestLocation) {
        // console.log('Setting current location point:', latestLocation.lat, latestLocation.lng);
      }
      setCurrentLocationPoint(latestLocation);
    });

    return unsubscribe;
  }, []);

  // Waypoint management functions
  // Waypoint click is now handled directly in the popup

  const handleAddWaypoint = (data: WaypointFormData) => {
    // console.log('handleAddWaypoint called with:', data);
    setEditingWaypoint(null);
    setShowWaypointForm(true);
    // Store the coordinates for the form
    setFormCoordinates(data.coordinates);
    // console.log('Form coordinates set to:', data.coordinates);
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
  };

  const [deletingWaypointId, setDeletingWaypointId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleWaypointDelete = async (waypointId: string) => {
    // Show confirmation dialog
    if (!confirm('Ești sigur că vrei să ștergi acest waypoint? Această acțiune nu poate fi anulată.')) {
      return;
    }

    try {
      setDeletingWaypointId(waypointId);
      setDeleteError(null);
      await WaypointService.deleteWaypoint(waypointId);
      
      // Force refresh waypoints to ensure proper ordering
        setTimeout(async () => {
          try {
            const refreshedWaypoints = await WaypointService.getAllWaypoints();
            setWaypoints(refreshedWaypoints);
          } catch (refreshError) {
            console.error('Error refreshing waypoints:', refreshError);
          }
        }, 100); // Small delay to ensure Firebase update is processed
      
    } catch (error) {
      console.error('Error deleting waypoint:', error);
      setDeleteError('Eroare la ștergerea waypoint-ului. Te rugăm să încerci din nou.');
    } finally {
      setDeletingWaypointId(null);
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
      if (typeof window !== 'undefined' && (window as any).L) {
        setLeafletLoaded(true);
      } else {
        setTimeout(checkLeaflet, 100);
      }
    };
    checkLeaflet();

    // Load the predefined GPX file
    const loadGPXFile = async () => {
      setGpxLoading(true);
      setGpxError(null);
      
      try {
        const response = await fetch('/gpx/Via-Transilvanica-Traseu.gpx');
        
        if (response.ok) {
          const gpxContent = await response.text();
          
          if (gpxContent.length < 100) {
            throw new Error('GPX file appears to be empty or too small');
          }
          
          const parsed = parseGPX(gpxContent);
          setGpxData(parsed);
          setUploadedTracks(parsed.tracks);
          
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
    if (leafletLoaded && (window as any).L) {
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

  const centerOnCurrentLocation = () => {
    if (mapRef.current && currentLocationPoint) {
      mapRef.current.setView([currentLocationPoint.lat, currentLocationPoint.lng], 12);
    }
  };

  const fitBounds = () => {
    if (mapRef.current && gpxData && leafletLoaded) {
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
    <Box sx={{ width: '100%', position: 'relative' }}>
      {/* Map controls */}
      <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, display: 'flex', gap: 1 }}>
        {/* <Button
          variant="contained"
          onClick={centerMap}
          startIcon={<LocationOn />}
          sx={{ backgroundColor: 'white', color: 'var(--blue)', boxShadow: 2 }}
        >
          Center
        </Button> */}
        {currentLocationPoint && (
          <Button
            variant="contained"
            onClick={centerOnCurrentLocation}
            startIcon={<LocationOn />}
            sx={{ backgroundColor: 'var(--orange)', color: 'white', boxShadow: 2 }}
          >
            Locația curentă
          </Button>
        )}
        
        {/* Test button for simulating location updates */}
        {/* <Button
          variant="contained"
          onClick={async () => {
            try {
              // Simulate a location update along the track
              if (gpxData && gpxData.tracks.length > 0) {
                const track = gpxData.tracks[0];
                const points = track.points;
                if (points.length > 0) {
                  // Simulate progress by moving along the track
                  const progressIndex = Math.floor(points.length * 0.3); // 30% along the track
                  const testPoint = points[progressIndex];
                  await locationService.simulateLocationUpdate(testPoint[0], testPoint[1]);
                  // console.log('Test location update sent:', testPoint);
                }
              }
            } catch (error) {
              console.error('Error simulating location update:', error);
            }
          }}
          sx={{ backgroundColor: '#2196f3', color: 'white', boxShadow: 2 }}
        >
          Test Progress
        </Button> */}
        {gpxData && (
          <Button
            variant="contained"
            onClick={fitBounds}
            sx={{ backgroundColor: 'white', color: 'var(--blue)', boxShadow: 2 }}
          >
            Ajustează harta
          </Button>
        )}

      </Box>





      {/* Map Container */}
    <MapContainer
        center={currentLocationPoint ? [currentLocationPoint.lat, currentLocationPoint.lng] : [currentLocation.lat, currentLocation.lng]}
      zoom={8}
        style={{ height: '500px', width: '100%' }}
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Map Click Handler for Coordinate Selection */}
      {showWaypointForm || editingWaypoint ? (
        <MapClickHandler
          onMapClick={(lat, lng) => {
            setFormCoordinates({ lat, lng });
            // console.log('Map clicked for coordinate selection:', { lat, lng });
          }}
        />
      ) : null}

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
            {trackProgress.progressPercentage > 0 ? trackProgress.progressPercentage.toFixed(1) : progress.toFixed(1)}% complet
            </Typography>
          <Typography variant="caption" color="text.secondary">
            {trackProgress.completedDistance > 0 ? trackProgress.completedDistance.toFixed(2) : completedDistance.toFixed(2)} / {trackProgress.totalDistance > 0 ? trackProgress.totalDistance.toFixed(2) : '1400'} km
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
              GPX loaded: {gpxData.tracks.length} tracks
            </Typography>
          )}
          
          {/* Elevation summary */}
          {gpxData && gpxData.tracks.length > 0 && (() => {
            const allElevations = gpxData.tracks.flatMap(track => track.elevation || []);
            const validElevations = allElevations.filter(elev => typeof elev === 'number' && !isNaN(elev));
            
            if (validElevations.length > 0) {
              // Calculate total elevation gain for the entire trail
              let totalElevationGain = 0;
              for (let i = 1; i < validElevations.length; i++) {
                const elevationDiff = validElevations[i] - validElevations[i - 1];
                if (elevationDiff > 0) {
                  totalElevationGain += elevationDiff;
                }
              }
              
              // Calculate elevation gain up to current location
              let completedElevationGain = 0;
              if (currentLocationPoint && trackProgress.completedPoints.length > 0) {
                // Use the length of completed points to determine how many elevation points to include
                const completedElevations = validElevations.slice(0, trackProgress.completedPoints.length);
                
                for (let i = 1; i < completedElevations.length; i++) {
                  const elevationDiff = completedElevations[i] - completedElevations[i - 1];
                  if (elevationDiff > 0) {
                    completedElevationGain += elevationDiff;
                  }
                }
              }
              
              return (
                <Typography variant="caption" display="block" color="info.main">
                  📈 Elevație: {completedElevationGain.toFixed(0)}m / {totalElevationGain.toFixed(0)}m ({((completedElevationGain / totalElevationGain) * 100).toFixed(1)}%)
                </Typography>
              );
            }
            return null;
          })()}
          
          {/* {currentLocationPoint && (
            <Typography variant="caption" display="block" color="info.main">
              📍 Locația curentă: {new Date(currentLocationPoint.timestamp).toLocaleTimeString('ro-RO')} - {currentLocationPoint.lat.toFixed(4)}, {currentLocationPoint.lng.toFixed(4)}
            </Typography>
          )} */}
        </Box>

        {/* GPX Track - Completed portion (green) */}
        {trackProgress.completedPoints.length > 0 && (
            <Polyline
            key="completed-track"
            positions={trackProgress.completedPoints}
              color="#4caf50"
            weight={4}
              opacity={0.9}
            eventHandlers={{
              click: (e) => {
                if (isAdmin) {
                  // Find the closest track point to the clicked location
                  const clickedLatLng = e.latlng;
                  let closestPoint = trackProgress.completedPoints[0];
                  let minDistance = Infinity;
                  
                  trackProgress.completedPoints.forEach(point => {
                    const distance = Math.sqrt(
                      Math.pow(clickedLatLng.lat - point[0], 2) + 
                      Math.pow(clickedLatLng.lng - point[1], 2)
                    );
                    if (distance < minDistance) {
                      minDistance = distance;
                      closestPoint = point;
                    }
                  });
                  
                  // If we're in coordinate selection mode, update coordinates instead of opening form
                  if (showWaypointForm || editingWaypoint) {
                    setFormCoordinates({ lat: closestPoint[0], lng: closestPoint[1] });
                    // console.log('Updated form coordinates from completed track click:', { lat: closestPoint[0], lng: closestPoint[1] });
                    
                    // Show feedback that coordinates were updated
                    const feedbackElement = document.createElement('div');
                    feedbackElement.style.cssText = `
                      position: fixed;
                      top: 20px;
                      right: 20px;
                      background: #4caf50;
                      color: white;
                      padding: 12px 20px;
                      border-radius: 8px;
                      z-index: 10000;
                      font-family: Arial, sans-serif;
                      font-size: 14px;
                      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    `;
                    feedbackElement.textContent = `Coordonatele au fost actualizate: ${closestPoint[0].toFixed(6)}, ${closestPoint[1].toFixed(6)}`;
                    document.body.appendChild(feedbackElement);
                    
                    // Remove feedback after 3 seconds
                    setTimeout(() => {
                      if (feedbackElement.parentNode) {
                        feedbackElement.parentNode.removeChild(feedbackElement);
                      }
                    }, 3000);
                  } else {
                    // Open waypoint form with the closest point coordinates
                    handleAddWaypoint({
                      name: '',
                      type: 'intermediary',
                      details: '',
                      coordinates: { lat: closestPoint[0], lng: closestPoint[1] }
                    });
                  }
                }
              },
              mouseover: (e) => {
                if (isAdmin) {
                  e.target.setStyle({ weight: 6, color: '#45a049' });
                }
              },
              mouseout: (e) => {
                e.target.setStyle({ weight: 4, color: '#4caf50' });
              }
            }}
          />
        )}

        {/* GPX Track - Remaining portion (orange) */}
        {trackProgress.remainingPoints.length > 0 && (
          <Polyline
            key="remaining-track"
            positions={trackProgress.remainingPoints}
            color="#ff6b35"
            weight={isAdmin ? 4 : 3}
            opacity={0.8}
            eventHandlers={{
              click: (e) => {
                if (isAdmin) {
                  // Find the closest track point to the clicked location
                  const clickedLatLng = e.latlng;
                  let closestPoint = trackProgress.remainingPoints[0];
                  let minDistance = Infinity;
                  
                  trackProgress.remainingPoints.forEach(point => {
                    const distance = Math.sqrt(
                      Math.pow(clickedLatLng.lat - point[0], 2) + 
                      Math.pow(clickedLatLng.lng - point[1], 2)
                    );
                    if (distance < minDistance) {
                      minDistance = distance;
                      closestPoint = point;
                    }
                  });
                  
                  // If we're in coordinate selection mode, update coordinates instead of opening form
                  if (showWaypointForm || editingWaypoint) {
                    setFormCoordinates({ lat: closestPoint[0], lng: closestPoint[1] });
                    // console.log('Updated form coordinates from remaining track click:', { lat: closestPoint[0], lng: closestPoint[1] });
                    
                    // Show feedback that coordinates were updated
                    const feedbackElement = document.createElement('div');
                    feedbackElement.style.cssText = `
                      position: fixed;
                      top: 20px;
                      right: 20px;
                      background: #4caf50;
                      color: white;
                      padding: 12px 20px;
                      border-radius: 8px;
                      z-index: 10000;
                      font-family: Arial, sans-serif;
                      font-size: 14px;
                      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    `;
                    feedbackElement.textContent = `Coordonatele au fost actualizate: ${closestPoint[0].toFixed(6)}, ${closestPoint[1].toFixed(6)}`;
                    document.body.appendChild(feedbackElement);
                    
                    // Remove feedback after 3 seconds
                    setTimeout(() => {
                      if (feedbackElement.parentNode) {
                        feedbackElement.parentNode.removeChild(feedbackElement);
                      }
                    }, 3000);
                  } else {
                    // Open waypoint form with the closest point coordinates
                    handleAddWaypoint({
                      name: '',
                      type: 'intermediary',
                      details: '',
                      coordinates: { lat: closestPoint[0], lng: closestPoint[1] }
                    });
                  }
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
        )}

        {/* Fallback: Show full track if no progress calculation */}
        {trackProgress.completedPoints.length === 0 && trackProgress.remainingPoints.length === 0 && uploadedTracks.map((track, trackIndex) => (
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

        {/* Current location marker from Garmin InReach */}
        {currentLocationPoint && (
        <Marker
            key={`current-location-${currentLocationPoint.timestamp}`}
            position={[currentLocationPoint.lat, currentLocationPoint.lng]}
            icon={L.divIcon({
              html: '<div style="background-color: var(--orange); width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>',
              className: 'current-location-marker',
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            })}
        >
          <Popup>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                Locația curentă (Garmin InReach)
            </Typography>
              <Typography variant="caption">
                {currentLocationPoint.lat.toFixed(4)}, {currentLocationPoint.lng.toFixed(4)}
              </Typography>
              {currentLocationPoint.timestamp && (
            <Typography variant="caption" display="block">
                  Actualizat: {new Date(currentLocationPoint.timestamp).toLocaleString('ro-RO')}
            </Typography>
              )}
              {currentLocationPoint.accuracy && (
              <Typography variant="caption" display="block">
                  Precizie: ±{currentLocationPoint.accuracy}m
              </Typography>
            )}
          </Popup>
        </Marker>
        )}

        {/* Waypoint markers with popups */}
        {sortedWaypoints
          .filter(waypoint => 
            waypoint.coordinates && 
            Math.abs(waypoint.coordinates.lat) > 0.001 && 
            Math.abs(waypoint.coordinates.lng) > 0.001
          )
          .map((waypoint, index) => (
        <Marker 
            key={waypoint.id}
            position={[waypoint.coordinates.lat, waypoint.coordinates.lng]}
            icon={L.divIcon({
              html: `<div style="background-color: ${waypoint.type === 'finish-start' ? '#FF6B35' : '#4ECDC4'}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">${index + 1}</div>`,
              className: 'waypoint-marker',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })}
        >
          <Popup>
              <Box sx={{ minWidth: 200 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {waypoint.name}
            </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box
                    sx={{
                      backgroundColor: waypoint.type === 'finish-start' ? '#FF6B35' : '#4ECDC4',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem'
                    }}
                  >
                    {waypoint.type === 'finish-start' ? 'Finish/Start' : 'Intermediar'}
                  </Box>
                </Box>
                
                {waypoint.details && (
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    {waypoint.details}
                  </Typography>
                )}
                
                {/* Date and Time Information */}
                {(waypoint.date || waypoint.eta || waypoint.startDate || waypoint.startTime) && (
                  <Box sx={{ mb: 2 }}>
                    {waypoint.date && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                        <strong>Data de sosire:</strong> {new Date(waypoint.date).toLocaleDateString('ro-RO')}
                      </Typography>
                    )}

                    {waypoint.eta && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                        <strong>ETA:</strong> {new Date(waypoint.eta).toLocaleDateString('ro-RO')}
                      </Typography>
                    )}
                    {waypoint.startDate && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                        <strong>Data de start:</strong> {new Date(waypoint.startDate).toLocaleDateString('ro-RO')}
                      </Typography>
                    )}
                    {waypoint.startTime && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                        <strong>Ora de start:</strong> {waypoint.startTime}
                      </Typography>
                    )}
                  </Box>
                )}
                
                {/* Distance Information */}
                {(() => {
                  const distanceInfo = calculateDistanceFromLastWaypoint(index);
                  const hasPassed = hasPassedWaypoint(waypoint.coordinates);
                  
                  return (
                    <>
                      {/* Distance from current location - only show if not passed */}
                      {currentLocationPoint && !hasPassed && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1, fontStyle: 'italic' }}>
                          <strong>Distanță de la locația curentă:</strong> {calculateDistanceToWaypoint(waypoint.coordinates).toFixed(2)} km
                        </Typography>
                      )}
                      
                      {/* Distance from previous waypoint or start */}
                      {distanceInfo.distance > 0 && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1, fontStyle: 'italic' }}>
                          <strong>Distanță de la {distanceInfo.fromName === 'Start' ? 'start' : `punctul ${distanceInfo.fromName}`}:</strong> {distanceInfo.distance.toFixed(2)} km
                        </Typography>
                      )}
                      
                      {/* Show if waypoint has been passed */}
                      {hasPassed && (
                        <Typography variant="caption" sx={{ color: 'success.main', display: 'block', mb: 1, fontStyle: 'italic' }}>
                          ✅ <strong>Etapă completată</strong>
                        </Typography>
                      )}
                    </>
                  );
                })()}
                
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                  Coordonate: {waypoint.coordinates.lat.toFixed(4)}, {waypoint.coordinates.lng.toFixed(4)}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      const url = `https://www.google.com/maps?q=${waypoint.coordinates.lat},${waypoint.coordinates.lng}`;
                      window.open(url, '_blank');
                    }}
                    sx={{ fontSize: '0.75rem' }}
                  >
                    🗺️ Deschide în Google Maps
                  </Button>
                  
                  {isAdmin && (
                    <>
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        onClick={() => handleWaypointEdit(waypoint)}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        ✏️ Editează
                      </Button>
                      
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={deletingWaypointId === waypoint.id ? <CircularProgress size={16} /> : <DeleteIcon />}
                        onClick={() => handleWaypointDelete(waypoint.id)}
                        disabled={deletingWaypointId === waypoint.id}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        {deletingWaypointId === waypoint.id ? 'Șterg...' : '🗑️ Șterge'}
                      </Button>
                    </>
                  )}
                </Box>
              </Box>
          </Popup>
        </Marker>
      ))}

        {/* Elevation cursor position pin */}
        {elevationCursorPosition && (
        <Marker 
            position={elevationCursorPosition}
            icon={L.divIcon({
              html: '<div style="background-color: #ff5722; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">📍</div>',
              className: 'elevation-cursor-pin',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })}
        >
          <Popup>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                Poziția cursorului
            </Typography>
            <Typography variant="caption">
                {elevationCursorPosition[0].toFixed(4)}, {elevationCursorPosition[1].toFixed(4)}
            </Typography>
          </Popup>
        </Marker>
      )}


    </MapContainer>

      {/* Integrated Elevation Profile */}
      {gpxData && gpxData.tracks.length > 0 && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            Profilul de Elevație - Via Transilvanica
          </Typography>
          
          {/* Elevation Statistics */}
          {(() => {
            const allPoints = gpxData.tracks.flatMap(track => track.points);
            const allElevations = gpxData.tracks.flatMap(track => track.elevation || []);
            const validElevations = allElevations.filter(elev => typeof elev === 'number' && !isNaN(elev));
            
            if (validElevations.length > 0) {
              const minElev = Math.min(...validElevations);
              const maxElev = Math.max(...validElevations);
              
              // Calculate elevation gain and loss
              let totalGain = 0;
              let totalLoss = 0;
              
              for (let i = 1; i < validElevations.length; i++) {
                const elevationDiff = validElevations[i] - validElevations[i - 1];
                if (elevationDiff > 0) {
                  totalGain += elevationDiff;
                } else if (elevationDiff < 0) {
                  totalLoss += Math.abs(elevationDiff);
                }
              }
              
    return (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Elevația minimă: {minElev.toFixed(0)} m
          </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Elevația maximă: {maxElev.toFixed(0)} m
          </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Urcare totală: <span style={{ color: '#4caf50', fontWeight: 'bold' }}>+{totalGain.toFixed(0)} m</span>
          </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Coborâre totală: <span style={{ color: '#f44336', fontWeight: 'bold' }}>-{totalLoss.toFixed(0)} m</span>
        </Typography>
      </Box>
    );
            }
            return null;
          })()}
          
          {/* Interactive Elevation Chart */}
          <Box sx={{ width: '100%', height: 250, position: 'relative', overflow: 'hidden' }}>
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ position: 'absolute', top: 0, left: 0 }}
            >
              {/* Grid lines */}
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f0f0f0" strokeWidth="0.5" />
                </pattern>
              </defs>
              
              {/* Background grid */}
              <rect width="100" height="100" fill="url(#grid)" />
              
              {/* Elevation profile line */}
              {(() => {
                const allPoints = gpxData.tracks.flatMap(track => track.points);
                const allElevations = gpxData.tracks.flatMap(track => track.elevation || []);
                const validElevations = allElevations.filter(elev => typeof elev === 'number' && !isNaN(elev));
                
                if (validElevations.length > 0) {
                  const minElev = Math.min(...validElevations);
                  const maxElev = Math.max(...validElevations);
                  
                  // Calculate cumulative distances for X-axis using proper Haversine formula
                  const cumulativeDistances: number[] = [0];
                  for (let i = 1; i < allPoints.length; i++) {
                    const prevPoint = allPoints[i - 1];
                    const currPoint = allPoints[i];
                    const distance = calculateDistance(prevPoint, currPoint);
                    cumulativeDistances.push(cumulativeDistances[i - 1] + distance);
                  }
                  
                  const totalDistance = cumulativeDistances[cumulativeDistances.length - 1];
                  
                  // Create elevation path with proper distance scaling
                  const points = validElevations.map((elev, index) => {
                    const distancePercent = (cumulativeDistances[index] / totalDistance) * 100;
                    const y = 100 - ((elev - minElev) / (maxElev - minElev)) * 100;
                    return `${distancePercent},${y}`;
                  });
                  
                  const elevationPath = `M ${points.join(' L ')}`;
                  
    return (
                    <>
                      <path
                        d={elevationPath}
                        fill="none"
                        stroke="#4caf50"
                        strokeWidth="0.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Fill area under the line */}
                      <path
                        d={`${elevationPath} L 100,100 L 0,100 Z`}
                        fill="url(#elevationGradient)"
                        opacity="0.3"
                      />
                    </>
                  );
                }
                return null;
              })()}
              
              {/* Gradient definition */}
              <defs>
                <linearGradient id="elevationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#4caf50" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#4caf50" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              
              {/* Interactive cursor line */}
              <line
                id="elevation-cursor"
                x1="0"
                y1="0"
                x2="0"
                y2="100"
                stroke="#ff5722"
                strokeWidth="1"
                strokeDasharray="2,2"
                opacity="0"
                style={{ pointerEvents: 'none' }}
              />
            </svg>
            
            {/* Distance markers (X-axis) */}
            {(() => {
              const allPoints = gpxData.tracks.flatMap(track => track.points);
              if (allPoints.length > 1) {
                // Calculate total distance using proper Haversine formula
                let totalDistance = 0;
                for (let i = 1; i < allPoints.length; i++) {
                  const prevPoint = allPoints[i - 1];
                  const currPoint = allPoints[i];
                  const distance = calculateDistance(prevPoint, currPoint);
                  totalDistance += distance;
  }

  return (
                  <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', px: 1 }}>
                    {[0, 25, 50, 75, 100].map(percent => {
                      const distanceKm = (percent / 100) * totalDistance;
                      return (
                        <Typography key={percent} variant="caption" color="text.secondary">
                          {distanceKm.toFixed(0)} km
        </Typography>
                      );
                    })}
      </Box>
    );
  }
              return null;
            })()}
            
            {/* Elevation markers (Y-axis) */}
            {(() => {
              const allElevations = gpxData.tracks.flatMap(track => track.elevation || []);
              const validElevations = allElevations.filter(elev => typeof elev === 'number' && !isNaN(elev));
              
              if (validElevations.length > 0) {
                const minElev = Math.min(...validElevations);
                const maxElev = Math.max(...validElevations);

  return (
                  <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', py: 1 }}>
                    {[0, 25, 50, 75, 100].map(percent => {
                      const elevation = maxElev - (percent / 100) * (maxElev - minElev);
                      return (
                        <Typography key={percent} variant="caption" color="text.secondary">
                          {elevation.toFixed(0)} m
          </Typography>
                      );
                    })}
                  </Box>
                );
              }
              return null;
            })()}
            
            {/* Interactive overlay for mouse events */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                cursor: 'crosshair'
              }}
                             onMouseMove={(e) => {
                 const rect = e.currentTarget.getBoundingClientRect();
                 const x = e.clientX - rect.left;
                 const percentX = (x / rect.width) * 100;
                 
                 // Update cursor line
                 const cursorLine = document.getElementById('elevation-cursor');
                 if (cursorLine) {
                   cursorLine.setAttribute('x1', percentX.toString());
                   cursorLine.setAttribute('x2', percentX.toString());
                   cursorLine.setAttribute('opacity', '1');
                 }
                 
                 // Update map position and cursor pin
                 if (mapRef.current && gpxData.tracks.length > 0) {
                   const track = gpxData.tracks[0];
                   const allPoints = track.points;
                   
                   // Calculate which point corresponds to this distance percentage
                   if (allPoints.length > 1) {
                     let totalDistance = 0;
                     const cumulativeDistances: number[] = [0];
                     
                     for (let i = 1; i < allPoints.length; i++) {
                       const prevPoint = allPoints[i - 1];
                       const currPoint = allPoints[i];
                       const distance = calculateDistance(prevPoint, currPoint);
                       totalDistance += distance;
                       cumulativeDistances.push(totalDistance);
                     }
                     
                     const targetDistance = (percentX / 100) * totalDistance;
                     
                     // Find the closest point to this distance
                     let closestIndex = 0;
                     let minDiff = Math.abs(cumulativeDistances[0] - targetDistance);
                     
                     for (let i = 1; i < cumulativeDistances.length; i++) {
                       const diff = Math.abs(cumulativeDistances[i] - targetDistance);
                       if (diff < minDiff) {
                         minDiff = diff;
                         closestIndex = i;
                       }
                     }
                     
                     const point = allPoints[closestIndex];
                     
                     if (point) {
                       // Set the cursor position for the pin
                       setElevationCursorPosition([point[0], point[1]]);
                       
                       // Smoothly move map to show the position
                       mapRef.current.setView([point[0], point[1]], mapRef.current.getZoom(), {
                         animate: true,
                         duration: 0.3
                       });
                     }
                   }
                 }
               }}
                             onMouseLeave={() => {
                 // Hide cursor line when mouse leaves
                 const cursorLine = document.getElementById('elevation-cursor');
                 if (cursorLine) {
                   cursorLine.setAttribute('opacity', '0');
                 }
                 
                 // Hide cursor pin
                 setElevationCursorPosition(null);
               }}
            />
      </Box>

          {/* <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Interpretare:</strong> Linia verde arată variația de elevație de-a lungul traseului. 
              Zonele mai înalte sunt reprezentate prin vârfuri, iar zonele mai joase prin văi.
          </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <strong>Interactiv:</strong> Mută cursorul pe grafic pentru a vedea poziția pe hartă.
            </Typography>
          </Box> */}
        </Paper>
        )}

      {/* Legend */}
      <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, backgroundColor: '#4caf50', borderRadius: '50%' }} />
          <Typography variant="caption">Start</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, backgroundColor: 'var(--orange)', borderRadius: '50%' }} />
          <Typography variant="caption">Locația curentă (Garmin)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, backgroundColor: 'var(--blue)', borderRadius: '50%' }} />
          <Typography variant="caption">Destinație</Typography>
        </Box>
        {gpxData && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, backgroundColor: '#ff6b35' }} />
              <Typography variant="caption">GPX Track</Typography>
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
        
        {/* Elevation profile legend */}
        {gpxData && gpxData.tracks.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, backgroundColor: '#4caf50', borderRadius: '50%' }} />
            <Typography variant="caption">Profil Elevație</Typography>
          </Box>
        )}
        
        {/* Coordinate Selection Mode Indicator */}
        {(showWaypointForm || editingWaypoint) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
            <Box sx={{ width: 12, height: 12, backgroundColor: '#ff9800', borderRadius: '50%' }} />
            <Typography variant="caption" sx={{ color: 'warning.contrastText' }}>
              Mod selectare coordonate - Click pe hartă sau pe traseu pentru precizie
            </Typography>
          </Box>
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
        onCoordinateSelect={(coordinates) => {
          // Update form coordinates when user selects from map
          setFormCoordinates(coordinates);
          // Close the form to allow map interaction
          setShowWaypointForm(false);
          // Show a message to click on the map
          alert('Formularul a fost închis pentru a permite selectarea coordonatelor pe hartă. Click pe hartă pentru a selecta coordonatele, apoi deschide din nou formularul.');
        }}
      />


    </Box>
  );
};

export default TrailMap; 