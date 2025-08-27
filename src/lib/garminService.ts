import type { GarminCredentials, GarminLocation } from './garmin.d';

export class GarminService {
  private baseUrl: string = 'https://ipcinbound.inreachapp.com/api'; // IPC v2 API base URL
  private deviceId: string | null = null;
  private apiKey: string | null = null;

  // Set API key for Garmin IPC v2 Inbound API
  setApiKey(apiKey: string, tenantUrl?: string): void {
    this.apiKey = apiKey;
    // For v2 API, we can optionally override the base URL if a custom tenant URL is provided
    if (tenantUrl) {
      this.baseUrl = `${tenantUrl}/api`;
    }
    // console.log('🔑 API key set for Garmin IPC v2 Inbound API');
    // console.log('🔑 Base URL:', this.baseUrl);
  }

  // Authenticate with Garmin IPC v2 using API key
  async authenticate(credentials: GarminCredentials): Promise<{ success: boolean; message: string; token?: string; instructions?: string[] }> {
    try {
      // console.log('🔐 Starting Garmin IPC v2 API Key authentication...');
      // console.log('🔐 Email:', credentials.email);
      
      // According to the v2 documentation, we need to:
      // 1. Log into https://explore.garmin.com/
      // 2. Go to Admin Controls > Portal Connect
      // 3. Toggle Inbound Settings to ON
      // 4. Generate an API Key
      
      // console.log('🔐 This authentication method requires manual API key generation');
      // console.log('🔐 Please follow these steps:');
      // console.log('🔐 1. Log into https://explore.garmin.com/');
      // console.log('🔐 2. Click Admin Controls');
      // console.log('🔐 3. Click on Portal Connect');
      // console.log('🔐 4. Toggle the Inbound Settings slider to ON');
      // console.log('🔐 5. Enter a username and password and click Save');
      // console.log('🔐 6. Click Generate API Key');
      // console.log('🔐 7. Copy the generated API key');
      
      return { 
        success: false, 
        message: 'Manual API key generation required. Please follow the steps in the console to generate your API key, then use setApiKey() method.',
        instructions: [
          'Log into https://explore.garmin.com/',
          'Click Admin Controls > Portal Connect',
          'Toggle Inbound Settings to ON',
          'Generate an API Key',
          'Use setApiKey() method to configure the service'
        ]
      };
    } catch (error) {
      console.error('❌ Garmin IPC v2 authentication error:', error);
      return { success: false, message: `Authentication error: ${error}` };
    }
  }

  // Get the last known location using the backend proxy for IPC v2 API
  async getCurrentLocation(): Promise<{ success: boolean; message: string; location?: GarminLocation }> {
    try {
      if (!this.apiKey) {
        throw new Error('Not authenticated. Please set API key first using setApiKey() method.');
      }

      console.log('📍 Fetching current location via backend proxy for IPC v2 API...');
      
      // Use our backend proxy to avoid CORS issues with the v2 API
      const response = await fetch('/api/garmin/explore/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'getCurrentLocation',
          apiKey: this.apiKey,
          baseUrl: this.baseUrl
        })
      });

      if (!response.ok) {
        throw new Error(`Proxy request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📍 Proxy response:', result);

      if (result.success && result.location) {
        // Convert the location data to our interface format
        const location: GarminLocation = {
          latitude: result.location.latitude,
          longitude: result.location.longitude,
          timestamp: result.location.timestamp,
          elevation: result.location.elevation,
          accuracy: result.location.accuracy,
          speed: result.location.speed,
          course: result.location.course,
          gpsStatus: result.location.gpsStatus
        };

        console.log('✅ Location extracted from proxy:', location);
        return { success: true, message: 'Location retrieved successfully', location };
      } else {
        console.log('❌ No location data in proxy response');
        return { success: false, message: result.message || 'No location data available' };
      }

    } catch (error) {
      console.error('❌ Error fetching location via proxy:', error);
      return { success: false, message: `Proxy error: ${error}` };
    }
  }

  // Get tracking status using the backend proxy for IPC v2 API
  async getTrackingStatus(): Promise<{ success: boolean; message: string; tracking?: any }> {
    try {
      if (!this.apiKey) {
        throw new Error('Not authenticated. Please set API key first using setApiKey() method.');
      }

      // console.log('📡 Fetching tracking status via backend proxy for IPC v2 API...');
      
      // Use our backend proxy to avoid CORS issues with the v2 API
      const response = await fetch('/api/garmin/explore/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'getTrackingStatus',
          apiKey: this.apiKey,
          baseUrl: this.baseUrl
        })
      });

      if (!response.ok) {
        throw new Error(`Proxy request failed: ${response.status}`);
      }

      const result = await response.json();
      // console.log('📡 Tracking status proxy response:', result);

      if (result.success) {
        return { success: true, message: 'Tracking status retrieved', tracking: result.data };
      } else {
        return { success: false, message: result.message || 'Failed to retrieve tracking status' };
      }

    } catch (error) {
      console.error('❌ Error fetching tracking status:', error);
      return { success: false, message: `Tracking status error: ${error}` };
    }
  }

  // Request immediate location update using the backend proxy for IPC v2 API
  async requestLocationUpdate(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.apiKey) {
        throw new Error('Not authenticated. Please set API key first using setApiKey() method.');
      }

      // console.log('📡 Requesting immediate location update via backend proxy for IPC v2 API...');
      
      // Use our backend proxy to avoid CORS issues with the v2 API
      const response = await fetch('/api/garmin/explore/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'requestLocationUpdate',
          apiKey: this.apiKey,
          baseUrl: this.baseUrl
        })
      });

      if (!response.ok) {
        throw new Error(`Proxy request failed: ${response.status}`);
      }

      const result = await response.json();
      // console.log('📡 Location update proxy response:', result);

      if (result.success) {
        return { success: true, message: 'Location update requested successfully' };
      } else {
        return { success: false, message: result.message || 'Failed to request location update' };
      }

    } catch (error) {
      console.error('❌ Error requesting location update:', error);
      return { success: false, message: `Location request error: ${error}` };
    }
  }



  // Check if we're authenticated
  isAuthenticated(): boolean {
    return !!this.apiKey;
  }

  // Logout and clear authentication
  logout(): void {
    this.apiKey = null;
    this.deviceId = null;
    console.log('🔓 Logged out from Garmin IPC v2');
  }

  // Convert GPS fix status to accuracy estimate
  private getAccuracyFromGPSStatus(gpsStatus?: string): number {
    if (!gpsStatus) return 50; // Default medium accuracy
    
    switch (gpsStatus) {
      case 'GPS_FIX_3D':
        return 5; // High accuracy (~5 meters)
      case 'GPS_FIX_2D':
        return 15; // Medium accuracy (~15 meters)
      case 'GPS_FIX_NONE':
        return 100; // Low accuracy (~100 meters)
      default:
        return 50; // Default medium accuracy
    }
  }

  // Convert API location to our standard format
  convertToLocationPoint(location: GarminLocation): [number, number] {
    return [location.longitude, location.latitude];
  }
}
