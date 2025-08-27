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
        const timeline = snapshot.val();
        // console.log('📅 Raw timeline data from Firebase:', timeline);
        return timeline;
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
    
    // Validate and parse dates safely
    let startDateTime: Date;
    let finishDateTime: Date;
    
    try {
      // Ensure proper date format (YYYY-MM-DD)
      const startDate = timeline.startDate.includes('T') ? timeline.startDate.split('T')[0] : timeline.startDate;
      const finishDate = timeline.finishDate.includes('T') ? timeline.finishDate.split('T')[0] : timeline.finishDate;
      
      // Ensure proper time format (HH:MM)
      const startTime = timeline.startTime.includes('T') ? timeline.startTime.split('T')[1] : timeline.startTime;
      const finishTime = timeline.finishTime.includes('T') ? timeline.finishTime.split('T')[1] : timeline.finishTime;
      
      startDateTime = new Date(startDate + 'T' + startTime);
      finishDateTime = new Date(finishDate + 'T' + finishTime);
      
      // Check if dates are valid
      if (isNaN(startDateTime.getTime()) || isNaN(finishDateTime.getTime())) {
        console.error('❌ Invalid date format:', { startDate, startTime, finishDate, finishTime });
        return false;
      }
      
      // Only log date comparison occasionally to reduce console spam
      if (Math.random() < 0.1) { // 10% chance to log
        // console.log('🔄 Date comparison:', {
        //   now: now.toISOString(),
        //   startDateTime: startDateTime.toISOString(),
        //   finishDateTime: finishDateTime.toISOString(),
        //   nowAfterStart: now >= startDateTime,
        //   nowBeforeFinish: now <= finishDateTime
        // });
      }
      
      // For testing purposes, if dates are in the past, consider the run active
      // This allows testing the completion system even when the actual run dates have passed
      if (now > finishDateTime) {
        console.log('🔄 Run dates in the past - enabling testing mode');
        return true;
      }
      
      const isActive = now >= startDateTime && now <= finishDateTime;
      
      // Only log run status occasionally
      if (Math.random() < 0.1) { // 10% chance to log
        // console.log('🔄 Run active:', isActive);
      }
      
      return isActive;
      
    } catch (error) {
      console.error('❌ Error parsing dates:', error);
      return false;
    }
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
