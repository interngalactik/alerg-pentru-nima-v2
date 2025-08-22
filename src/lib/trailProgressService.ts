import { database } from './firebase';
import { ref, get } from 'firebase/database';
import { parseGPXServer, calculateDistance } from './gpxParserServer';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface LocationPoint {
  id: string;
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
  elevation?: number;
  source?: string;
}

export interface TrailProgress {
  completedDistance: number;
  progressPercentage: number;
  lastLocation: LocationPoint | null;
  completedSegments: TrailSegment[];
  estimatedCompletion?: number | null;
  lastUpdated: number;
}

export interface TrailSegment {
  id: string;
  startPoint: [number, number];
  endPoint: [number, number];
  distance: number;
  isCompleted: boolean;
  completedAt?: number;
}

export interface GPXData {
  tracks: Array<{
    name?: string;
    points: [number, number][];
  }>;
  waypoints: Array<{
    lat: number;
    lng: number;
    name?: string;
  }>;
}

// Cache for GPX data to avoid reloading on every request
let gpxDataCache: GPXData | null = null;
let gpxCacheTimestamp = 0;
const GPX_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Load and cache GPX data from the predefined file
 */
async function loadGPXData(): Promise<GPXData> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (gpxDataCache && (now - gpxCacheTimestamp) < GPX_CACHE_DURATION) {
    return gpxDataCache;
  }

  try {
    // Load the predefined GPX file using Node.js file system
    const gpxPath = join(process.cwd(), 'public', 'gpx', 'via-transilvanica.gpx');
    console.log('Server-side GPX loading - Path:', gpxPath);
    console.log('Server-side GPX loading - Current working directory:', process.cwd());
    
    const gpxContent = readFileSync(gpxPath, 'utf-8');
    console.log('Server-side GPX loading - File size:', gpxContent.length, 'characters');
    
    if (gpxContent.length < 100) {
      throw new Error('GPX file appears to be empty or too small');
    }
    
    const parsed = await parseGPXServer(gpxContent);
    
    // Cache the parsed data
    gpxDataCache = parsed;
    gpxCacheTimestamp = now;
    
    console.log('GPX data loaded and cached:', {
      tracks: parsed.tracks.length,
      totalPoints: parsed.tracks.reduce((sum: number, track: any) => sum + track.points.length, 0)
    });
    
    return parsed;
  } catch (error) {
    console.error('Error loading GPX data:', error);
    
    // Return cached data if available, even if expired
    if (gpxDataCache) {
      console.warn('Using expired GPX cache due to loading error');
      return gpxDataCache;
    }
    
    throw error;
  }
}

/**
 * Find the closest point on the trail to a given location
 */
function findClosestTrailPoint(
  location: [number, number], 
  trailPoints: [number, number][]
): { index: number; distance: number } {
  let closestIndex = 0;
  let minDistance = Infinity;

  for (let i = 0; i < trailPoints.length; i++) {
    const point = trailPoints[i];
    const distance = calculateDistance(location, point);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }

  console.log('Closest trail point found:', {
    location,
    closestIndex,
    closestPoint: trailPoints[closestIndex],
    distance: minDistance.toFixed(6) + 'km'
  });

  return { index: closestIndex, distance: minDistance };
}

/**
 * Calculate completed trail segments based on current location
 */
function calculateCompletedSegments(
  currentLocation: LocationPoint,
  trailPoints: [number, number][]
): TrailSegment[] {
  if (trailPoints.length === 0) {
    return [];
  }

  const closestPoint = findClosestTrailPoint([currentLocation.lat, currentLocation.lng], trailPoints);
  
  // If location is close enough to trail (within 1km), mark segments as completed
  if (closestPoint.distance < 1.0) {
    const completedSegments: TrailSegment[] = [];
    
    // Create segments from start to the closest point
    for (let i = 0; i < closestPoint.index; i++) {
      if (i + 1 < trailPoints.length) {
        const startPoint = trailPoints[i];
        const endPoint = trailPoints[i + 1];
        const distance = calculateDistance(startPoint, endPoint);
        
        completedSegments.push({
          id: `segment_${i}_${i + 1}`,
          startPoint,
          endPoint,
          distance,
          isCompleted: true,
          completedAt: currentLocation.timestamp
        });
      }
    }
    
    console.log('Completed segments calculated:', {
      totalSegments: completedSegments.length,
      closestPointIndex: closestPoint.index,
      distanceToTrail: closestPoint.distance.toFixed(3) + 'km'
    });
    
    return completedSegments;
  }

  console.log('Location too far from trail:', {
    distance: closestPoint.distance.toFixed(3) + 'km',
    threshold: '1.0km'
  });
  
  return [];
}

