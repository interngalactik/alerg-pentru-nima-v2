'use client';

/**
 * TrailMap Component - Performance Optimized with Server-Side Calculations
 * 
 * This component has been optimized to use Firebase Cloud Functions for heavy calculations:
 * 
 * 🚀 SERVER-SIDE OPTIMIZATIONS:
 * - Pre-calculated track distances and elevation gain
 * - Pre-calculated waypoint positions and distances
 * - Server-side progress updates
 * - Automatic fallback to client-side calculations when server data unavailable
 * 
 * 💻 CLIENT-SIDE OPTIMIZATIONS:
 * - Calculation caching with useRef<Map>
 * - Debounced map click handlers
 * - Memoized expensive calculations
 * - Optimized re-renders with useCallback and useMemo
 * 
 * 🔄 AUTO-UPDATES:
 * - Automatic server data loading when GPX/waypoints change
 * - Progress updates every 10 seconds when run is active
 * - Manual refresh and recalculation buttons for admins
 * 
 * 📊 VISUAL INDICATORS:
 * - 🚀 = Using server data (fast)
 * - 💻 = Using client calculations (fallback)
 * - Status indicators for admin controls
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Box, Typography, Paper, Button, CircularProgress } from '@mui/material';
import { LocationOn, Delete as DeleteIcon } from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { parseGPX, ParsedGPX, GPXTrack, calculateDistance } from '@/lib/gpxParser';
import { Waypoint, WaypointFormData } from '../../types/waypoint';
import { WaypointService } from '../../lib/waypointService';
import { AdminAuthService } from '../../lib/adminAuthService';
import { locationService, LocationPoint } from '../../lib/locationService';
import { runTimelineService } from '../../lib/runTimelineService';
import { waypointCompletionService } from '../../lib/waypointCompletionService';
import WaypointForm from './WaypointForm';
import { ref, set, get } from 'firebase/database';
import { database } from '../../lib/firebase';
import { performanceService } from '../../lib/performanceService';

// Simple performance optimization: Debounce function
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Map Click Handler Component for Coordinate Selection
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  const debouncedClick = useCallback(
    debounce((lat: number, lng: number) => onMapClick(lat, lng), 150),
    [onMapClick]
  );

  useMapEvents({
    click: (e) => {
      debouncedClick(e.latlng.lat, e.latlng.lng);
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
  const [waypointsTimestamp, setWaypointsTimestamp] = useState<number>(Date.now());
  const [showWaypointForm, setShowWaypointForm] = useState(false);
  const [editingWaypoint, setEditingWaypoint] = useState<Waypoint | null>(null);
  const [isCoordinateSelectionMode, setIsCoordinateSelectionMode] = useState(false);
  const [formCoordinates, setFormCoordinates] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentLocationPoint, setCurrentLocationPoint] = useState<LocationPoint | null>(null);
  const [elevationCursorPosition, setElevationCursorPosition] = useState<[number, number] | null>(null);
  const [startDate, setStartDate] = useState<Date>(new Date('2025-09-01'));
  const [startTime, setStartTime] = useState<string>('07:00');
  const [finishDate, setFinishDate] = useState<Date>(new Date('2025-09-25'));
  const [finishTime, setFinishTime] = useState<string>('18:00');
  const [isRunActive, setIsRunActive] = useState(false);
  const [runTimeline, setRunTimeline] = useState<{ startDate: string; finishDate: string; startTime: string; finishTime: string } | null>(null);
  const [waypointCompletions, setWaypointCompletions] = useState<Record<string, { completedAt: number; completedBy: string }>>({});
  const [showProgressOverlay, setShowProgressOverlay] = useState(true); // Toggle for progress overlay
  const [isPopupOpen, setIsPopupOpen] = useState(false); // Track popup state
  const mapRef = useRef<L.Map | null>(null);
  const lastProgressUpdateRef = useRef<{ completedDistance: number; totalDistance: number; progressPercentage: number } | null>(null);

    // Enhanced performance optimization: Cache for expensive calculations
  const calculationCache = useRef<Map<string, any>>(new Map());
  
  // Server-side pre-calculated data
  const [precalculatedData, setPrecalculatedData] = useState<any>(null);
  const [isLoadingPrecalculatedData, setIsLoadingPrecalculatedData] = useState(false);

  // Clear cache when GPX data changes
  useEffect(() => {
    calculationCache.current.clear();
    // Also clear the performance service cache when GPX data changes
    performanceService.clearCache();
  }, [gpxData]);

  // Load pre-calculated data when GPX data or waypoints change
  useEffect(() => {
    if (gpxData && waypoints.length > 0) {
      loadPrecalculatedData();
    }
  }, [gpxData, waypoints]);



  // Function to load pre-calculated data from server
  const loadPrecalculatedData = useCallback(async () => {
    if (!gpxData || waypoints.length === 0) return;
    
    try {
      setIsLoadingPrecalculatedData(true);
      
      const data = await performanceService.getPrecalculatedData();
      
      if (data) {
        setPrecalculatedData(data);
        
        // Check if track distances are missing and auto-calculate them
        if (!data.trackDistances || !data.trackDistances.totalDistance) {
          await autoCalculateMissingTrackData();
        }
      } else {
        // Trigger server-side calculation if no data exists
        await triggerServerCalculation();
      }
    } catch (error: any) {
      console.error('Error loading pre-calculated data:', error);
      // Fall back to client-side calculations
    } finally {
      setIsLoadingPrecalculatedData(false);
    }
  }, [gpxData, waypoints]);

  // Function to automatically calculate missing track data
  const autoCalculateMissingTrackData = useCallback(async () => {
    if (!gpxData) return;
    
    try {
      await performanceService.precalculateTrackDistances(gpxData);
      
      // Reload the data to get the new track information
      const updatedData = await performanceService.getPrecalculatedData();
      if (updatedData) {
        setPrecalculatedData(updatedData);
      }
    } catch (error: any) {
      console.error('Error auto-calculating track data:', error);
      // Don't show alert to user - this is automatic
    }
  }, [gpxData]);

  // Function to trigger comprehensive server-side calculation
  const triggerServerCalculation = useCallback(async () => {
    if (!gpxData) return;
    
    try {
      // Calculate track distances first (if missing)
      if (!precalculatedData?.trackDistances?.totalDistance) {
        await performanceService.precalculateTrackDistances(gpxData);
      }
      
      // Calculate waypoint data (if waypoints exist)
      if (waypoints.length > 0) {
        await performanceService.precalculateWaypointDistances(gpxData, waypoints);
      }
      
      // Reload all data after calculations
      const data = await performanceService.getPrecalculatedData();
      if (data) {
        setPrecalculatedData(data);
      }
    } catch (error: any) {
      console.error('Error in comprehensive server calculation:', error);
    }
  }, [gpxData, waypoints, precalculatedData]);

  // Function to update progress on server
  const updateServerProgress = useCallback(async () => {
    if (!gpxData || !currentLocationPoint || !waypoints.length) return;
    
    try {
      // Find the next waypoint
      const nextWaypoint = waypoints.find(wp => !wp.isCompleted);
      
      if (nextWaypoint) {
        await performanceService.updateProgress(currentLocationPoint, nextWaypoint.id, gpxData);
      }
    } catch (error: any) {
      console.error('Error updating progress on server:', error);
    }
  }, [gpxData, currentLocationPoint, waypoints]);

  // Auto-update progress on server when current location actually changes (not on timer)
  useEffect(() => {
    if (currentLocationPoint && gpxData && waypoints.length > 0 && isRunActive) {
      // Only update when location actually changes (not on a timer)
      // This will trigger when currentLocationPoint changes (every 10 minutes)
      updateServerProgress();
    }
  }, [currentLocationPoint, updateServerProgress, gpxData, waypoints, isRunActive]);



  // Test Cloud Functions connection
  const testCloudFunctions = useCallback(async () => {
    try {
      const isConnected = await performanceService.testConnection();
      if (isConnected) {
        alert('✅ Cloud Functions are working!');
      } else {
        alert('❌ Cloud Functions connection failed');
      }
    } catch (error) {
      console.error('Error testing Cloud Functions:', error);
      alert('❌ Error testing Cloud Functions');
    }
  }, []);

// Performance optimization: Pre-calculate and cache track data
const cachedTrackData = useMemo(() => {
  if (!gpxData || !gpxData.tracks || gpxData.tracks.length === 0) return null;
  
  const cacheKey = 'trackData';
  if (calculationCache.current.has(cacheKey)) {
    return calculationCache.current.get(cacheKey);
  }
  
  const track = gpxData.tracks[0];
  const points = track.points;
  
  if (points.length < 2) return null;
  
  // Calculate total track distance once and cache it
  let totalDistance = 0;
  const segmentDistances: number[] = [];
  const cumulativeDistances: number[] = [0];
  
  for (let i = 1; i < points.length; i++) {
    const segmentDistance = calculateDistance(points[i - 1], points[i]);
    totalDistance += segmentDistance;
    segmentDistances.push(segmentDistance);
    cumulativeDistances.push(totalDistance);
  }
  
  const trackData = {
    totalDistance: Math.round(totalDistance * 100) / 100,
    segmentDistances,
    cumulativeDistances,
    pointCount: points.length
  };
  
  calculationCache.current.set(cacheKey, trackData);
  return trackData;
}, [gpxData]);

  // Add popup event listeners when map is ready (phone only)
  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current;
      
      const handlePopupOpen = (e: any) => {
        setIsPopupOpen(true);
        // Only auto-hide overlay on phones (≤600px)
        if (window.innerWidth <= 600) {
          setShowProgressOverlay(false);
        }
        
        // Popup opened - handle overlay visibility (phone only)
        // Let Leaflet handle popup positioning naturally
      };
      
      const handlePopupClose = () => {
        setIsPopupOpen(false);
        // Only auto-show overlay on phones (≤600px)
        if (window.innerWidth <= 600) {
          setShowProgressOverlay(true);
        }
      };
      
      // Listen for popup open/close events
      map.on('popupopen', handlePopupOpen);
      map.on('popupclose', handlePopupClose);
      
      return () => {
        map.off('popupopen', handlePopupOpen);
        map.off('popupclose', handlePopupClose);
      };
    }
  }, [mapRef.current]);

  // Get all route points from GPX tracks
  const allRoutePoints = useMemo(() => {
    if (!gpxData || gpxData.tracks.length === 0) {
      return [];
    }
    return gpxData.tracks.flatMap(track => track.points);
  }, [gpxData]);

  // Helper function to calculate total distance of a track with caching
  const calculateTotalTrackDistance = useCallback((points: [number, number][]) => {
    if (points.length < 2) return 0;
    
    // Use pre-calculated server data if available
    if (precalculatedData && precalculatedData.trackDistances && precalculatedData.trackDistances.totalDistance) {
      return precalculatedData.trackDistances.totalDistance;
    }
    
    // Use cached track data if available and points match the main track
    if (cachedTrackData && points.length === cachedTrackData.pointCount) {
      return cachedTrackData.totalDistance;
    }
    
    // Fallback to calculation if cache is not available
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += calculateDistance(points[i - 1], points[i]);
    }
    return totalDistance;
  }, [cachedTrackData, precalculatedData]);

  // Calculate distance to waypoint from current location along the GPX track
  // This function now uses pre-calculated data when available, falling back to client-side calculation
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
      
      // Try to use pre-calculated data first
      if (precalculatedData && precalculatedData.waypointPositions && precalculatedData.waypointDistances) {
        // Find the waypoint that matches these coordinates
        const matchingWaypoint = waypoints.find(wp => 
          Math.abs(wp.coordinates.lat - waypointCoordinates.lat) < 0.0001 &&
          Math.abs(wp.coordinates.lng - waypointCoordinates.lng) < 0.0001
        );
        
        if (matchingWaypoint && precalculatedData.waypointPositions[matchingWaypoint.id]) {
          const waypointPosition = precalculatedData.waypointPositions[matchingWaypoint.id];
          
          // If we have current location data, calculate distance from current to waypoint
          if (currentLocationPoint) {
            // Use the pre-calculated waypoint position on the track
            const waypointTrackPoint = waypointPosition.closestTrackPoint;
            
            // Find current location on track
            let currentLocationIndex = 0;
            let currentLocationMinDistance = Infinity;
            
            const track = gpxData.tracks[0];
            const points = track.points;
            
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
            
            // Calculate distance along track from current location to waypoint
            const startIndex = Math.min(currentLocationIndex, waypointPosition.trackIndex);
            const endIndex = Math.max(currentLocationIndex, waypointPosition.trackIndex);
            
            let trackDistance = 0;
            for (let i = startIndex; i < endIndex; i++) {
              trackDistance += calculateDistance(points[i], points[i + 1]);
            }
            
            return trackDistance;
          }
        }
      }
      
      // Fallback to original client-side calculation if no pre-calculated data
      // Create cache key for this calculation
      const cacheKey = `waypoint_${waypointCoordinates.lat}_${waypointCoordinates.lng}_${currentLocationPoint.lat}_${currentLocationPoint.lng}`;
      
      // Check if we have cached result
      if (calculationCache.current.has(cacheKey)) {
        return calculationCache.current.get(cacheKey);
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
      
      // Cache the result
      calculationCache.current.set(cacheKey, trackDistance);
      
      return trackDistance;
    };
  }, [currentLocationPoint, gpxData, precalculatedData, waypoints]);

  // Calculate actual track distance between two points along the GPX route
  // This function now uses pre-calculated data when available, falling back to client-side calculation
  const calculateTrackDistanceBetweenPoints = (point1: [number, number], point2: [number, number]): number => {
    if (!gpxData || gpxData.tracks.length === 0) {
      // Fallback to direct distance if no GPX data
      return calculateDistance(point1, point2);
    }
    
    // Try to use pre-calculated waypoint distances if both points are waypoints
    if (precalculatedData && precalculatedData.waypointDistances) {
      const waypoint1 = waypoints.find(wp => 
        Math.abs(wp.coordinates.lat - point1[0]) < 0.0001 &&
        Math.abs(wp.coordinates.lng - point1[1]) < 0.0001
      );
      
      const waypoint2 = waypoints.find(wp => 
        Math.abs(wp.coordinates.lat - point2[0]) < 0.0001 &&
        Math.abs(wp.coordinates.lng - point2[1]) < 0.0001
      );
      
      if (waypoint1 && waypoint2 && precalculatedData.waypointDistances[`${waypoint1.id}-${waypoint2.id}`]) {
        const precalculatedDistance = precalculatedData.waypointDistances[`${waypoint1.id}-${waypoint2.id}`];
        return precalculatedDistance;
      }
    }
    
    // Fallback to original client-side calculation
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

  // Calculate distance from last waypoint or start
  const calculateDistanceFromLastWaypoint = useCallback((waypointIndex: number) => {
    if (!sortedWaypoints.length) return { distance: 0, fromName: '' };
    
    const currentWaypoint = sortedWaypoints[waypointIndex];
    
    if (waypointIndex === 0) {
      // First waypoint - calculate from start of GPX track
      if (gpxData && gpxData.tracks.length > 0) {
        const track = gpxData.tracks[0];
        if (track.points.length > 0) {
          const startPoint = track.points[0];
          const distance = calculateTrackDistanceBetweenPoints(
            [startPoint[0], startPoint[1]],
            [currentWaypoint.coordinates.lat, currentWaypoint.coordinates.lng]
          );
          return { distance, fromName: 'Start' };
        }
      }
      return { distance: 0, fromName: 'Start' };
    }
    
    // For other waypoints, calculate from previous waypoint
    const previousWaypoint = sortedWaypoints[waypointIndex - 1];
    const distance = calculateTrackDistanceBetweenPoints(
      [previousWaypoint.coordinates.lat, previousWaypoint.coordinates.lng],
      [currentWaypoint.coordinates.lat, currentWaypoint.coordinates.lng]
    );
    return { distance, fromName: previousWaypoint.name };
  }, [sortedWaypoints, gpxData]);

  // Calculate elevation gain between two points along the GPX track
  const calculateElevationGain = useCallback((startPoint: [number, number], endPoint: [number, number]) => {
    if (!gpxData || gpxData.tracks.length === 0) return 0;
    
    const track = gpxData.tracks[0];
    const allPoints = track.points;
    const allElevations = track.elevation || [];
    
    if (allPoints.length === 0 || allElevations.length === 0) return 0;
    
    // Find the closest GPX points to our start and end coordinates
    let startIndex = 0;
    let endIndex = allPoints.length - 1;
    let startMinDistance = Infinity;
    let endMinDistance = Infinity;
    
    allPoints.forEach((point, index) => {
      const startDist = calculateDistance([point[0], point[1]], startPoint);
      const endDist = calculateDistance([point[0], point[1]], endPoint);
      
      if (startDist < startMinDistance) {
        startMinDistance = startDist;
        startIndex = index;
      }
      if (endDist < endMinDistance) {
        endMinDistance = endDist;
        endIndex = index;
      }
    });
    
    // Ensure startIndex is before endIndex
    if (startIndex > endIndex) {
      [startIndex, endIndex] = [endIndex, startIndex];
    }
    
    // Calculate cumulative elevation gain between these points
    let elevationGain = 0;
    for (let i = startIndex + 1; i <= endIndex; i++) {
      if (i < allElevations.length && i - 1 < allElevations.length) {
        const currentElev = allElevations[i];
        const prevElev = allElevations[i - 1];
        
        if (typeof currentElev === 'number' && typeof prevElev === 'number' && !isNaN(currentElev) && !isNaN(prevElev)) {
          const elevationDiff = currentElev - prevElev;
          if (elevationDiff > 0) {
            elevationGain += elevationDiff;
          }
        }
      }
    }
    
    return elevationGain;
  }, [gpxData]);

  // Calculate elevation gain from current location to a waypoint
  const calculateElevationGainFromCurrentLocation = useCallback((waypointCoordinates: { lat: number; lng: number }) => {
    if (!currentLocationPoint) return 0;
    
    return calculateElevationGain(
      [currentLocationPoint.lat, currentLocationPoint.lng],
      [waypointCoordinates.lat, waypointCoordinates.lng]
    );
  }, [currentLocationPoint, calculateElevationGain]);

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

  // Enhanced waypoint completion check that considers both physical passage and run timeline
  const isWaypointCompleted = (waypoint: Waypoint): boolean => {
    // If waypoint is explicitly marked as completed, show it as completed
    if (waypoint.isCompleted) {
      return true;
    }
    
    // If no run timeline, no waypoints can be completed
    if (!runTimeline) {
      return false;
    }
    
    // If run is not active, only show previously completed waypoints
    if (!isRunActive) {
      return waypoint.isCompleted || false;
    }
    
    // During active run, check if physically passed
    return hasPassedWaypoint(waypoint.coordinates);
  };



  // Get start and end points from GPX data
  const startPoint = useMemo(() => {
    return allRoutePoints.length > 0 ? allRoutePoints[0] : null;
  }, [allRoutePoints]);

  // Check if run is currently active and load waypoint completions
  useEffect(() => {
    const checkRunStatus = async () => {
      try {
        const timeline = await runTimelineService.getRunTimeline();
        setRunTimeline(timeline);
        if (timeline) {
          const active = runTimelineService.isRunActive(timeline);
          // console.log('🔄 Run status check:', { timeline, active });
          setIsRunActive(active);
        } else {
          console.log('⚠️ No run timeline found');
        }
      } catch (error) {
        console.error('Error checking run status:', error);
      }
    };
    
    const loadCompletions = async () => {
      try {
        const completions = await waypointCompletionService.getWaypointCompletions();
        setWaypointCompletions(completions);
      } catch (error) {
        console.warn('⚠️ Waypoint completions not available (permission issue):', error);
        // Set empty completions on error - this is expected during development
        setWaypointCompletions({});
      }
    };
    
    checkRunStatus();
    loadCompletions();
    
    // Check run status every 5 minutes instead of every minute to reduce loops
    const interval = setInterval(checkRunStatus, 300000); // Check every 5 minutes
    const completionsUnsubscribe = waypointCompletionService.onCompletionsUpdate(setWaypointCompletions);
    
    return () => {
      clearInterval(interval);
      completionsUnsubscribe();
    };
  }, []); // Empty dependency array to prevent infinite loop

  // Calculate progress along the track based on current location with caching
  const trackProgress = useMemo(() => {
    // Only log when values actually change to reduce spam
    const hasGpxData = !!gpxData;
    const hasLocation = !!currentLocationPoint;
    
    // If run is not active, show no progress
    if (!isRunActive) {
      return { completedPoints: [], remainingPoints: [], completedDistance: 0, totalDistance: 0, progressPercentage: 0 };
    }
    
    if (!gpxData || !currentLocationPoint || gpxData.tracks.length === 0) {
      return { completedPoints: [], remainingPoints: [], completedDistance: 0, totalDistance: 0, progressPercentage: 0 };
    }

    const track = gpxData.tracks[0]; // Use the first track
    const points = track.points;
    
    if (points.length === 0) {
      return { completedPoints: [], remainingPoints: [], completedDistance: 0, totalDistance: 0, progressPercentage: 0 };
    }

    // Create cache key for progress calculation
    const progressCacheKey = `progress_${currentLocationPoint.lat}_${currentLocationPoint.lng}_${points.length}`;
    
    // Check if we have cached progress result
    if (calculationCache.current.has(progressCacheKey)) {
      return calculationCache.current.get(progressCacheKey);
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
      const result = { 
        completedPoints: [], 
        remainingPoints: points, 
        completedDistance: 0, 
        totalDistance: calculateTotalTrackDistance(points), 
        progressPercentage: 0 
      };
      
      // Cache the result
      calculationCache.current.set(progressCacheKey, result);
      return result;
    }

    // Split track into completed and remaining portions
    const completedPoints = points.slice(0, closestPointIndex + 1);
    const remainingPoints = points.slice(closestPointIndex + 1);
    
    // Calculate distances using pre-calculated server data when available, fallback to cached track data
    const completedDistance = calculateTotalTrackDistance(completedPoints);
    
    let totalDistance: number;
    if (precalculatedData && precalculatedData.trackDistances && precalculatedData.trackDistances.totalDistance) {
      totalDistance = precalculatedData.trackDistances.totalDistance;
    } else if (cachedTrackData) {
      totalDistance = cachedTrackData.totalDistance;
    } else {
      totalDistance = calculateTotalTrackDistance(points);
    }
    
    const progressPercentage = totalDistance > 0 ? (completedDistance / totalDistance) * 100 : 0;

    const result = {
      completedPoints,
      remainingPoints,
      completedDistance,
      totalDistance,
      progressPercentage
    };
    
    // Cache the result
    calculationCache.current.set(progressCacheKey, result);
    
    return result;
  }, [gpxData, currentLocationPoint, isRunActive, cachedTrackData, precalculatedData]);

  // Function to check and mark waypoints as completed
  const checkWaypointCompletions = useCallback(async () => {
    if (!runTimeline || !isRunActive || !currentLocationPoint) return;
    
    try {
      for (const waypoint of sortedWaypoints) {
        // Skip already completed waypoints
        if (waypoint.isCompleted) continue;
        
        // Check if waypoint should be marked as completed
        const shouldComplete = hasPassedWaypoint(waypoint.coordinates);
        
        if (shouldComplete) {
          await waypointCompletionService.markWaypointCompleted(
            waypoint.id,
            'auto',
            runTimeline
          );
        }
      }
      
      // Refresh completions
      const completions = await waypointCompletionService.getWaypointCompletions();
      setWaypointCompletions(completions);
    } catch (error) {
      console.error('Error checking waypoint completions:', error);
    }
  }, [runTimeline, isRunActive, currentLocationPoint, sortedWaypoints]);

  // Watch for location changes and check waypoint completions
  useEffect(() => {
    if (runTimeline && isRunActive && currentLocationPoint) {
      checkWaypointCompletions();
    }
  }, [currentLocationPoint, checkWaypointCompletions]);

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
      setWaypointsTimestamp(Date.now()); // Force re-render of waypoint markers
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
    
    // Load start/finish dates from Firebase
    loadStartFinishDates();
    
    // Set up interval to check admin status periodically
    const interval = setInterval(checkAdminStatus, 30000); // Check every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Auto-save start/finish dates when they change
  useEffect(() => {
    // console.log('Dates changed - startDate:', startDate, 'startTime:', startTime, 'finishDate:', finishDate, 'finishTime:', finishTime, 'isAdmin:', isAdmin);
    if (isAdmin) {
      // console.log('Saving dates to Firebase...');
      saveStartFinishDates();
    }
  }, [startDate, startTime, finishDate, finishTime, isAdmin]);

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
      
      // Refresh waypoints to show updated coordinates on the map
      setTimeout(async () => {
        try {
          const refreshedWaypoints = await WaypointService.getAllWaypoints();
          setWaypoints(refreshedWaypoints);
          setWaypointsTimestamp(Date.now()); // Force re-render of waypoint markers
        } catch (refreshError) {
          console.error('Error refreshing waypoints:', refreshError);
        }
      }, 100); // Small delay to ensure Firebase update is processed
      
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
          setWaypointsTimestamp(Date.now()); // Force re-render of waypoint markers
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
      if (typeof window !== 'undefined' && (window as typeof window & { L: typeof L }).L) {
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
        const bounds = (window as typeof window & { L: typeof L }).L.latLngBounds(allPoints);
        mapRef.current.fitBounds(bounds);
      }
    }
  };

  // Save start/finish dates to Firebase
  const saveStartFinishDates = async () => {
    try {
      const datesData = {
        startDate: startDate.toISOString(),
        startTime: startTime,
        finishDate: finishDate.toISOString(),
        finishTime: finishTime,
        updatedAt: new Date().toISOString()
      };
      
      // Save to Firebase under a special key
      const datesRef = ref(database, 'startFinishDates');
      await set(datesRef, datesData);
      // console.log('Start/finish dates saved to Firebase');
    } catch (error) {
      console.error('Error saving start/finish dates:', error);
    }
  };

  // Load start/finish dates from Firebase
  const loadStartFinishDates = async () => {
    try {
      const datesRef = ref(database, 'startFinishDates');
      const snapshot = await get(datesRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.startDate) {
          const startDate = new Date(data.startDate);
          setStartDate(startDate);
        }
        if (data.startTime) setStartTime(data.startTime);
        if (data.finishDate) {
          const finishDate = new Date(data.finishDate);
          setFinishDate(finishDate);
        }
        if (data.finishTime) setFinishTime(data.finishTime);
        // console.log('Start/finish dates loaded from Firebase');
      }
    } catch (error) {
      console.error('Error loading start/finish dates:', error);
    }
  };

  // Don't render map until client-side and Leaflet is loaded
  if (!isClient || !leafletLoaded) {
    return (
      <Box sx={{ width: '100%', height: '80vh', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography>Loading map...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      {/* Custom CSS for mobile popup optimization */}
      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        }
        
        .leaflet-popup-content {
          margin: 8px !important;
          font-size: 14px !important;
        }
        

        
        @media (max-width: 768px) {
          .leaflet-popup-content {
            margin: 6px !important;
            font-size: 12px !important;
          }
          
          .leaflet-popup-content-wrapper {
            max-width: 90vw !important;
            min-width: 200px !important;
          }
        }
      `}</style>
              {/* Map controls - Auto-hide on mobile when popup is open */}
        <Box sx={{ 
          position: 'absolute', 
          top: 10, 
          right: 10, 
          zIndex: 1000, 
          display: 'flex', 
          gap: 1,
          opacity: (window.innerWidth <= 600 && isPopupOpen) ? 0 : 1,
          visibility: (window.innerWidth <= 600 && isPopupOpen) ? 'hidden' : 'visible',
          transition: 'opacity 0.2s ease-in-out, visibility 0.2s ease-in-out'
        }}>
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
            size="small"
            sx={{ 
              backgroundColor: 'var(--blue)', 
              color: 'white', 
              boxShadow: 2,
              fontSize: { xs: '0.7rem', sm: '0.875rem' },
              padding: { xs: '4px 8px', sm: '6px 12px' }
            }}
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
            size="small"
            sx={{ 
              backgroundColor: 'white', 
              color: 'var(--blue)', 
              boxShadow: 2,
              fontSize: { xs: '0.7rem', sm: '0.875rem' },
              padding: { xs: '4px 8px', sm: '6px 12px' }
            }}
          >
            Ajustează harta
          </Button>
        )}
        
        {/* Toggle Progress Overlay Button */}
        <Button
          variant="outlined"
          onClick={() => setShowProgressOverlay(!showProgressOverlay)}
          size="small"
          disabled={window.innerWidth <= 600 && isPopupOpen} // Only disable on phones when popup is open
          sx={{ 
            backgroundColor: (window.innerWidth <= 600 && isPopupOpen) ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.9)',
            color: (window.innerWidth <= 600 && isPopupOpen) ? 'text.disabled' : 'var(--blue)', 
            borderColor: (window.innerWidth <= 600 && isPopupOpen) ? 'text.disabled' : 'var(--blue)',
            fontSize: { xs: '0.7rem', sm: '0.875rem' },
            padding: { xs: '4px 8px', sm: '6px 12px' },
            minWidth: 'auto'
          }}
          title={window.innerWidth <= 600 && isPopupOpen ? 'Overlay hidden (popup open)' : showProgressOverlay ? 'Hide overlay' : 'Show overlay'}
        >
          {(window.innerWidth <= 600 && isPopupOpen) ? '👁️‍🗨️' : (showProgressOverlay ? '👁️' : '👁️‍🗨️')}
        </Button>

      </Box>





      {/* Map Container */}
    <MapContainer
        center={currentLocationPoint ? [currentLocationPoint.lat, currentLocationPoint.lng] : [currentLocation.lat, currentLocation.lng]}
      zoom={8}
        style={{ 
          height: '80vh', // 80% of viewport height
          width: '100%',
          minHeight: '400px', // Minimum height for very small screens
          maxHeight: '800px'  // Maximum height for large screens
        }}
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Map Click Handler for Coordinate Selection */}
      {(showWaypointForm || editingWaypoint || isCoordinateSelectionMode) ? (
        <MapClickHandler
          onMapClick={(lat, lng) => {
            setFormCoordinates({ lat, lng });
            // If editing a waypoint, update its coordinates
            if (editingWaypoint) {
              setEditingWaypoint({
                ...editingWaypoint,
                coordinates: { lat, lng }
              });
            }
            
            // If in coordinate selection mode, automatically return to form
            if (isCoordinateSelectionMode) {
              setIsCoordinateSelectionMode(false);
              setShowWaypointForm(true);
            }
            
            // console.log('Map clicked for coordinate selection:', { lat, lng });
          }}
        />
      ) : null}

        {/* Progress overlay */}
        {showProgressOverlay && (window.innerWidth > 600 || !isPopupOpen) && (
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
            {/* {precalculatedData && precalculatedData.trackDistances ? ' (Server)' : ' (Client)'} */}
            </Typography>
            
            {/* Run Status Indicator */}
            <Typography variant="caption" color={isRunActive ? "success.main" : "text.disabled"} sx={{ display: 'block', mb: 1 }}>
              {isRunActive ? "Run Active" : "Run Paused"}
              {runTimeline && !isRunActive && " (Outside run period)"}
              {!runTimeline && " (No timeline set)"}
            </Typography>
            
                    <Typography variant="caption" color="text.secondary">
            {trackProgress.completedDistance > 0 ? trackProgress.completedDistance.toFixed(2) : completedDistance.toFixed(2)} / {trackProgress.totalDistance > 0 ? trackProgress.totalDistance.toFixed(2) : '1400'} km
            {/* {precalculatedData && precalculatedData.trackDistances ? ' (Server)' : ' (Client)'} */}
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
            // Use pre-calculated elevation data if available
            let totalElevationGain = 0;
            let completedElevationGain = 0;
            
            if (precalculatedData && precalculatedData.trackDistances && precalculatedData.trackDistances.totalElevationGain) {
              // Use server-calculated elevation data
              totalElevationGain = precalculatedData.trackDistances.totalElevationGain;
              
              // Calculate completed elevation gain based on progress
              if (currentLocationPoint && trackProgress.completedPoints.length > 0) {
                const progressPercentage = trackProgress.progressPercentage;
                completedElevationGain = Math.round(totalElevationGain * (progressPercentage / 100));
              }
            } else {
              // Fallback to client-side calculation
              const allElevations = gpxData.tracks.flatMap(track => track.elevation || []);
              const validElevations = allElevations.filter(elev => typeof elev === 'number' && !isNaN(elev));
              
              if (validElevations.length > 0) {
                // Calculate total elevation gain for the entire trail
                for (let i = 1; i < validElevations.length; i++) {
                  const elevationDiff = validElevations[i] - validElevations[i - 1];
                  if (elevationDiff > 0) {
                    totalElevationGain += elevationDiff;
                  }
                }
                
                // Calculate elevation gain up to current location
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
              }
            }
            
            if (totalElevationGain > 0) {
              return (
                <Typography variant="caption" display="block" color="info.main">
                  Elevație: {completedElevationGain.toFixed(0)}m / {totalElevationGain.toFixed(0)}m ({((completedElevationGain / totalElevationGain) * 100).toFixed(1)}%)
                  {/* {precalculatedData && precalculatedData.trackDistances ? ' (Server)' : ' (Client)'} */}
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
        )}

        {/* GPX Track - Completed portion (orange) */}
        {trackProgress.completedPoints.length > 0 && (
            <Polyline
            key="completed-track"
            positions={trackProgress.completedPoints}
              color="var(--blue)"
            weight={4}
              opacity={0.9}
            eventHandlers={{
              click: (e) => {
                if (isAdmin) {
                  // Find the closest track point to the clicked location
                  const clickedLatLng = e.latlng;
                  let closestPoint = trackProgress.completedPoints[0];
                  let minDistance = Infinity;
                  
                  trackProgress.completedPoints.forEach((point: [number, number]) => {
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
                      background: var(--blue);
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
                  e.target.setStyle({ weight: 6, color: 'var(--blue)' });
                }
              },
              mouseout: (e) => {
                e.target.setStyle({ weight: 4, color: 'var(--blue)' });
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
                  
                  trackProgress.remainingPoints.forEach((point: [number, number]) => {
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
                      background: var(--orange);
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
            icon={L.divIcon({
              html: '<div style="font-size: 24px; text-align: center; line-height: 24px;">🏳️</div>',
              className: 'start-marker',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })}
          >
            <Popup>
            <Box sx={{ 
              minWidth: { xs: 150, sm: 180, md: 200 }, // Responsive width
              maxWidth: { xs: '90vw', sm: '300px', md: '400px' }, // Prevent overflow on mobile
              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } // Responsive font size
            }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
              Putna
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              Începutul traseului Via Transilvanica
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box
                    sx={{
                      backgroundColor: 'var(--blue)',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem'
                    }}
                  >
                    Start
                  </Box>
                </Box>
                                 <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                     <strong>Data de pornire:</strong> {startDate.toLocaleDateString('ro-RO')}
                  </Typography>
                 <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                     <strong>Ora de pornire:</strong> {startTime}
               </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                  Coordonate: {startPoint[0].toFixed(4)}, {startPoint[1].toFixed(4)}
                </Typography>

                                 <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                   <Button
                     size="small"
                     variant="outlined"
                     onClick={() => {
                       const url = `https://www.google.com/maps?q=${startPoint[0].toFixed(4)},${startPoint[1].toFixed(4)}`;
                       window.open(url, '_blank');
                     }}
                     sx={{ 
                       fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.75rem' },
                       padding: { xs: '4px 8px', sm: '6px 12px', md: '6px 12px' }
                     }}
                   >
                     🗺️ Maps
                   </Button>
                   {isAdmin && (
                     <>
                       <Button
                         size="small"
                         variant="outlined"
                         onClick={() => {
                           const newDate = prompt('Data de pornire (YYYY-MM-DD):', startDate.toISOString().split('T')[0]);
                           if (newDate) {
                             setStartDate(new Date(newDate));
                           }
                         }}
                         sx={{ fontSize: '0.75rem' }}
                       >
                         ✏️ Editează Data
                       </Button>
                       <Button
                         size="small"
                         variant="outlined"
                         onClick={() => {
                           const newTime = prompt('Ora de pornire (HH:MM):', startTime);
                           if (newTime && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newTime)) {
                             setStartTime(newTime);
                           }
                         }}
                         sx={{ fontSize: '0.75rem' }}
                       >
                         ✏️ Editează Ora
                       </Button>
                     </>
                   )}
                   </Box>
              </Box>
            </Popup>
          </Marker>
      )}

      {/* End marker */}
          <Marker 
        position={endPoint}
            icon={L.divIcon({
              html: '<div style="font-size: 24px; text-align: center; line-height: 24px;">🏁</div>',
              className: 'destination-marker',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })}
          >
            <Popup>
            <Box sx={{ 
              minWidth: { xs: 150, sm: 180, md: 200 }, // Responsive width
              maxWidth: { xs: '90vw', sm: '300px', md: '400px' }, // Prevent overflow on mobile
              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } // Responsive font size
            }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
              Drobeta-Turnu Severin
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              Sfârșitul traseului Via Transilvanica
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box
                    sx={{
                      backgroundColor: 'var(--orange)',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem'
                    }}
                  >
                    Destinație
                  </Box>
                </Box>
                                 <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                     <strong>Data de sosire:</strong> {finishDate.toLocaleDateString('ro-RO')}
                  </Typography>
                 <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                     <strong>Ora de sosire:</strong> {finishTime}
                  </Typography>
                               {/* Distance and elevation information */}
                 {currentLocationPoint && (
                   <>
                     <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                       <strong>Distanța de la locația curentă:</strong> {calculateDistanceToWaypoint({ lat: endPoint[0], lng: endPoint[1] }).toFixed(1)} km
                     </Typography>
                     <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                       <strong>Urcarea de la locația curentă:</strong> {calculateElevationGain([currentLocationPoint.lat, currentLocationPoint.lng], endPoint).toFixed(0)} m
                     </Typography>
                   </>
                 )}
                 
                 {/* Distance and elevation from last waypoint */}
                 {waypoints.length > 0 && (
                   (() => {
                     const lastWaypoint = waypoints
                       .filter(wp => wp.coordinates && Math.abs(wp.coordinates.lat) > 0.001 && Math.abs(wp.coordinates.lng) > 0.001)
                       .sort((a, b) => {
                         if (!a.coordinates || !b.coordinates) return 0;
                         const distA = calculateTrackDistanceBetweenPoints([a.coordinates.lat, a.coordinates.lng], endPoint);
                         const distB = calculateTrackDistanceBetweenPoints([b.coordinates.lat, b.coordinates.lng], endPoint);
                         return distA - distB;
                       })[0];
                     
                     if (lastWaypoint && lastWaypoint.coordinates) {
                       const distance = calculateTrackDistanceBetweenPoints([lastWaypoint.coordinates.lat, lastWaypoint.coordinates.lng], endPoint);
                       const elevation = calculateElevationGain([lastWaypoint.coordinates.lat, lastWaypoint.coordinates.lng], endPoint);
                       return (
                         <>
                           <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                             <strong>Distanța de la ultimul waypoint ({lastWaypoint.name}):</strong> {distance.toFixed(1)} km
                           </Typography>
                           <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                             <strong>Urcarea de la ultimul waypoint:</strong> {elevation.toFixed(0)} m
                           </Typography>
                         </>
                       );
                     }
                     return null;
                   })()
                 )}
                 
                 <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                   Coordonate: {endPoint[0].toFixed(4)}, {endPoint[1].toFixed(4)}
                 </Typography>

                                 <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                   <Button
                     size="small"
                     variant="outlined"
                     onClick={() => {
                       const url = `https://www.google.com/maps?q=${endPoint[0].toFixed(4)},${endPoint[1].toFixed(4)}`;
                       window.open(url, '_blank');
                     }}
                     sx={{ fontSize: '0.75rem' }}
                   >
                     🗺️ Maps
                   </Button>
                   {isAdmin && (
                     <>
                       <Button
                         size="small"
                         variant="outlined"
                         onClick={() => {
                           const newDate = prompt('Data de sosire (YYYY-MM-DD):', finishDate.toISOString().split('T')[0]);
                           if (newDate) {
                             setFinishDate(new Date(newDate));
                           }
                         }}
                         sx={{ fontSize: '0.75rem' }}
                       >
                         ✏️ Editează Data
                       </Button>
                       <Button
                         size="small"
                         variant="outlined"
                         onClick={() => {
                           const newTime = prompt('Ora de sosire (HH:MM):', finishTime);
                           if (newTime && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newTime)) {
                             setFinishTime(newTime);
                           }
                         }}
                         sx={{ fontSize: '0.75rem' }}
                       >
                         ✏️ Editează Ora
                       </Button>
                     </>
                   )}
                   </Box>
              </Box>
            </Popup>
          </Marker>

        {/* Current location marker from Garmin InReach */}
        {currentLocationPoint && (
        <Marker
            key={`current-location-${currentLocationPoint.timestamp}`}
            position={[currentLocationPoint.lat, currentLocationPoint.lng]}
            icon={L.divIcon({
              html: '<div style="background-color: var(--blue); width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>',
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
          .map((waypoint, index) => {
            const isCompleted = isWaypointCompleted(waypoint);
            const completion = waypointCompletions[waypoint.id];
            
            return (
        <Marker 
            key={`${waypoint.id}-${waypointsTimestamp}`}
            position={[waypoint.coordinates.lat, waypoint.coordinates.lng]}
            icon={L.divIcon({
              html: `<div style="background-color: ${waypoint.type === 'finish-start' ? 'var(--orange)' : '#4ECDC4'}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">${index + 1}</div>`,
              className: 'waypoint-marker',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })}
        >
          <Popup>
              <Box sx={{ 
                minWidth: { xs: 150, sm: 180, md: 200 }, // Responsive width
                maxWidth: { xs: '90vw', sm: '300px', md: '400px' }, // Prevent overflow on mobile
                fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } // Responsive font size
              }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {waypoint.name}
            </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box
                    sx={{
                      backgroundColor: waypoint.type === 'finish-start' ? 'var(--orange)' : '#4ECDC4',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem'
                    }}
                  >
                    {waypoint.type === 'finish-start' ? 'Sosire/Pornire Etapa' : 'Punct Intermediar'}
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
                        <strong>Data de pornire:</strong> {new Date(waypoint.startDate).toLocaleDateString('ro-RO')}
                      </Typography>
                    )}
                    {waypoint.startTime && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                        <strong>Ora de pornire:</strong> {waypoint.startTime}
                      </Typography>
                    )}
                  </Box>
                )}
                
                {/* Completion Status */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: isCompleted ? 'rgba(76, 175, 80, 0.1)' : 'rgba(158, 158, 158, 0.1)',
                    border: `1px solid ${isCompleted ? 'rgba(76, 175, 80, 0.3)' : 'rgba(158, 158, 158, 0.3)'}`
                  }}>
                    <Box sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: isCompleted ? '#4CAF50' : '#9E9E9E'
                    }} />
                    <Typography variant="caption" sx={{ 
                      color: isCompleted ? 'success.main' : 'text.secondary',
                      fontWeight: 'bold'
                    }}>
                      {isCompleted ? '✅ Etapă completată' : '⏳ În așteptare'}
                    </Typography>
                    {completion && completion.completedAt && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
                        {new Date(completion.completedAt).toLocaleDateString('ro-RO')}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Distance Information */}
                {(() => {
                  const distanceInfo = calculateDistanceFromLastWaypoint(index);
                  const isCompleted = isWaypointCompleted(waypoint);
                  
                  return (
                    <>
                      {/* Distance and Elevation from current location - only show if not completed */}
                      {currentLocationPoint && !isCompleted && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontStyle: 'italic' }}>
                            <strong>Distanță de la locația curentă:</strong> {calculateDistanceToWaypoint(waypoint.coordinates).toFixed(2)} km
                          </Typography>
                          {(() => {
                            const elevationGainFromCurrent = calculateElevationGainFromCurrentLocation(waypoint.coordinates);
                            return elevationGainFromCurrent > 0 ? (
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontStyle: 'italic' }}>
                                <strong>Urcare de la locația curentă:</strong> {elevationGainFromCurrent.toFixed(0)} m
                              </Typography>
                            ) : null;
                          })()}
                        </Box>
                      )}
                      
                      {/* Distance and Elevation from previous waypoint or start */}
                      {distanceInfo.distance > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontStyle: 'italic' }}>
                            <strong>Distanță de la {distanceInfo.fromName === 'Start' ? 'start' : `punctul ${distanceInfo.fromName}`}:</strong> {distanceInfo.distance.toFixed(2)} km
                          </Typography>
                          {(() => {
                            const elevationGainFromPrevious = index > 0 
                              ? calculateElevationGain(
                                  [sortedWaypoints[index - 1].coordinates.lat, sortedWaypoints[index - 1].coordinates.lng],
                                  [waypoint.coordinates.lat, waypoint.coordinates.lng]
                                )
                              : calculateElevationGain(
                                  [gpxData?.tracks[0]?.points[0]?.[0] || 0, gpxData?.tracks[0]?.points[0]?.[1] || 0],
                                  [waypoint.coordinates.lat, waypoint.coordinates.lng]
                                );
                            return elevationGainFromPrevious > 0 ? (
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontStyle: 'italic' }}>
                                <strong>Urcare de la {index === 0 ? 'start' : `punctul ${sortedWaypoints[index - 1].name}`}:</strong> {elevationGainFromPrevious.toFixed(0)} m
                              </Typography>
                            ) : null;
                          })()}
                        </Box>
                      )}
                      
                      {/* Show if waypoint has been passed */}
                      {/* {isCompleted && (
                        <Typography variant="caption" sx={{ color: 'success.main', display: 'block', mb: 1, fontStyle: 'italic' }}>
                          ✅ <strong>Etapă completată</strong>
                        </Typography>
                      )} */}
                      

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
                    🗺️ Maps
                  </Button>
                  
                  {isAdmin && (
                    <>
                      <Button
                        size="small"
                        variant="outlined"
                        color={isCompleted ? "warning" : "success"}
                        onClick={async () => {
                          try {
                            if (isCompleted) {
                              await waypointCompletionService.markWaypointIncomplete(waypoint.id);
                            } else if (runTimeline) {
                              await waypointCompletionService.markWaypointCompleted(
                                waypoint.id, 
                                'admin', 
                                runTimeline
                              );
                            }
                            // Refresh waypoint completions
                            const completions = await waypointCompletionService.getWaypointCompletions();
                            setWaypointCompletions(completions);
                          } catch (error) {
                            console.error('Error toggling waypoint completion:', error);
                            alert('Error updating waypoint completion');
                          }
                        }}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        {isCompleted ? '🔄 Marchează ca incomplet' : '✅ Marchează ca complet'}
                      </Button>
                      
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        onClick={() => {
                          // Close the popup when editing
                          const popup = document.querySelector('.leaflet-popup');
                          if (popup) {
                            const closeButton = popup.querySelector('.leaflet-popup-close-button');
                            if (closeButton) {
                              (closeButton as HTMLElement).click();
                            }
                          }
                          handleWaypointEdit(waypoint);
                        }}
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
        );
      })}

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
              id="elevation-chart"
              width="100%"
              height="100%"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ position: 'absolute', top: 0, left: 0 }}
            >
              {/* Gradient definitions - must be defined before use */}
              <defs>
                <linearGradient id="completedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="var(--blue)" stopOpacity="0.1" />
                </linearGradient>
                <linearGradient id="remainingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ff6b35" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ff6b35" stopOpacity="0.1" />
                </linearGradient>
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
                  
                  // Find the closest point to current location for progress calculation
                  let completedIndex = 0;
                  if (currentLocationPoint) {
                    let minDistance = Infinity;
                    allPoints.forEach((point, index) => {
                      const distance = calculateDistance(
                        [currentLocationPoint.lat, currentLocationPoint.lng],
                        point
                      );
                      if (distance < minDistance) {
                        minDistance = distance;
                        completedIndex = index;
                      }
                    });
                  }
                  
                  // Create completed elevation path (green)
                  const completedPoints = validElevations.slice(0, completedIndex + 1).map((elev, index) => {
                    const distancePercent = (cumulativeDistances[index] / totalDistance) * 100;
                    const y = 100 - ((elev - minElev) / (maxElev - minElev)) * 100;
                    return `${distancePercent},${y}`;
                  });
                  
                  // Create remaining elevation path (orange)
                  const remainingPoints = validElevations.slice(completedIndex + 1).map((elev, index) => {
                    const actualIndex = completedIndex + 1 + index;
                    const distancePercent = (cumulativeDistances[actualIndex] / totalDistance) * 100;
                    const y = 100 - ((elev - minElev) / (maxElev - minElev)) * 100;
                    return `${distancePercent},${y}`;
                  });
                  
                  const completedPath = completedPoints.length > 0 ? `M ${completedPoints.join(' L ')}` : '';
                  const remainingPath = remainingPoints.length > 0 ? `M ${remainingPoints.join(' L ')}` : '';
                  
                  return (
                    <>
                      {/* Completed elevation path (orange) */}
                      {completedPath && (
                        <>
                          <path
                            d={completedPath}
                            fill="none"
                            stroke="var(--blue)"
                            strokeWidth="0.3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {/* Fill area under completed path */}
                          <path
                            d={`${completedPath} L ${(cumulativeDistances[completedIndex] / totalDistance) * 100},100 L 0,100 Z`}
                            fill="url(#completedGradient)"
                            opacity="0.3"
                          />
                        </>
                      )}
                      
                      {/* Remaining elevation path (orange) */}
                      {remainingPath && (
                        <>
                          <path
                            d={remainingPath}
                            fill="none"
                            stroke="#ff6b35"
                            strokeWidth="0.3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {/* Fill area under remaining path */}
                          <path
                            d={`${remainingPath} L 100,100 L ${(cumulativeDistances[completedIndex] / totalDistance) * 100},100 Z`}
                            fill="url(#remainingGradient)"
                            opacity="0.3"
                          />
                        </>
                      )}
                    </>
                  );
                }
                return null;
              })()}
              
              {/* Interactive cursor line */}
              <line
                id="elevation-cursor"
                x1="0"
                y1="0"
                x2="0"
                y2="100"
                stroke="var(--blue)"
                strokeWidth="0.25"
                strokeDasharray="2,2"
                opacity="0"
                style={{ pointerEvents: 'none' }}
              />
            </svg>
            
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
                    
                    // Convert percentage to distance
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
        </Paper>
      )}

      {/* Legend */}
      <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption">Pornire</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, backgroundColor: 'var(--blue)', borderRadius: '50%' }} />
          <Typography variant="caption">Locația curentă (Garmin)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption">Sosire</Typography>
        </Box>
        {gpxData && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, backgroundColor: '#ff6b35' }} />
              <Typography variant="caption">GPX Track</Typography>
            </Box>

            {/* Admin-only features */}
            {isAdmin && (
            <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, backgroundColor: '#4caf50' }} />
                <Typography variant="caption">Click Track to Add Waypoint</Typography>
            </Box>
            <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={async () => {
                    if (confirm('ATENȚIE: Această acțiune va șterge TOATE waypoint-urile din baza de date. Ești sigur că vrei să continui?')) {
                        try {
                            await WaypointService.clearAllWaypoints();
                            alert('Baza de date a fost curățată cu succes! Toate waypoint-urile au fost șterse.');
                            // Force refresh
                            window.location.reload();
                        } catch (error) {
                            console.error('Error clearing database:', error);
                            alert('Eroare la curățarea bazei de date. Te rugăm să încerci din nou.');
                        }
                    }
                }}
                sx={{ fontSize: '0.75rem', ml: 2 }}
            >
                Curăță Baza de Date
            </Button>
            </>
            )}
            
          </>
        )}
        
        {/* Test buttons - always visible for testing */}
        {isAdmin && (
          <>
            <Button
                variant="outlined"
                color="primary"
                size="small"
                onClick={testCloudFunctions}
                sx={{ 
                  fontSize: '0.75rem', 
                  ml: 1,
                  borderColor: '#1976d2',
                  color: '#1976d2',
                  '&:hover': {
                    borderColor: '#1565c0',
                    backgroundColor: 'rgba(25, 118, 210, 0.04)'
                  }
                }}
            >
                Test Cloud Functions
            </Button>
            <Button
                variant="outlined"
                color="secondary"
                size="small"
                onClick={async () => {
                    try {
                        if (!gpxData || !waypoints || waypoints.length === 0) {
                            alert('Need GPX data and waypoints to test waypoint calculations');
                            return;
                        }
                        
                        alert(`Calculating waypoint distances on server...\n\nThis may take a while for ${waypoints.length} waypoints.\n\nClick OK to continue.`);
                        
                        // Add timeout to prevent hanging
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Request timed out after 60 seconds')), 60000)
                        );
                        
                        const resultPromise = performanceService.precalculateWaypointDistances(gpxData, waypoints);
                        
                        const result = await Promise.race([resultPromise, timeoutPromise]) as any;
                        
                        alert(`Waypoint calculations complete!\n\nPositions: ${Object.keys(result.waypointPositions).length}\nDistances: ${Object.keys(result.waypointDistances).length}`);
                        console.log('Waypoint calculation result:', result);
                    } catch (error: any) {
                        console.error('Error testing waypoint calculations:', error);
                        if (error.message && error.message.includes('timed out')) {
                            alert('Request timed out. The calculation is taking too long.\n\nThis might be due to:\n- Large number of waypoints (23)\n- Complex GPX track\n- Server load\n\nTry again later or contact support.');
                        } else {
                            alert(`Error testing waypoint calculations:\n${error.message || 'Unknown error'}`);
                        }
                    }
                }}
                sx={{ 
                  fontSize: '0.75rem', 
                  ml: 1,
                  borderColor: '#9c27b0',
                  color: '#9c27b0',
                  '&:hover': {
                    borderColor: '#7b1fa2',
                    backgroundColor: 'rgba(156, 39, 176, 0.04)'
                  }
                }}
            >
                Test Waypoint Calculations
            </Button>
            
            {/* Pre-calculated data status */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                {isLoadingPrecalculatedData ? (
                  <>Loading server data...</>
                ) : precalculatedData ? (
                  <>
                    Server data loaded
                    {precalculatedData.trackDistances?.totalDistance ? ' (Complete)' : ' (Partial)'}
                    {' '}({Object.keys(precalculatedData.waypointDistances || {}).length} distances)
                  </>
                ) : (
                  <>Using client calculations</>
                )}
              </Typography>
            </Box>
            
            {/* Server calculation controls */}
            <Button
                variant="outlined"
                color="info"
                size="small"
                onClick={triggerServerCalculation}
                disabled={isLoadingPrecalculatedData}
                sx={{ 
                  fontSize: '0.75rem', 
                  ml: 1,
                  borderColor: '#0288d1',
                  color: '#0288d1',
                  '&:hover': {
                    borderColor: '#0277bd',
                    backgroundColor: 'rgba(2, 136, 209, 0.04)'
                  }
                }}
            >
                Recalculate on Server
            </Button>
            
            <Button
                variant="outlined"
                color="success"
                size="small"
                onClick={loadPrecalculatedData}
                disabled={isLoadingPrecalculatedData}
                sx={{ 
                  fontSize: '0.75rem', 
                  ml: 1,
                  borderColor: '#388e3c',
                  color: '#388e3c',
                  '&:hover': {
                    borderColor: '#2e7d32',
                    backgroundColor: 'rgba(56, 142, 60, 0.04)'
                  }
                }}
            >
                Refresh Data
            </Button>
            
            <Button
                variant="outlined"
                color="warning"
                size="small"
                onClick={updateServerProgress}
                disabled={!currentLocationPoint || !waypoints.length}
                sx={{ 
                  fontSize: '0.75rem', 
                  ml: 1,
                  borderColor: '#f57c00',
                  color: '#f57c00',
                  '&:hover': {
                    borderColor: '#ef6c00',
                    backgroundColor: 'rgba(245, 124, 0, 0.04)'
                  }
                }}
            >
                Update Progress
            </Button>
            
            <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={loadPrecalculatedData}
                disabled={isLoadingPrecalculatedData}
                sx={{ 
                  fontSize: '0.75rem', 
                  ml: 1,
                  borderColor: '#757575',
                  color: '#757575',
                  '&:hover': {
                    borderColor: '#616161',
                    backgroundColor: 'rgba(117, 117, 117, 0.04)'
                  }
                }}
            >
                Force Load Server Data
            </Button>
            
            <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={async () => {
                    try {
                        if (!gpxData) {
                            alert('Need GPX data to calculate track distances');
                            return;
                        }
                        
                        alert('Calculating track distances on server...\n\nThis will calculate total distance and elevation gain for the entire GPX track.');
                        
                        await performanceService.precalculateTrackDistances(gpxData);
                        
                        // Reload the data after calculation
                        await loadPrecalculatedData();
                        
                        alert('Track distances calculated successfully! The map should now be much faster.');
                    } catch (error: any) {
                        console.error('Error calculating track distances:', error);
                        alert(`Error calculating track distances:\n${error.message || 'Unknown error'}`);
                    }
                }}
                sx={{ 
                  fontSize: '0.75rem', 
                  ml: 1,
                  borderColor: '#d32f2f',
                  color: '#d32f2f',
                  '&:hover': {
                    borderColor: '#c62828',
                    backgroundColor: 'rgba(211, 47, 47, 0.04)'
                  }
                }}
            >
                Calculate Track Data
            </Button>
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
              <Box sx={{ width: 12, height: 12, backgroundColor: 'var(--orange)', borderRadius: '50%' }} />
              <Typography variant="caption">Sosire/Pornire Etapa</Typography>
            </Box>
          </>
        )}
        
        {/* Elevation profile legend */}
        {gpxData && gpxData.tracks.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, backgroundColor: '#ff6b35', borderRadius: '50%' }} />
            <Typography variant="caption">Profil Elevație</Typography>
          </Box>
        )}
        
        {/* Coordinate Selection Mode Indicator */}
        {isCoordinateSelectionMode && (
          <Box sx={{ 
            position: 'absolute', 
            top: 10, 
            left: '50%', 
            transform: 'translateX(-50%)',
            zIndex: 1000,
            bgcolor: 'warning.light', 
            p: 2, 
            borderRadius: 2, 
            boxShadow: 2,
            textAlign: 'center'
          }}>
            <Typography variant="body2" sx={{ color: 'warning.contrastText', mb: 1, fontWeight: 'bold' }}>
              Mod selectare coordonate
            </Typography>
            <Typography variant="caption" sx={{ color: 'warning.contrastText', display: 'block' }}>
              Click pe hartă pentru a selecta coordonatele
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
          setIsCoordinateSelectionMode(false);
        }}
        onSubmit={handleWaypointSubmit}
        initialData={editingWaypoint || undefined}
        coordinates={editingWaypoint?.coordinates || formCoordinates}
        onCoordinateSelect={(coordinates) => {
          // Enter coordinate selection mode
          setIsCoordinateSelectionMode(true);
          setShowWaypointForm(false);
          // Show instructions for coordinate selection
          alert('Formularul a fost ascuns pentru a permite selectarea coordonatelor pe hartă. Click pe hartă pentru a selecta coordonatele, apoi apasă din nou butonul "Selectează de pe hartă" pentru a reveni la formular.');
        }}
      />


    </Box>
  );
};

export default TrailMap; 