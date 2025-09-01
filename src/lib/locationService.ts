import { ref, set, get, onValue, off } from 'firebase/database';
import { database } from './firebase';
import { TrailProgress } from './trailProgressService';

export interface LocationPoint {
  id: string;
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
  elevation?: number;
  source?: string;
}



export interface TrailSegment {
  startPoint: [number, number];
  endPoint: [number, number];
  distance: number;
  isCompleted: boolean;
}

export class LocationService {
  private locationsRef = ref(database, 'locations');
  private progressRef = ref(database, 'trailProgress');

  // Add a new location point from Garmin InReach
  async addLocation(location: Omit<LocationPoint, 'id'>): Promise<void> {
    const id = `loc_${Date.now()}`;
    const locationWithId: LocationPoint = { ...location, id };
    
    await set(ref(database, `locations/${id}`), locationWithId);
    
    // Update progress when new location is added
    await this.updateProgress(locationWithId);
  }

  // Get all location points
  async getLocations(): Promise<LocationPoint[]> {
    const snapshot = await get(this.locationsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const locations: LocationPoint[] = Object.values(data || {});
      return locations.sort((a, b) => a.timestamp - b.timestamp);
    }
    return [];
  }

  // Get the latest location point (most recent)
  async getLatestLocation(): Promise<LocationPoint | null> {
    const locations = await this.getLocations();
    return locations.length > 0 ? locations[locations.length - 1] : null;
  }

  // Listen to location updates in real-time
  onLocationsUpdate(callback: (locations: LocationPoint[]) => void): () => void {
    const locationsRef = ref(database, 'locations');
    
    const unsubscribe = onValue(locationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const locations: LocationPoint[] = Object.values(data || {});
        const sortedLocations = locations.sort((a, b) => a.timestamp - b.timestamp);
        callback(sortedLocations);
      } else {
        callback([]);
      }
    });

    return () => off(locationsRef, 'value', unsubscribe);
  }

  // Listen to latest location updates in real-time
  onLatestLocationUpdate(callback: (latestLocation: LocationPoint | null) => void): () => void {
    const locationsRef = ref(database, 'locations');
    
    const unsubscribe = onValue(locationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const locations: LocationPoint[] = Object.values(data || {});
        const sortedLocations = locations.sort((a, b) => a.timestamp - b.timestamp);
        const latest = sortedLocations.length > 0 ? sortedLocations[sortedLocations.length - 1] : null;
        callback(latest);
      } else {
        callback(null);
      }
    });

    return () => off(locationsRef, 'value', unsubscribe);
  }

  // Calculate distance between two points using Haversine formula
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Find the closest point on the trail to a given location
  private findClosestTrailPoint(location: [number, number], trailPoints: [number, number][]): { index: number; distance: number } {
    let closestIndex = 0;
    let minDistance = Infinity;

    trailPoints.forEach((point, index) => {
      const distance = this.calculateDistance(location[0], location[1], point[0], point[1]);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    return { index: closestIndex, distance: minDistance };
  }



  // Update trail progress based on new location
  private async updateProgress(newLocation: LocationPoint): Promise<void> {
    // Progress is now calculated server-side via the webhook
    // This method is kept for backward compatibility
    console.log('Location added, progress will be updated via webhook');
  }

  // Get current trail progress
  async getProgress(): Promise<TrailProgress | null> {
    const snapshot = await get(this.progressRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  }

  // Listen to progress updates in real-time
  onProgressUpdate(callback: (progress: TrailProgress | null) => void): () => void {
    const progressRef = ref(database, 'trailProgress');
    
    const unsubscribe = onValue(progressRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback(null);
      }
    });

    return () => off(progressRef, 'value', unsubscribe);
  }

  // Simulate Garmin InReach location update (for testing)
  async simulateLocationUpdate(lat: number, lng: number): Promise<void> {
    const location: Omit<LocationPoint, 'id'> = {
      lat,
      lng,
      timestamp: Date.now(),
      accuracy: 10, // 10 meter accuracy
      elevation: 0,
      source: 'manual-test'
    };

    await this.addLocation(location);
  }

  // Delete a specific location
  async deleteLocation(id: string): Promise<void> {
    await set(ref(database, `locations/${id}`), null);
  }

  // Clear all progress data
  async clearProgress(): Promise<void> {
    await set(ref(database, 'trailProgress'), null);
  }
}

export const locationService = new LocationService(); 