declare module '@/lib/strava' {
  export interface StravaActivity {
    distance: number;
    start_date: string;
    // other fields...
  }

  export function getStravaActivities(since: Date): Promise<number>;
} 