/**
 * Calculate total completed distance from segments
 */
function calculateCompletedDistance(segments: TrailSegment[]): number {
  return segments.reduce((total, segment) => total + segment.distance, 0);
}

/**
 * Calculate progress percentage based on total trail distance
 */
function calculateProgressPercentage(completedDistance: number, totalDistance: number): number {
  if (totalDistance === 0) return 0;
  return Math.min((completedDistance / totalDistance) * 100, 100);
}

/**
 * Estimate completion time based on current progress
 */
function estimateCompletion(
  completedDistance: number, 
  totalDistance: number, 
  startTime: number
): number | null {
  if (completedDistance === 0 || totalDistance === 0) return null;
  
  const elapsed = Date.now() - startTime;
  const progressRatio = completedDistance / totalDistance;
  const estimatedTotal = elapsed / progressRatio;
  
  return startTime + estimatedTotal;
}

/**
 * Main function to calculate trail progress
 */
export async function calculateTrailProgress(newLocation: LocationPoint): Promise<TrailProgress> {
  try {
    // Load GPX data
    const gpxData = await loadGPXData();
    
    // Get all trail points
    const allTrailPoints = gpxData.tracks.flatMap(track => track.points);
    
    if (allTrailPoints.length === 0) {
      throw new Error('No trail points found in GPX data');
    }
    
    // Calculate total trail distance using a more accurate approach
    // Instead of sampling all points (which inflates distance), use a realistic estimate
    // Via Transilvanica is approximately 1400km
    const totalDistance = 1400; // Use the known actual distance
    
    console.log(`Using known total distance: ${totalDistance}km`);
    
    // Get existing progress to maintain state
    const existingProgress = await getExistingProgress();
    
    // Calculate completed segments
    const completedSegments = calculateCompletedSegments(newLocation, allTrailPoints);
    
    console.log('Server-side segment calculation result:', {
      newLocation: { lat: newLocation.lat, lng: newLocation.lng },
      totalTrailPoints: allTrailPoints.length,
      completedSegmentsCount: completedSegments.length,
      firstCompletedSegment: completedSegments[0] || 'none'
    });
    
    // Calculate completed distance
    const completedDistance = calculateCompletedDistance(completedSegments);
    
    // Calculate progress percentage
    const progressPercentage = calculateProgressPercentage(completedDistance, totalDistance);
    
    // Estimate completion time
    const startTime = existingProgress?.lastUpdated || newLocation.timestamp;
    const estimatedCompletion = estimateCompletion(completedDistance, totalDistance, startTime);
    
    const trailProgress: TrailProgress = {
      completedDistance,
      progressPercentage,
      lastLocation: newLocation,
      completedSegments,
      estimatedCompletion,
      lastUpdated: Date.now()
    };
    
    console.log('Trail progress calculated:', {
      completedDistance: completedDistance.toFixed(2) + 'km',
      totalDistance: totalDistance.toFixed(2) + 'km',
      progressPercentage: progressPercentage.toFixed(1) + '%',
      segmentsCompleted: completedSegments.length
    });
    
    return trailProgress;
    
  } catch (error) {
    console.error('Error calculating trail progress:', error);
    
    // Return minimal progress on error
    return {
      completedDistance: 0,
      progressPercentage: 0,
      lastLocation: newLocation,
      completedSegments: [],
      estimatedCompletion: null,
      lastUpdated: Date.now()
    };
  }
}

/**
 * Get existing progress from database
 */
async function getExistingProgress(): Promise<TrailProgress | null> {
  try {
    const progressRef = ref(database, 'trailProgress');
    const snapshot = await get(progressRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    return null;
  } catch (error) {
    console.error('Error getting existing progress:', error);
    return null;
  }
}

/**
 * Get current trail progress
 */
export async function getCurrentProgress(): Promise<TrailProgress | null> {
  try {
    const progressRef = ref(database, 'trailProgress');
    const snapshot = await get(progressRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    return null;
  } catch (error) {
    console.error('Error getting current progress:', error);
    return null;
  }
}
