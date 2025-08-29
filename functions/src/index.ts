/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Interface for GPX track data
interface GPXTrack {
  points: [number, number][];
  elevation?: number[];
}

interface GPXData {
  tracks: GPXTrack[];
}

interface Waypoint {
  id: string;
  coordinates: { lat: number; lng: number };
  name: string;
  type: string;
}

// Interface for current location
interface CurrentLocation {
  lat: number;
  lng: number;
}

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(point1: [number, number], point2: [number, number]): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (point2[0] - point1[0]) * Math.PI / 180;
  const dLon = (point2[1] - point2[1]) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1[0] * Math.PI / 180) * Math.cos(point2[0] * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper function to calculate elevation gain between two points
function calculateElevationGain(elevation1: number, elevation2: number): number {
  const gain = elevation2 - elevation1;
  return gain > 0 ? gain : 0; // Only positive elevation changes
}

// Simple test function to verify deployment
export const testFunction = onCall(async (request) => {
  try {
    return { 
      success: true, 
      message: 'Cloud Functions are working!',
      timestamp: Date.now()
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Function to pre-calculate track distances and store in database
export const precalculateTrackDistances = onCall(async (request) => {
  try {
    const { gpxData } = request.data;
    
    if (!gpxData || !gpxData.tracks || gpxData.tracks.length === 0) {
      throw new Error('Invalid GPX data');
    }

    const track = gpxData.tracks[0];
    const points = track.points;
    const elevation = track.elevation || [];
    
    if (points.length < 2) {
      throw new Error('Track must have at least 2 points');
    }

    // Calculate total track distance and elevation
    let totalDistance = 0;
    let totalElevationGain = 0;
    const segmentDistances: number[] = [];
    const cumulativeDistances: number[] = [0];
    const segmentElevations: number[] = [];
    
    for (let i = 1; i < points.length; i++) {
      // Distance calculation
      const lat1 = points[i - 1][0] * Math.PI / 180;
      const lat2 = points[i][0] * Math.PI / 180;
      const dLat = (points[i][0] - points[i - 1][0]) * Math.PI / 180;
      const dLon = (points[i][1] - points[i - 1][1]) * Math.PI / 180;
      
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const segmentDistance = 6371 * c; // Earth radius in km
      
      totalDistance += segmentDistance;
      segmentDistances.push(segmentDistance);
      cumulativeDistances.push(totalDistance);
      
      // Elevation calculation
      if (elevation.length > i) {
        const elevationGain = calculateElevationGain(elevation[i - 1], elevation[i]);
        totalElevationGain += elevationGain;
        segmentElevations.push(elevationGain);
      }
    }

    const result = {
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalElevationGain: Math.round(totalElevationGain),
      segmentDistances,
      cumulativeDistances,
      segmentElevations,
      pointCount: points.length,
      calculatedAt: Date.now()
    };

    // Store in Firebase Database
    const db = admin.database();
    await db.ref('precalculated/trackDistances').set(result);

    return { 
      success: true, 
      data: result,
      message: 'Track distances and elevation calculated and stored successfully'
    };

  } catch (error) {
    console.error('Error calculating track distances:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Function to pre-calculate waypoint positions and distances
export const precalculateWaypointDistances = onCall(async (request) => {
  try {
    const { gpxData, waypoints } = request.data;
    
    if (!gpxData || !gpxData.tracks || gpxData.tracks.length === 0) {
      throw new Error('Invalid GPX data');
    }

    if (!waypoints || waypoints.length === 0) {
      throw new Error('No waypoints provided');
    }

    const track = gpxData.tracks[0];
    const points = track.points;
    const elevation = track.elevation || [];
    
    if (points.length < 2) {
      throw new Error('Track must have at least 2 points');
    }

    // Calculate waypoint positions and distances
    const waypointData: Record<string, any> = {};
    const waypointDistances: Record<string, any> = {};
    
    for (const waypoint of waypoints) {
      // Find closest point on track
      let closestIndex = 0;
      let minDistance = Infinity;
      
      for (let i = 0; i < points.length; i++) {
        const distance = calculateDistance(
          [waypoint.coordinates.lat, waypoint.coordinates.lng],
          points[i]
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }

      // Calculate distance from start along track
      let distanceFromStart = 0;
      let elevationFromStart = 0;
      
      for (let i = 1; i <= closestIndex; i++) {
        const lat1 = points[i - 1][0] * Math.PI / 180;
        const lat2 = points[i][0] * Math.PI / 180;
        const dLat = (points[i][0] - points[i - 1][0]) * Math.PI / 180;
        const dLon = (points[i][1] - points[i - 1][1]) * Math.PI / 180;
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distanceFromStart += 6371 * c;
        
        if (elevation.length > i) {
          elevationFromStart += calculateElevationGain(elevation[i - 1], elevation[i]);
        }
      }

      waypointData[waypoint.id] = {
        trackIndex: closestIndex,
        distanceFromStart: Math.round(distanceFromStart * 100) / 100,
        elevationFromStart: Math.round(elevationFromStart),
        closestTrackPoint: points[closestIndex],
        calculatedAt: Date.now()
      };
    }

    // Calculate distances between all waypoints (including sequential pairs)
    const waypointIds = Object.keys(waypointData);
    for (let i = 0; i < waypointIds.length; i++) {
      for (let j = i + 1; j < waypointIds.length; j++) {
        const waypoint1Id = waypointIds[i];
        const waypoint2Id = waypointIds[j];
        
        const pos1 = waypointData[waypoint1Id];
        const pos2 = waypointData[waypoint2Id];
        
        const distance = Math.abs(pos2.distanceFromStart - pos1.distanceFromStart);
        const elevationGain = Math.abs(pos2.elevationFromStart - pos1.elevationFromStart);
        
        // Store both directions for easy lookup
        const key1 = `${waypoint1Id}-${waypoint2Id}`;
        const key2 = `${waypoint2Id}-${waypoint1Id}`;
        
        waypointDistances[key1] = {
          waypoint1: waypoint1Id,
          waypoint2: waypoint2Id,
          distance: Math.round(distance * 100) / 100,
          elevationGain: Math.round(elevationGain),
          calculatedAt: Date.now()
        };
        
        waypointDistances[key2] = {
          waypoint1: waypoint2Id,
          waypoint2: waypoint1Id,
          distance: Math.round(distance * 100) / 100,
          elevationGain: Math.round(elevationGain),
          calculatedAt: Date.now()
        };
      }
    }

    // Store in Firebase Database
    const db = admin.database();
    await db.ref('precalculated/waypointPositions').set(waypointData);
    await db.ref('precalculated/waypointDistances').set(waypointDistances);

    return {
      success: true,
      message: `Pre-calculated data for ${waypoints.length} waypoints`,
      data: {
        waypointPositions: waypointData,
        waypointDistances: waypointDistances
      }
    };
  } catch (error) {
    console.error('Error pre-calculating waypoint distances:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Enhanced function to calculate current location to waypoint data for popups
export const calculatePopupData = onCall(async (request) => {
  try {
    const { gpxData, waypoints, currentLocation } = request.data;
    
    if (!gpxData || !gpxData.tracks || gpxData.tracks.length === 0) {
      throw new Error('Invalid GPX data');
    }

    if (!waypoints || waypoints.length === 0) {
      throw new Error('No waypoints provided');
    }

    if (!currentLocation || !currentLocation.lat || !currentLocation.lng) {
      throw new Error('Invalid current location');
    }

    const track = gpxData.tracks[0];
    const points = track.points;
    const elevation = track.elevation || [];
    
    if (points.length < 2) {
      throw new Error('Track must have at least 2 points');
    }

    // Find current location on track
    let currentLocationIndex = 0;
    let currentLocationMinDistance = Infinity;
    
    for (let i = 0; i < points.length; i++) {
      const distance = calculateDistance(
        [currentLocation.lat, currentLocation.lng],
        points[i]
      );
      if (distance < currentLocationMinDistance) {
        currentLocationMinDistance = distance;
        currentLocationIndex = i;
      }
    }

    // Calculate popup data for each waypoint
    const popupData: Record<string, any> = {};
    
    for (const waypoint of waypoints) {
      // Find waypoint on track
      let waypointIndex = 0;
      let waypointMinDistance = Infinity;
      
      for (let i = 0; i < points.length; i++) {
        const distance = calculateDistance(
          [waypoint.coordinates.lat, waypoint.coordinates.lng],
          points[i]
        );
        
        if (distance < waypointMinDistance) {
          waypointMinDistance = distance;
          waypointIndex = i;
        }
      }

      // Calculate distance from current location to waypoint along track
      let distanceFromCurrent = 0;
      let elevationGainFromCurrent = 0;
      
      const startIndex = Math.min(currentLocationIndex, waypointIndex);
      const endIndex = Math.max(currentLocationIndex, waypointIndex);
      
      for (let i = startIndex + 1; i <= endIndex; i++) {
        const lat1 = points[i - 1][0] * Math.PI / 180;
        const lat2 = points[i][0] * Math.PI / 180;
        const dLat = (points[i][0] - points[i - 1][0]) * Math.PI / 180;
        const dLon = (points[i][1] - points[i - 1][1]) * Math.PI / 180;
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distanceFromCurrent += 6371 * c;
        
        if (elevation.length > i && elevation.length > i - 1) {
          elevationGainFromCurrent += calculateElevationGain(elevation[i - 1], elevation[i]);
        }
      }

      popupData[waypoint.id] = {
        distanceFromCurrent: Math.round(distanceFromCurrent * 100) / 100,
        elevationGainFromCurrent: Math.round(elevationGainFromCurrent),
        currentLocationIndex,
        waypointIndex,
        calculatedAt: Date.now()
      };
    }

    // Store in Firebase Database
    const db = admin.database();
    await db.ref('precalculated/popupData').set(popupData);

    return {
      success: true,
      message: `Calculated popup data for ${waypoints.length} waypoints`,
      data: popupData
    };
  } catch (error) {
    console.error('Error calculating popup data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Function to get pre-calculated data
export const getPrecalculatedData = onCall(async (request) => {
  try {
    const { type = 'all' } = request.data;
    
    const db = admin.database();
    let result: any = {};

    if (type === 'all' || type === 'trackDistances') {
      const trackData = await db.ref('precalculated/trackDistances').once('value');
      result.trackDistances = trackData.val();
    }

    if (type === 'all' || type === 'waypointPositions') {
      const waypointData = await db.ref('precalculated/waypointPositions').once('value');
      result.waypointPositions = waypointData.val();
    }

    if (type === 'all' || type === 'waypointDistances') {
      const waypointDistances = await db.ref('precalculated/waypointDistances').once('value');
      result.waypointDistances = waypointDistances.val();
    }

    return { 
      success: true, 
      data: result
    };

  } catch (error) {
    console.error('Error getting pre-calculated data:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Function to calculate real-time progress (called every 10 minutes)
export const updateProgress = onCall(async (request) => {
  try {
    const { currentLocation, nextWaypointId, gpxData } = request.data;
    
    if (!currentLocation || !nextWaypointId || !gpxData) {
      throw new Error('Missing required data: currentLocation, nextWaypointId, or gpxData');
    }

    const track = gpxData.tracks[0];
    const points = track.points;
    
    // Find closest point on track for current location
    let currentLocationIndex = 0;
    let minDistance = Infinity;
    
    for (let i = 0; i < points.length; i++) {
      const distance = calculateDistance(
        [currentLocation.lat, currentLocation.lng],
        points[i]
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        currentLocationIndex = i;
      }
    }

    // Get pre-calculated waypoint position
    const db = admin.database();
    const waypointData = await db.ref('precalculated/waypointPositions').once('value');
    const waypointPositions = waypointData.val();
    
    if (!waypointPositions || !waypointPositions[nextWaypointId]) {
      throw new Error('Waypoint position not found. Please recalculate waypoints first.');
    }

    const nextWaypointPos = waypointPositions[nextWaypointId];
    
    // Calculate distance from current location to next waypoint
    let distanceToNextWaypoint = 0;
    if (currentLocationIndex < nextWaypointPos.trackIndex) {
      // Current location is before next waypoint
      for (let i = currentLocationIndex; i < nextWaypointPos.trackIndex; i++) {
        const lat1 = points[i][0] * Math.PI / 180;
        const lat2 = points[i + 1][0] * Math.PI / 180;
        const dLat = (points[i + 1][0] - points[i][0]) * Math.PI / 180;
        const dLon = (points[i + 1][1] - points[i][1]) * Math.PI / 180;
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distanceToNextWaypoint += 6371 * c;
      }
    } else {
      // Current location is after next waypoint
      distanceToNextWaypoint = 0;
    }

    const progressData = {
      currentLocationIndex,
      distanceToNextWaypoint: Math.round(distanceToNextWaypoint * 100) / 100,
      nextWaypointId,
      calculatedAt: Date.now()
    };

    // Store progress in database
    await db.ref('progress/current').set(progressData);

    return { 
      success: true, 
      data: progressData,
      message: 'Progress updated successfully'
    };

  } catch (error) {
    console.error('Error updating progress:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Function to recalculate everything when data changes
export const recalculateAll = onCall(async (request) => {
  try {
    const { gpxData, waypoints } = request.data;
    
    if (!gpxData || !waypoints) {
      throw new Error('Missing required data: gpxData or waypoints');
    }

    // Calculate track distances directly
    const track = gpxData.tracks[0];
    const points = track.points;
    const elevation = track.elevation || [];
    
    let totalDistance = 0;
    let totalElevationGain = 0;
    const segmentDistances: number[] = [];
    const cumulativeDistances: number[] = [0];
    const segmentElevations: number[] = [];
    
    for (let i = 1; i < points.length; i++) {
      const lat1 = points[i - 1][0] * Math.PI / 180;
      const lat2 = points[i][0] * Math.PI / 180;
      const dLat = (points[i][0] - points[i - 1][0]) * Math.PI / 180;
      const dLon = (points[i][1] - points[i - 1][1]) * Math.PI / 180;
      
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const segmentDistance = 6371 * c;
      
      totalDistance += segmentDistance;
      segmentDistances.push(segmentDistance);
      cumulativeDistances.push(totalDistance);
      
      if (elevation.length > i) {
        const elevationGain = calculateElevationGain(elevation[i - 1], elevation[i]);
        totalElevationGain += elevationGain;
        segmentElevations.push(elevationGain);
      }
    }

    const trackResult = {
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalElevationGain: Math.round(totalElevationGain),
      segmentDistances,
      cumulativeDistances,
      segmentElevations,
      pointCount: points.length,
      calculatedAt: Date.now()
    };

    // Calculate waypoint positions and distances directly
    const waypointData: Record<string, any> = {};
    const waypointDistances: Record<string, any> = {};
    
    for (const waypoint of waypoints) {
      let closestIndex = 0;
      let minDistance = Infinity;
      
      for (let i = 0; i < points.length; i++) {
        const distance = calculateDistance(
          [waypoint.coordinates.lat, waypoint.coordinates.lng],
          points[i]
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }

      let distanceFromStart = 0;
      let elevationFromStart = 0;
      
      for (let i = 1; i <= closestIndex; i++) {
        const lat1 = points[i - 1][0] * Math.PI / 180;
        const lat2 = points[i][0] * Math.PI / 180;
        const dLat = (points[i][0] - points[i - 1][0]) * Math.PI / 180;
        const dLon = (points[i][1] - points[i - 1][1]) * Math.PI / 180;
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distanceFromStart += 6371 * c;
        
        if (elevation.length > i) {
          elevationFromStart += calculateElevationGain(elevation[i - 1], elevation[i]);
        }
      }

      waypointData[waypoint.id] = {
        trackIndex: closestIndex,
        distanceFromStart: Math.round(distanceFromStart * 100) / 100,
        elevationFromStart: Math.round(elevationFromStart),
        closestTrackPoint: points[closestIndex],
        calculatedAt: Date.now()
      };
    }

    // Calculate distances between all waypoints
    const waypointIds = Object.keys(waypointData);
    for (let i = 0; i < waypointIds.length; i++) {
      for (let j = i + 1; j < waypointIds.length; j++) {
        const waypoint1Id = waypointIds[i];
        const waypoint2Id = waypointIds[j];
        
        const pos1 = waypointData[waypoint1Id];
        const pos2 = waypointData[waypoint2Id];
        
        const distance = Math.abs(pos2.distanceFromStart - pos1.distanceFromStart);
        const elevationGain = Math.abs(pos2.elevationFromStart - pos1.elevationFromStart);
        
        const key = `${waypoint1Id}_${waypoint2Id}`;
        waypointDistances[key] = {
          waypoint1: waypoint1Id,
          waypoint2: waypoint2Id,
          distance: Math.round(distance * 100) / 100,
          elevationGain: Math.round(elevationGain),
          calculatedAt: Date.now()
        };
      }
    }

    // Store everything in Firebase Database
    const db = admin.database();
    await db.ref('precalculated/trackDistances').set(trackResult);
    await db.ref('precalculated/waypointPositions').set(waypointData);
    await db.ref('precalculated/waypointDistances').set(waypointDistances);

    return { 
      success: true, 
      message: 'All data recalculated successfully',
      trackDistances: trackResult,
      waypointData: {
        waypointPositions: waypointData,
        waypointDistances: waypointDistances
      }
    };

  } catch (error) {
    console.error('Error recalculating all data:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});
