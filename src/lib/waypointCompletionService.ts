import { ref, set, get, onValue } from 'firebase/database';
import { database } from './firebase';
import { Waypoint } from '../types/waypoint';
import { runTimelineService } from './runTimelineService';

export interface WaypointCompletion {
  waypointId: string;
  isCompleted: boolean;
  completedAt: number;
  completedBy: string;
  runPeriod: string; // Which run period this completion belongs to
}

export class WaypointCompletionService {
  private static instance: WaypointCompletionService;
  
  private constructor() {}
  
  public static getInstance(): WaypointCompletionService {
    if (!WaypointCompletionService.instance) {
      WaypointCompletionService.instance = new WaypointCompletionService();
    }
    return WaypointCompletionService.instance;
  }

  /**
   * Check if a waypoint should be marked as completed based on current location and run timeline
   */
  async checkWaypointCompletion(
    waypoint: Waypoint, 
    currentLocation: { lat: number; lng: number },
    runTimeline: { startDate: string; finishDate: string; startTime: string; finishTime: string }
  ): Promise<boolean> {
    // If no run timeline, no waypoints can be completed
    if (!runTimeline) {
      return false;
    }

    // Check if we're currently in the run period
    const isRunActive = runTimelineService.isRunActive({
      ...runTimeline,
      updatedAt: new Date().toISOString()
    });
    
    // If run is not active, no new completions
    if (!isRunActive) {
      return false;
    }

    // If waypoint is already completed, don't change it
    if (waypoint.isCompleted) {
      return true;
    }

    // TODO: Implement location-based completion logic
    // For now, return false - this will be implemented in the next step
    return false;
  }

  /**
   * Mark a waypoint as completed
   */
  async markWaypointCompleted(
    waypointId: string, 
    completedBy: string,
    runTimeline: { startDate: string; finishDate: string; startTime: string; finishTime: string }
  ): Promise<void> {
    try {
      const waypointRef = ref(database, `waypoints/${waypointId}`);
      const snapshot = await get(waypointRef);
      
      if (!snapshot.exists()) {
        throw new Error('Waypoint not found');
      }

      const waypoint = snapshot.val();
      const now = Date.now();
      
      // Update waypoint with completion info
      await set(waypointRef, {
        ...waypoint,
        isCompleted: true,
        completedAt: now,
        completedBy: completedBy,
        updatedAt: now
      });

      // Also store in completions collection for tracking
      const completionRef = ref(database, `waypointCompletions/${waypointId}`);
      const completion: WaypointCompletion = {
        waypointId,
        isCompleted: true,
        completedAt: now,
        completedBy,
        runPeriod: `${runTimeline.startDate}_${runTimeline.finishDate}`
      };

      await set(completionRef, completion);

      console.log(`✅ Waypoint ${waypoint.name} marked as completed`);
    } catch (error) {
      console.error('❌ Error marking waypoint as completed:', error);
      throw error;
    }
  }

  /**
   * Mark a waypoint as not completed
   */
  async markWaypointIncomplete(waypointId: string): Promise<void> {
    try {
      const waypointRef = ref(database, `waypoints/${waypointId}`);
      const snapshot = await get(waypointRef);
      
      if (!snapshot.exists()) {
        throw new Error('Waypoint not found');
      }

      const waypoint = snapshot.val();
      const now = Date.now();
      
      // Update waypoint to remove completion
      await set(waypointRef, {
        ...waypoint,
        isCompleted: false,
        completedAt: null,
        completedBy: null,
        updatedAt: now
      });

      // Remove from completions collection
      const completionRef = ref(database, `waypointCompletions/${waypointId}`);
      await set(completionRef, null);

      console.log(`🔄 Waypoint ${waypoint.name} marked as incomplete`);
    } catch (error) {
      console.error('❌ Error marking waypoint as incomplete:', error);
      throw error;
    }
  }

  /**
   * Get completion status for all waypoints
   */
  async getWaypointCompletions(): Promise<Record<string, WaypointCompletion>> {
    try {
      const completionsRef = ref(database, 'waypointCompletions');
      const snapshot = await get(completionsRef);
      
      if (snapshot.exists()) {
        return snapshot.val();
      }
      
      return {};
    } catch (error) {
      console.error('❌ Error getting waypoint completions:', error);
      return {};
    }
  }

  /**
   * Clear all waypoint completions (useful when setting new run timeline)
   */
  async clearAllCompletions(): Promise<void> {
    try {
      // Get all waypoints
      const waypointsRef = ref(database, 'waypoints');
      const snapshot = await get(waypointsRef);
      
      if (snapshot.exists()) {
        const waypoints = snapshot.val();
        const updates: Promise<void>[] = [];
        
        // Update each waypoint to remove completion
        Object.keys(waypoints).forEach(waypointId => {
          const waypoint = waypoints[waypointId];
          if (waypoint.isCompleted) {
            const waypointRef = ref(database, `waypoints/${waypointId}`);
            updates.push(set(waypointRef, {
              ...waypoint,
              isCompleted: false,
              completedAt: null,
              completedBy: null,
              updatedAt: Date.now()
            }));
          }
        });
        
        // Clear completions collection
        const completionsRef = ref(database, 'waypointCompletions');
        updates.push(set(completionsRef, null));
        
        await Promise.all(updates);
        console.log('✅ All waypoint completions cleared');
      }
    } catch (error) {
      console.error('❌ Error clearing waypoint completions:', error);
      throw error;
    }
  }

  /**
   * Listen for completion updates
   */
  onCompletionsUpdate(callback: (completions: Record<string, WaypointCompletion>) => void) {
    const completionsRef = ref(database, 'waypointCompletions');
    
    const unsubscribe = onValue(completionsRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback({});
      }
    });
    
    return unsubscribe;
  }
}

export const waypointCompletionService = WaypointCompletionService.getInstance();
