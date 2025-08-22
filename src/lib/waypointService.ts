import { ref, set, push, get, remove, onValue, off } from 'firebase/database';
import { database } from './firebase';
import { Waypoint, WaypointFormData } from '../types/waypoint';

export class WaypointService {
  private static readonly WAYPOINTS_REF = 'waypoints';

  // Add a new waypoint
  static async addWaypoint(data: WaypointFormData): Promise<string> {
    try {
      const waypointRef = push(ref(database, this.WAYPOINTS_REF));
      const newWaypoint: Waypoint = {
        id: waypointRef.key!,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'admin' // You can enhance this with actual user ID
      };

      await set(waypointRef, newWaypoint);
      return waypointRef.key!;
    } catch (error) {
      console.error('Error adding waypoint:', error);
      throw new Error('Failed to add waypoint');
    }
  }

  // Update an existing waypoint
  static async updateWaypoint(id: string, data: Partial<WaypointFormData>): Promise<void> {
    try {
      const waypointRef = ref(database, `${this.WAYPOINTS_REF}/${id}`);
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString()
      };

      await set(waypointRef, updateData);
    } catch (error) {
      console.error('Error updating waypoint:', error);
      throw new Error('Failed to update waypoint');
    }
  }

  // Delete a waypoint
  static async deleteWaypoint(id: string): Promise<void> {
    try {
      const waypointRef = ref(database, `${this.WAYPOINTS_REF}/${id}`);
      await remove(waypointRef);
    } catch (error) {
      console.error('Error deleting waypoint:', error);
      throw new Error('Failed to delete waypoint');
    }
  }

  // Get all waypoints
  static async getAllWaypoints(): Promise<Waypoint[]> {
    try {
      const waypointsRef = ref(database, this.WAYPOINTS_REF);
      const snapshot = await get(waypointsRef);
      
      if (snapshot.exists()) {
        const waypoints: Waypoint[] = [];
        snapshot.forEach((childSnapshot) => {
          waypoints.push({
            id: childSnapshot.key!,
            ...childSnapshot.val()
          });
        });
        return waypoints;
      }
      
      return [];
    } catch (error) {
      console.error('Error getting waypoints:', error);
      throw new Error('Failed to get waypoints');
    }
  }

  // Subscribe to waypoints changes
  static subscribeToWaypoints(callback: (waypoints: Waypoint[]) => void): () => void {
    const waypointsRef = ref(database, this.WAYPOINTS_REF);
    
    const unsubscribe = onValue(waypointsRef, (snapshot) => {
      if (snapshot.exists()) {
        const waypoints: Waypoint[] = [];
        snapshot.forEach((childSnapshot) => {
          waypoints.push({
            id: childSnapshot.key!,
            ...childSnapshot.val()
          });
        });
        callback(waypoints);
      } else {
        callback([]);
      }
    });

    return () => off(waypointsRef, 'value', unsubscribe);
  }

  // Get a specific waypoint by ID
  static async getWaypointById(id: string): Promise<Waypoint | null> {
    try {
      const waypointRef = ref(database, `${this.WAYPOINTS_REF}/${id}`);
      const snapshot = await get(waypointRef);
      
      if (snapshot.exists()) {
        return {
          id: snapshot.key!,
          ...snapshot.val()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting waypoint:', error);
      throw new Error('Failed to get waypoint');
    }
  }
}
