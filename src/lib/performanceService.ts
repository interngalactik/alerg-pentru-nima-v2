import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDatabase, ref, get, set } from 'firebase/database';
import app from './firebase';

// Initialize Firebase Functions
const functions = getFunctions(app);
const database = getDatabase(app);

// Cloud Function references - now using all the deployed functions
const testFunction = httpsCallable(functions, 'testFunction');
const precalculateTrackDistances = httpsCallable(functions, 'precalculateTrackDistances');
const precalculateWaypointDistances = httpsCallable(functions, 'precalculateWaypointDistances');
const getPrecalculatedData = httpsCallable(functions, 'getPrecalculatedData');
const updateProgress = httpsCallable(functions, 'updateProgress');
const recalculateAll = httpsCallable(functions, 'recalculateAll');
const calculatePopupData = httpsCallable(functions, 'calculatePopupData');
const calculateProgress = httpsCallable(functions, 'calculateProgress');
const calculateWaypointDistances = httpsCallable(functions, 'calculateWaypointDistances');
const calculateCurrentLocationDistances = httpsCallable(functions, 'calculateCurrentLocationDistances');
const precalculateAllWaypointData = httpsCallable(functions, 'precalculateAllWaypointData');
const getPrecalculatedWaypointData = httpsCallable(functions, 'getPrecalculatedWaypointData');

export interface PrecalculatedTrackData {
  totalDistance: number;
  totalElevationGain: number;
  segmentDistances: number[];
  cumulativeDistances: number[];
  segmentElevations: number[];
  pointCount: number;
  calculatedAt: number;
}

export interface PrecalculatedWaypointData {
  trackIndex: number;
  distanceFromStart: number;
  elevationFromStart: number;
  closestTrackPoint: [number, number];
  calculatedAt: number;
}

export interface WaypointDistanceData {
  waypoint1: string;
  waypoint2: string;
  distance: number;
  elevationGain: number;
  calculatedAt: number;
}

export interface PopupData {
  distanceFromCurrent: number;
  elevationGainFromCurrent: number;
  currentLocationIndex: number;
  waypointIndex: number;
  calculatedAt: number;
}

export interface ProgressData {
  currentLocationIndex: number;
  distanceToNextWaypoint: number;
  nextWaypointId: string;
  calculatedAt: number;
}

export interface ServerProgressData {
  completedPoints: [number, number][];
  remainingPoints: [number, number][];
  completedDistance: number;
  totalDistance: number;
  progressPercentage: number;
  sortedWaypoints: any[];
}

export interface PrecalculatedData {
  trackDistances?: PrecalculatedTrackData;
  waypointPositions?: Record<string, PrecalculatedWaypointData>;
  waypointDistances?: Record<string, WaypointDistanceData>;
  popupData?: Record<string, PopupData>;
}

export class PerformanceService {
  private static instance: PerformanceService;
  private cache: Map<string, any> = new Map();
  private cacheTimeout = 15 * 60 * 1000; // Increased from 5 minutes to 15 minutes for better performance

  private constructor() {}

