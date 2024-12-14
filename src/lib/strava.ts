interface StravaActivity {
    distance: number;
    start_date: string;
    // other fields...
  }
  
  export async function getStravaActivities(since: Date): Promise<number> {
    try {
      const response = await fetch(`https://www.strava.com/api/v3/athlete/activities`, {
        headers: {
          'Authorization': `Bearer ${process.env.STRAVA_ACCESS_TOKEN}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch from Strava')
      }
      
      const activities: StravaActivity[] = await response.json()
      
      return activities
        .filter(activity => new Date(activity.start_date) >= since)
        .reduce((total, activity) => 
          total + (activity.distance / 1000), // Convert to km
          0
        )
    } catch (error) {
      console.error('Strava API error:', error)
      throw error
    }
  }