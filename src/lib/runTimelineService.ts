import { ref, set, get, onValue, off } from 'firebase/database';
import { database } from './firebase';

export interface RunTimeline {
  startDate: string; // ISO date string
  startTime: string; // Time string (HH:MM)
  finishDate: string; // ISO date string
  finishTime: string; // Time string (HH:MM)
  updatedAt: string; // ISO date string
}

export class RunTimelineService {
  private timelineRef = ref(database, 'startFinishDates');

  // Get current run timeline
  async getRunTimeline(): Promise<RunTimeline | null> {
    try {
      const snapshot = await get(this.timelineRef);
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return null;
    } catch (error) {
      console.error('Error getting run timeline:', error);
      return null;
    }
  }

  // Set run timeline (admin only)
  async setRunTimeline(timeline: Omit<RunTimeline, 'updatedAt'>): Promise<void> {
    try {
      const timelineWithTimestamp: RunTimeline = {
        ...timeline,
        updatedAt: new Date().toISOString()
      };
      
      await set(this.timelineRef, timelineWithTimestamp);
      console.log('✅ Run timeline updated successfully');
    } catch (error) {
      console.error('Error setting run timeline:', error);
      throw error;
    }
  }

  // Check if run is currently active
  isRunActive(timeline: RunTimeline | null): boolean {
    if (!timeline) return false;
    
    const now = new Date();
    const startDateTime = new Date(timeline.startDate + 'T' + timeline.startTime);
    const finishDateTime = new Date(timeline.finishDate + 'T' + timeline.finishTime);
    
    return now >= startDateTime && now <= finishDateTime;
  }

  // Check if a specific date is within run period
  isDateInRunPeriod(timeline: RunTimeline | null, date: Date): boolean {
    if (!timeline) return false;
    
    const startDateTime = new Date(timeline.startDate + 'T' + timeline.startTime);
    const finishDateTime = new Date(timeline.finishDate + 'T' + timeline.finishTime);
    
    return date >= startDateTime && date <= finishDateTime;
  }

  // Get run status description
  getRunStatus(timeline: RunTimeline | null): string {
    if (!timeline) return 'No run scheduled';
    
    const now = new Date();
    const startDateTime = new Date(timeline.startDate + 'T' + timeline.startTime);
    const finishDateTime = new Date(timeline.finishDate + 'T' + timeline.finishTime);
    
    if (now < startDateTime) {
      const daysUntilStart = Math.ceil((startDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return `Run starts in ${daysUntilStart} day${daysUntilStart !== 1 ? 's' : ''}`;
    } else if (now > finishDateTime) {
      return 'Run completed';
    } else {
      const daysUntilFinish = Math.ceil((finishDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return `Run active - ${daysUntilFinish} day${daysUntilFinish !== 1 ? 's' : ''} remaining`;
    }
  }

  // Listen to timeline changes in real-time
  onTimelineUpdate(callback: (timeline: RunTimeline | null) => void): () => void {
    const unsubscribe = onValue(this.timelineRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback(null);
      }
    });

    return () => off(this.timelineRef, 'value', unsubscribe);
  }

  // Clear run timeline (admin only)
  async clearRunTimeline(): Promise<void> {
    try {
      await set(this.timelineRef, null);
      console.log('✅ Run timeline cleared successfully');
    } catch (error) {
      console.error('Error clearing run timeline:', error);
      throw error;
    }
  }
}

export const runTimelineService = new RunTimelineService();