  static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService();
    }
    return PerformanceService.instance;
  }

  // Test Cloud Functions connection
  async testConnection(): Promise<boolean> {
    try {
      const result = await testFunction({});
      const data = result.data as any;
      console.log('Cloud Functions test result:', data);
      return data.success === true;
    } catch (error) {
      console.error('Error testing Cloud Functions connection:', error);
      return false;
    }
  }

  // Pre-calculate track distances on server
  async precalculateTrackDistances(gpxData: any): Promise<PrecalculatedTrackData> {
    try {
      const result = await precalculateTrackDistances({ gpxData });
      const data = result.data as any;
      
      if (data.success) {
        // Cache the result locally
        this.cache.set('trackDistances', {
          data: data.data,
          timestamp: Date.now()
        });
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to pre-calculate track distances');
      }
    } catch (error) {
      console.error('Error pre-calculating track distances:', error);
      throw error;
    }
  }

  // Pre-calculate waypoint distances on server
  async precalculateWaypointDistances(gpxData: any, waypoints: any[]): Promise<any> {
    try {
      const result = await precalculateWaypointDistances({ gpxData, waypoints });
      const data = result.data as any;
      
      if (data.success) {
        // Cache the result locally
        this.cache.set('waypointDistances', {
          data: data.data,
          timestamp: Date.now()
        });
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to pre-calculate waypoint distances');
      }
    } catch (error) {
      console.error('Error pre-calculating waypoint distances:', error);
      throw error;
    }
  }

  // Calculate popup data for waypoints (current location to waypoint distances)
  async calculatePopupData(gpxData: any, waypoints: any[], currentLocation: any): Promise<any> {
    try {
      const result = await calculatePopupData({ gpxData, waypoints, currentLocation });
      const data = result.data as any;
      
      if (data.success) {
        // Cache the result locally
        this.cache.set('popupData', {
          data: data.data,
          timestamp: Date.now()
        });
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to calculate popup data');
      }
    } catch (error) {
      console.error('Error calculating popup data:', error);
      throw error;
    }
  }

    // Calculate complete progress data on server (NEW)
  async calculateProgress(gpxData: any, waypoints: any[], currentLocation: any, isRunActive: boolean): Promise<ServerProgressData> {
    try {
      const result = await calculateProgress({ gpxData, waypoints, currentLocation, isRunActive });
      const data = result.data as any;
      
      if (data.success) {
        // Cache the result locally
        this.cache.set('progress', {
          data: data.data,
          timestamp: Date.now()
        });
        
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to calculate progress');
      }
    } catch (error: any) {
      console.error('Error calculating progress:', error);
      throw error;
    }
  }

  // Calculate waypoint distances on server (NEW)
  async calculateWaypointDistances(gpxData: any, waypoints: any[]): Promise<Record<string, any>> {
    try {
      const result = await calculateWaypointDistances({ gpxData, waypoints });
      const data = result.data as any;
      
      if (data.success) {
        // Cache the result locally
        this.cache.set('waypointDistances', {
          data: data.data,
          timestamp: Date.now()
        });
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to calculate waypoint distances');
      }
    } catch (error) {
      console.error('Error calculating waypoint distances:', error);
      throw error;
    }
  }

  // Pre-calculate all waypoint data for instant popup display (NEW)
  async precalculateAllWaypointData(currentLocation: any, waypoints: any[], gpxData: any): Promise<any> {
    try {
      const result = await precalculateAllWaypointData({ currentLocation, waypoints, gpxData });
      const data = result.data as any;
      
      if (data.success) {
        // Cache the result locally
        this.cache.set('allWaypointData', {
          data: data.data,
          timestamp: Date.now()
        });
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to pre-calculate waypoint data');
      }
    } catch (error) {
      console.error('Error pre-calculating waypoint data:', error);
      throw error;
    }
  }

  // Get pre-calculated waypoint data for instant popup display (NEW)
  async getPrecalculatedWaypointData(waypointId: string): Promise<any> {
    try {
      const result = await getPrecalculatedWaypointData({ waypointId });
      const data = result.data as any;
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to get pre-calculated waypoint data');
      }
    } catch (error) {
      console.error('Error getting pre-calculated waypoint data:', error);
      throw error;
    }
  }

  // Calculate current location to waypoint distances on server (NEW)
  async calculateCurrentLocationDistances(gpxData: any, waypoints: any[], currentLocation: any): Promise<Record<string, any>> {
    try {
      const result = await calculateCurrentLocationDistances({ gpxData, waypoints, currentLocation });
      const data = result.data as any;
      
      if (data.success) {
        // Cache the result locally
        this.cache.set('currentLocationDistances', {
          data: data.data,
          timestamp: Date.now()
        });
        
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to calculate current location distances');
      }
    } catch (error: any) {
      console.error('Error calculating current location distances:', error);
      throw error;
    }
  }

  // Get pre-calculated data (from cache or server)
  async getPrecalculatedData(type: 'trackDistances' | 'waypointPositions' | 'waypointDistances' | 'all' = 'all'): Promise<PrecalculatedData> {
    try {
      // First try to get from local cache
      const cachedData = this.getCachedData(type);
      if (cachedData && Object.keys(cachedData).length > 0) {
        return cachedData;
      }

      // If not in cache, get from server
      const result = await getPrecalculatedData({ type });
      const data = result.data as any;
      
      if (data.success) {
        // Cache the results locally
        if (data.data.trackDistances) {
          this.cache.set('trackDistances', {
            data: data.data.trackDistances,
            timestamp: Date.now()
          });
        }
        if (data.data.waypointPositions) {
          this.cache.set('waypointPositions', {
            data: data.data.waypointPositions,
            timestamp: Date.now()
          });
        }
        if (data.data.waypointDistances) {
          this.cache.set('waypointDistances', {
            data: data.data.waypointDistances,
            timestamp: Date.now()
          });
        }
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to get pre-calculated data');
      }
    } catch (error) {
      console.error('Error getting pre-calculated data:', error);
      throw error;
    }
  }

  // Update real-time progress (called every 10 minutes)
  async updateProgress(currentLocation: { lat: number; lng: number }, nextWaypointId: string, gpxData: any): Promise<ProgressData> {
    try {
      const result = await updateProgress({ currentLocation, nextWaypointId, gpxData });
      const data = result.data as any;
      
      if (data.success) {
        // Cache the progress result
        this.cache.set('currentProgress', {
          data: data.data,
          timestamp: Date.now()
        });
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to update progress');
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  }

  // Recalculate everything on server
  async recalculateAll(gpxData: any, waypoints: any[]): Promise<PrecalculatedData> {
    try {
      const result = await recalculateAll({ gpxData, waypoints });
      const data = result.data as any;
      
      if (data.success) {
        // Clear cache and update with new data
        this.cache.clear();
        
        // Cache the new results
        if (data.trackDistances) {
          this.cache.set('trackDistances', {
            data: data.trackDistances,
            timestamp: Date.now()
          });
        }
        if (data.waypointData?.waypointPositions) {
          this.cache.set('waypointPositions', {
            data: data.waypointData.waypointPositions,
            timestamp: Date.now()
          });
        }
        if (data.waypointData?.waypointDistances) {
          this.cache.set('waypointDistances', {
            data: data.waypointData.waypointDistances,
            timestamp: Date.now()
          });
        }
        
        return {
          trackDistances: data.trackDistances,
          waypointPositions: data.waypointData?.waypointPositions,
          waypointDistances: data.waypointData?.waypointDistances
        };
      } else {
        throw new Error(data.error || 'Failed to recalculate all data');
      }
    } catch (error) {
      console.error('Error recalculating all data:', error);
      throw error;
    }
  }

  // Get cached data if it's still valid
  private getCachedData(type: 'trackDistances' | 'waypointPositions' | 'waypointDistances' | 'all'): PrecalculatedData | null {
    const now = Date.now();
    const result: PrecalculatedData = {};

    if (type === 'all' || type === 'trackDistances') {
      const cached = this.cache.get('trackDistances');
      if (cached && (now - cached.timestamp) < this.cacheTimeout) {
        result.trackDistances = cached.data;
      }
    }

    if (type === 'all' || type === 'waypointPositions') {
      const cached = this.cache.get('waypointPositions');
      if (cached && (now - cached.timestamp) < this.cacheTimeout) {
        result.waypointPositions = cached.data;
      }
    }

    if (type === 'all' || type === 'waypointDistances') {
      const cached = this.cache.get('waypointDistances');
      if (cached && (now - cached.timestamp) < this.cacheTimeout) {
        result.waypointDistances = cached.data;
      }
    }

    // Only return if we have data for the requested type
    if (type === 'all') {
      return (result.trackDistances && result.waypointPositions && result.waypointDistances) ? result : null;
    } else if (type === 'trackDistances') {
      return result.trackDistances ? result : null;
    } else if (type === 'waypointPositions') {
      return result.waypointPositions ? result : null;
    } else {
      return result.waypointDistances ? result : null;
    }
  }

  // Clear local cache
  clearCache(): void {
    this.cache.clear();
  }

  // Check if data needs recalculation
  needsRecalculation(type: 'trackDistances' | 'waypointPositions' | 'waypointDistances' | 'all' = 'all'): boolean {
    const cached = this.getCachedData(type);
    if (type === 'all') {
      return !cached || !cached.trackDistances || !cached.waypointPositions || !cached.waypointDistances;
    } else if (type === 'trackDistances') {
      return !cached || !cached.trackDistances;
    } else if (type === 'waypointPositions') {
      return !cached || !cached.waypointPositions;
    } else {
      return !cached || !cached.waypointDistances;
    }
  }

  // Get total track distance from pre-calculated data
  async getTotalTrackDistance(): Promise<number> {
    try {
      const data = await this.getPrecalculatedData('trackDistances');
      return data.trackDistances?.totalDistance || 0;
    } catch (error) {
      console.error('Error getting total track distance:', error);
      return 0;
    }
  }

  // Get total elevation gain from pre-calculated data
  async getTotalElevationGain(): Promise<number> {
    try {
      const data = await this.getPrecalculatedData('trackDistances');
      return data.trackDistances?.totalElevationGain || 0;
    } catch (error) {
      console.error('Error getting total elevation gain:', error);
      return 0;
    }
  }

  // Get waypoint position from pre-calculated data
  async getWaypointPosition(waypointId: string): Promise<PrecalculatedWaypointData | null> {
    try {
      const data = await this.getPrecalculatedData('waypointPositions');
      return data.waypointPositions?.[waypointId] || null;
    } catch (error) {
      console.error('Error getting waypoint position:', error);
      return null;
    }
  }

  // Get distance between two waypoints
  async getWaypointDistance(waypoint1Id: string, waypoint2Id: string): Promise<WaypointDistanceData | null> {
    try {
      const data = await this.getPrecalculatedData('waypointDistances');
      const key1 = `${waypoint1Id}_${waypoint2Id}`;
      const key2 = `${waypoint2Id}_${waypoint1Id}`;
      
      return data.waypointDistances?.[key1] || data.waypointDistances?.[key2] || null;
    } catch (error) {
      console.error('Error getting waypoint distance:', error);
      return null;
    }
  }

  // Get current progress data
  async getCurrentProgress(): Promise<ProgressData | null> {
    try {
      const cached = this.cache.get('currentProgress');
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        return cached.data;
      }
      return null;
    } catch (error) {
      console.error('Error getting current progress:', error);
      return null;
    }
  }
}

// Export singleton instance
export const performanceService = PerformanceService.getInstance();
