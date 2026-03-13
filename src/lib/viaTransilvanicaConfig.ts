/**
 * Via Transilvanica live tracking pause flag.
 *
 * When true:
 * - No Garmin/location polling or live subscriptions
 * - No SMS/Strava polling on the Via Transilvanica page
 * - Map and page still load existing data once (distance, locations, waypoints, timeline)
 *
 * Set to false when you resume the run to restore live tracking and API calls.
 */
export const LIVE_TRACKING_PAUSED = true;
