
export const HOME_OG_IMAGE_URL =
  'https://api.alergpentrunima.ro/wp-content/uploads/2024/01/alergpentrunim.ro-preview.png'

// Strava credentials
export const STRAVA_CLIENT_ID = '119252';
export const STRAVA_CLIENT_SECRET = '51acf00278acf0bf9bd7a4ec85be682a0f238848';


// Refresh token and call address
export const STRAVA_REFRESH_TOKEN = '1849c235d7b0ee7931803582bd6edb1dfea7ecf4';
export const STRAVA_CALL_REFRESH = `https://www.strava.com/oauth/token?client_id=${STRAVA_CLIENT_ID}&client_secret=${STRAVA_CLIENT_SECRET}&refresh_token=${STRAVA_REFRESH_TOKEN}&grant_type=refresh_token`

// Timestamp for 16th of March 2023
export const STRAVA_AFTER_DATE = '1678924800';

// Results per page
export const STRAVA_PER_PAGE = '200';

// endpoint for read-all activities. temporary token is added in getActivities()
export const STRAVA_CALL_ACTIVITIES = `https://www.strava.com/api/v3/athlete/activities?after=${STRAVA_AFTER_DATE}&per_page=${STRAVA_PER_PAGE}&access_token=`;
