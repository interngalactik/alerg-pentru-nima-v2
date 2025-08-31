/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
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
  const dLon = (point2[1] - point1[1]) * Math.PI / 180;  // FIXED: was point2[1] - point2[1]
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

// Test distance calculation function to verify accuracy
export const testDistanceCalculation = onCall(async (request) => {
  try {
    // Test with known coordinates (Bucharest to Cluj-Napoca)
    const bucharest: [number, number] = [44.4268, 26.1025];
    const cluj: [number, number] = [46.7833, 23.6000];
    
    // Calculate distance using our function
    const calculatedDistance = calculateDistance(bucharest, cluj);
    
    // Expected distance is approximately 300-350 km
    const expectedDistance = 320; // Approximate real-world distance
    
    return {
      success: true,
      message: 'Distance calculation test completed',
      test: {
        point1: bucharest,
        point2: cluj,
        calculatedDistance: Math.round(calculatedDistance * 100) / 100,
        expectedDistance,
        difference: Math.round((calculatedDistance - expectedDistance) * 100) / 100,
        isAccurate: Math.abs(calculatedDistance - expectedDistance) < 50 // Within 50km
      },
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



// Function to get pre-calculated waypoint data for instant popup display
export const getPrecalculatedWaypointData = onCall(async (request) => {
  try {
    const { waypointId } = request.data;
    
    if (!waypointId) {
      throw new Error('Missing waypointId');
    }

    const db = admin.database();
    const waypointDataRef = db.ref(`precalculated/waypointData/${waypointId}`);
    
    const snapshot = await waypointDataRef.once('value');
    
    if (snapshot.exists()) {
      return { 
        success: true, 
        data: snapshot.val(),
        message: 'Waypoint data retrieved successfully'
      };
    } else {
      return { 
        success: false, 
        error: 'No pre-calculated data found for this waypoint'
      };
    }

  } catch (error) {
    console.error('Error getting pre-calculated waypoint data:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Function to pre-calculate all waypoint data for instant popup display
export const precalculateAllWaypointData = onCall(async (request) => {
  try {
    const { currentLocation, waypoints, gpxData } = request.data;
    
    if (!currentLocation || !waypoints || !gpxData || !gpxData.tracks || gpxData.tracks.length === 0) {
      throw new Error('Missing required data: currentLocation, waypoints, or gpxData');
    }

    const track = gpxData.tracks[0];
    const points = track.points;
    const elevation = track.elevation || [];
    
    if (points.length === 0) {
      throw new Error('No track points available');
    }

    const db = admin.database();
    const waypointDataRef = db.ref('precalculated/waypointData');
    
    // Calculate data for each waypoint
    const waypointCalculations: Record<string, any> = {};
    
    for (const waypoint of waypoints) {
      const waypointCoords = [waypoint.coordinates.lat, waypoint.coordinates.lng];
      
      // Find closest point on track to waypoint
      let waypointTrackIndex = 0;
      let waypointMinDistance = Infinity;
      
      for (let i = 0; i < points.length; i++) {
        const distance = calculateDistance(waypointCoords as [number, number], points[i]);
        if (distance < waypointMinDistance) {
          waypointMinDistance = distance;
          waypointTrackIndex = i;
        }
      }
      
      // Calculate distance from current location to waypoint along track
      let distanceFromCurrent = 0;
      let elevationGainFromCurrent = 0;
      
      if (currentLocation) {
        // Find closest point on track to current location
        let currentTrackIndex = 0;
        let currentMinDistance = Infinity;
        
        for (let i = 0; i < points.length; i++) {
          const distance = calculateDistance([currentLocation.lat, currentLocation.lng], points[i]);
          if (distance < currentMinDistance) {
            currentMinDistance = distance;
            currentTrackIndex = i;
          }
        }
        
        // Calculate distance along track from current location to waypoint
        if (currentTrackIndex < waypointTrackIndex) {
          for (let i = currentTrackIndex; i < waypointTrackIndex; i++) {
            if (i + 1 < points.length) {
              const lat1 = points[i][0] * Math.PI / 180;
              const lat2 = points[i + 1][0] * Math.PI / 180;
              const dLat = (points[i + 1][0] - points[i][0]) * Math.PI / 180;
              const dLon = (points[i + 1][1] - points[i][1]) * Math.PI / 180;
              
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              distanceFromCurrent += 6371 * c;
            }
          }
        } else if (currentTrackIndex > waypointTrackIndex) {
          for (let i = waypointTrackIndex; i < currentTrackIndex; i++) {
            if (i + 1 < points.length) {
              const lat1 = points[i][0] * Math.PI / 180;
              const lat2 = points[i + 1][0] * Math.PI / 180;
              const dLat = (points[i + 1][0] - points[i][0]) * Math.PI / 180;
              const dLon = (points[i + 1][1] - points[i][1]) * Math.PI / 180;
              
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              distanceFromCurrent += 6371 * c;
            }
          }
        }
        
        // Calculate elevation gain from current location to waypoint
        if (elevation.length > 0 && currentTrackIndex < waypointTrackIndex) {
          for (let i = currentTrackIndex + 1; i <= waypointTrackIndex; i++) {
            if (i < elevation.length && i - 1 < elevation.length) {
              const currentElev = elevation[i];
              const prevElev = elevation[i - 1];
              
              if (typeof currentElev === 'number' && typeof prevElev === 'number' && 
                  !isNaN(currentElev) && !isNaN(prevElev)) {
                const elevationDiff = currentElev - prevElev;
                if (elevationDiff > 0) {
                  elevationGainFromCurrent += elevationDiff;
                }
              }
            }
          }
        }
      }
      
      // Calculate distance from previous waypoint (if not first)
      let distanceFromPrevious = 0;
      let elevationGainFromPrevious = 0;
      
      if (waypoints.indexOf(waypoint) > 0) {
        const previousWaypoint = waypoints[waypoints.indexOf(waypoint) - 1];
        const prevCoords = [previousWaypoint.coordinates.lat, previousWaypoint.coordinates.lng];
        
        // Find closest point on track to previous waypoint
        let prevTrackIndex = 0;
        let prevMinDistance = Infinity;
        
        for (let i = 0; i < points.length; i++) {
          const distance = calculateDistance(prevCoords as [number, number], points[i]);
          if (distance < prevMinDistance) {
            prevMinDistance = distance;
            prevTrackIndex = i;
          }
        }
        
        // Calculate distance along track from previous waypoint to current waypoint
        if (prevTrackIndex < waypointTrackIndex) {
          for (let i = prevTrackIndex; i < waypointTrackIndex; i++) {
            if (i + 1 < points.length) {
              const lat1 = points[i][0] * Math.PI / 180;
              const lat2 = points[i + 1][0] * Math.PI / 180;
              const dLat = (points[i + 1][0] - points[i][0]) * Math.PI / 180;
              const dLon = (points[i + 1][1] - points[i][1]) * Math.PI / 180;
              
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              distanceFromPrevious += 6371 * c;
            }
          }
        }
        
        // Calculate elevation gain from previous waypoint to current waypoint
        if (elevation.length > 0 && prevTrackIndex < waypointTrackIndex) {
          for (let i = prevTrackIndex + 1; i <= waypointTrackIndex; i++) {
            if (i < elevation.length && i - 1 < elevation.length) {
              const currentElev = elevation[i];
              const prevElev = elevation[i - 1];
              
              if (typeof currentElev === 'number' && typeof prevElev === 'number' && 
                  !isNaN(currentElev) && !isNaN(prevElev)) {
                const elevationDiff = currentElev - prevElev;
                if (elevationDiff > 0) {
                  elevationGainFromPrevious += elevationDiff;
                }
              }
            }
          }
        }
      }
      
      // Store calculated data for this waypoint
      waypointCalculations[waypoint.id] = {
        distanceFromCurrent: Math.round(distanceFromCurrent * 100) / 100,
        elevationGainFromCurrent: Math.round(elevationGainFromCurrent),
        distanceFromPrevious: Math.round(distanceFromPrevious * 100) / 100,
        elevationGainFromPrevious: Math.round(elevationGainFromPrevious),
        trackIndex: waypointTrackIndex,
        calculatedAt: Date.now()
      };
    }
    
    // Store all waypoint data in database
    await waypointDataRef.set(waypointCalculations);
    
    return { 
      success: true, 
      data: waypointCalculations,
      message: `Pre-calculated data for ${waypoints.length} waypoints successfully`
    };

  } catch (error) {
    console.error('Error pre-calculating waypoint data:', error);
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

// Calculate complete progress data on server (NEW)
export const calculateProgress = onCall<{
  gpxData: GPXData;
  waypoints: Waypoint[];
  currentLocation: CurrentLocation;
  isRunActive: boolean;
}>(async (request) => {
  try {
    const { gpxData, waypoints, currentLocation, isRunActive } = request.data;
    
    if (!gpxData || !waypoints || !currentLocation) {
      throw new Error('Missing required data');
    }

    if (!isRunActive) {
      return {
        success: true,
        data: {
          completedPoints: [],
          remainingPoints: [],
          completedDistance: 0,
          totalDistance: 0,
          progressPercentage: 0,
          sortedWaypoints: []
        }
      };
    }

    const track = gpxData.tracks[0];
    if (!track || !track.points || track.points.length === 0) {
      throw new Error('Invalid GPX track data');
    }

    const points = track.points;
    
    // Find the closest point on the track to current location
    let closestPointIndex = 0;
    let minDistance = Infinity;

    points.forEach((point, index) => {
      const distance = calculateDistance(
        [currentLocation.lat, currentLocation.lng],
        point
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestPointIndex = index;
      }
    });

    // If current location is more than 5km from the track, don't count progress
    if (minDistance > 5) {
      return {
        success: true,
        data: {
          completedPoints: [],
          remainingPoints: points,
          completedDistance: 0,
          totalDistance: 0,
          progressPercentage: 0,
          sortedWaypoints: []
        }
      };
    }

    // Split track into completed and remaining portions
    const completedPoints = points.slice(0, closestPointIndex + 1);
    const remainingPoints = points.slice(closestPointIndex + 1);
    
    // Calculate completed distance
    let completedDistance = 0;
    for (let i = 1; i < completedPoints.length; i++) {
      completedDistance += calculateDistance(completedPoints[i - 1], completedPoints[i]);
    }
    
    // Calculate total distance
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += calculateDistance(points[i - 1], points[i]);
    }
    
    const progressPercentage = totalDistance > 0 ? (completedDistance / totalDistance) * 100 : 0;

    // Calculate sorted waypoints with track indices
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

    const sortedWaypoints = waypointsWithTrackIndex
      .sort((a, b) => a.trackIndex - b.trackIndex)
      .map(({ trackIndex, ...waypoint }) => waypoint);

    const result = {
      completedPoints,
      remainingPoints,
      completedDistance,
      totalDistance,
      progressPercentage,
      sortedWaypoints
    };

    // Store results in database
    const db = admin.database();
    await db.ref('precalculated/progress').set(result);

    return { success: true, data: result };
  } catch (error) {
    console.error('Error calculating progress:', error);
    throw new HttpsError('internal', 'Failed to calculate progress');
  }
});

// Calculate waypoint distances and elevation gains on server (NEW)
export const calculateWaypointDistances = onCall<{
  gpxData: GPXData;
  waypoints: Waypoint[];
}>(async (request) => {
  try {
    const { gpxData, waypoints } = request.data;
    
    if (!gpxData || !waypoints || waypoints.length === 0) {
      throw new Error('Missing required data');
    }

    const track = gpxData.tracks[0];
    if (!track || !track.points || track.points.length === 0) {
      throw new Error('Invalid GPX track data');
    }

    const points = track.points;
    const elevation = track.elevation || [];
    
    // Calculate distances between all waypoints
    const waypointDistances: Record<string, {
      waypoint1: string;
      waypoint2: string;
      distance: number;
      elevationGain: number;
      calculatedAt: number;
    }> = {};

    for (let i = 0; i < waypoints.length; i++) {
      for (let j = i + 1; j < waypoints.length; j++) {
        const waypoint1 = waypoints[i];
        const waypoint2 = waypoints[j];
        
        // Find closest points on track for both waypoints
        let point1Index = 0;
        let point2Index = 0;
        let minDist1 = Infinity;
        let minDist2 = Infinity;
        
        points.forEach((point, index) => {
          const dist1 = calculateDistance(
            [waypoint1.coordinates.lat, waypoint1.coordinates.lng], 
            point
          );
          const dist2 = calculateDistance(
            [waypoint2.coordinates.lat, waypoint2.coordinates.lng], 
            point
          );
          
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
        for (let k = startIndex; k < endIndex; k++) {
          if (k + 1 < points.length) {
            trackDistance += calculateDistance(points[k], points[k + 1]);
          }
        }
        
        // Calculate elevation gain between these points
        let elevationGain = 0;
        if (elevation.length > 0) {
          for (let k = startIndex + 1; k <= endIndex; k++) {
            if (k < elevation.length && k - 1 < elevation.length) {
              const currentElev = elevation[k];
              const prevElev = elevation[k - 1];
              
              if (typeof currentElev === 'number' && typeof prevElev === 'number' && 
                  !isNaN(currentElev) && !isNaN(prevElev)) {
                const elevationDiff = currentElev - prevElev;
                if (elevationDiff > 0) {
                  elevationGain += elevationDiff;
                }
              }
            }
          }
        }
        
        const key = `${waypoint1.id}-${waypoint2.id}`;
        waypointDistances[key] = {
          waypoint1: waypoint1.id,
          waypoint2: waypoint2.id,
          distance: Math.round(trackDistance * 100) / 100,
          elevationGain: Math.round(elevationGain),
          calculatedAt: Date.now()
        };
      }
    }

    // Store results in database
    const db = admin.database();
    await db.ref('precalculated/waypointDistances').set(waypointDistances);

    return { success: true, data: waypointDistances };
  } catch (error) {
    console.error('Error calculating waypoint distances:', error);
    throw new HttpsError('internal', 'Failed to calculate waypoint distances');
  }
});

// Calculate current location to waypoint distances on server (NEW)
export const calculateCurrentLocationDistances = onCall<{
  gpxData: GPXData;
  waypoints: Waypoint[];
  currentLocation: CurrentLocation;
}>(async (request) => {
  try {
    const { gpxData, waypoints, currentLocation } = request.data;
    
    if (!gpxData || !waypoints || !currentLocation) {
      throw new Error('Missing required data');
    }

    const track = gpxData.tracks[0];
    if (!track || !track.points || track.points.length === 0) {
      throw new Error('Invalid GPX track data');
    }

    const points = track.points;
    const elevation = track.elevation || [];
    
    // Find current location on track
    let currentLocationIndex = 0;
    let currentLocationMinDistance = Infinity;
    
    points.forEach((point, index) => {
      const distance = calculateDistance(
        [currentLocation.lat, currentLocation.lng],
        point
      );
      if (distance < currentLocationMinDistance) {
        currentLocationMinDistance = distance;
        currentLocationIndex = index;
      }
    });
    
    // Calculate distances and elevation gains to all waypoints
    const waypointDistances: Record<string, {
      distanceFromCurrent: number;
      elevationGainFromCurrent: number;
      currentLocationIndex: number;
      waypointIndex: number;
      calculatedAt: number;
    }> = {};

    for (const waypoint of waypoints) {
      // Find closest point on track for waypoint
      let waypointIndex = 0;
      let waypointMinDistance = Infinity;
      
      points.forEach((point, index) => {
        const distance = calculateDistance(
          [waypoint.coordinates.lat, waypoint.coordinates.lng],
          point
        );
        if (distance < waypointMinDistance) {
          waypointMinDistance = distance;
          waypointIndex = index;
        }
      });
      
      // Calculate distance along track from current location to waypoint
      const startIndex = Math.min(currentLocationIndex, waypointIndex);
      const endIndex = Math.max(currentLocationIndex, waypointIndex);
      
      let trackDistance = 0;
      for (let i = startIndex; i < endIndex; i++) {
        if (i + 1 < points.length) {
          trackDistance += calculateDistance(points[i], points[i + 1]);
        }
      }
      
      // Calculate elevation gain along track from current location to waypoint
      let elevationGain = 0;
      if (elevation.length > 0) {
        for (let i = startIndex + 1; i <= endIndex; i++) {
          if (i < elevation.length && i - 1 < elevation.length) {
            const currentElev = elevation[i];
            const prevElev = elevation[i - 1];
            
            if (typeof currentElev === 'number' && typeof prevElev === 'number' && 
                !isNaN(currentElev) && !isNaN(prevElev)) {
              const elevationDiff = currentElev - prevElev;
              if (elevationDiff > 0) {
                elevationGain += elevationDiff;
              }
            }
          }
        }
      }
      
      waypointDistances[waypoint.id] = {
        distanceFromCurrent: Math.round(trackDistance * 100) / 100,
        elevationGainFromCurrent: Math.round(elevationGain),
        currentLocationIndex,
        waypointIndex,
        calculatedAt: Date.now()
      };
    }

    // Store results in database
    const db = admin.database();
    await db.ref('precalculated/currentLocationDistances').set(waypointDistances);

    return { success: true, data: waypointDistances };
  } catch (error) {
    console.error('Error calculating current location distances:', error);
    throw new HttpsError('internal', 'Failed to calculate current location distances');
  }
});
