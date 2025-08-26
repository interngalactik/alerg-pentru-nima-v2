import { NextRequest, NextResponse } from 'next/server';

interface GarminCredentials {
  email: string;
  password: string;
}

interface GarminLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
  elevation?: number;
  accuracy?: number;
}

class GarminServerService {
  private baseUrl = 'https://connect.garmin.com';
  private authToken: string | null = null;
  private deviceId: string | null = null;

  // Authenticate with Garmin Connect
  async authenticate(credentials: GarminCredentials): Promise<{ success: boolean; message: string; token?: string }> {
    try {
      console.log('🔐 Starting Garmin authentication...');
      
      // Step 1: Get the login form and extract CSRF token
      console.log('📄 Fetching Garmin login page...');
      const loginPageResponse = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      console.log('📄 Login page response status:', loginPageResponse.status);
      console.log('📄 Login page response headers:', Object.fromEntries(loginPageResponse.headers.entries()));

      if (!loginPageResponse.ok) {
        console.log('❌ Failed to access Garmin login page');
        return { success: false, message: 'Failed to access Garmin login page' };
      }

      const loginPageHtml = await loginPageResponse.text();
      console.log('📄 Login page HTML length:', loginPageHtml.length);
      
      // Extract CSRF token from the login form
      const csrfMatch = loginPageHtml.match(/name="csrf" value="([^"]+)"/);
      const csrfToken = csrfMatch ? csrfMatch[1] : '';
      console.log('🔑 CSRF token found:', csrfToken ? 'Yes' : 'No');

      // Step 2: Submit login credentials
      const loginData = new URLSearchParams({
        username: credentials.email,
        password: credentials.password,
        embed: 'false',
        csrf: csrfToken
      });

      console.log('📤 Submitting login credentials...');
      const authResponse = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': `${this.baseUrl}/auth/login`
        },
        body: loginData,
        redirect: 'manual'
      });

      console.log('📤 Auth response status:', authResponse.status);
      console.log('📤 Auth response headers:', Object.fromEntries(authResponse.headers.entries()));

      // Check if login was successful
      if (authResponse.status === 302 || authResponse.status === 200) {
        // Extract cookies from response
        const cookies = authResponse.headers.get('set-cookie');
        console.log('🍪 Cookies found:', cookies ? 'Yes' : 'No');
        if (cookies) {
          this.authToken = cookies;
          console.log('✅ Authentication successful');
          return { success: true, message: 'Authentication successful', token: cookies };
        }
      }

      console.log('❌ Authentication failed - invalid credentials');
      return { success: false, message: 'Authentication failed - invalid credentials' };
    } catch (error) {
      console.error('❌ Garmin authentication error:', error);
      return { success: false, message: `Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  // Get the user's devices (including InReach)
  async getDevices(token: string): Promise<{ success: boolean; devices?: any[]; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/proxy/device-service/devices`, {
        headers: {
          'Cookie': token,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        return { success: false, message: 'Failed to fetch devices' };
      }

      const devices = await response.json();
      
      // Find InReach device
      const inreachDevice = devices.find((device: any) => 
        device.deviceType?.includes('inreach') || 
        device.deviceType?.includes('InReach') ||
        device.deviceType?.includes('messenger')
      );

      if (inreachDevice) {
        this.deviceId = inreachDevice.deviceId;
      }

      return { success: true, devices, message: 'Devices fetched successfully' };
    } catch (error) {
      console.error('Error fetching devices:', error);
      return { success: false, message: `Error fetching devices: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  // Get current location from InReach device
  async getCurrentLocation(token: string, deviceId: string): Promise<{ success: boolean; location?: GarminLocation; message: string }> {
    try {
      // Get the latest location data
      const response = await fetch(`${this.baseUrl}/proxy/location-service/locations/latest?deviceId=${deviceId}`, {
        headers: {
          'Cookie': token,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        return { success: false, message: 'Failed to fetch location' };
      }

      const locationData = await response.json();
      
      if (locationData && locationData.latitude && locationData.longitude) {
        const location: GarminLocation = {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          timestamp: locationData.timestamp || new Date().toISOString(),
          elevation: locationData.elevation,
          accuracy: locationData.accuracy
        };
        
        return { success: true, location, message: 'Location fetched successfully' };
      }

      return { success: false, message: 'No location data available' };
    } catch (error) {
      console.error('Error fetching location:', error);
      return { success: false, message: `Error fetching location: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }
}

// POST /api/garmin - Authenticate and get devices
export async function POST(request: NextRequest) {
  try {
    const { action, credentials, token, deviceId } = await request.json();
    console.log('🚀 Garmin API called with action:', action);
    
    const garminService = new GarminServerService();

    switch (action) {
      case 'authenticate':
        console.log('🔐 Authentication requested for:', credentials?.email);
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials');
          return NextResponse.json({ success: false, message: 'Email and password are required' }, { status: 400 });
        }
        
        console.log('🔐 Calling Garmin authentication...');
        const authResult = await garminService.authenticate(credentials);
        console.log('🔐 Authentication result:', authResult);
        
        if (authResult.success && authResult.token) {
          console.log('✅ Authentication successful, getting devices...');
          // Get devices after successful authentication
          const devicesResult = await garminService.getDevices(authResult.token);
          console.log('📱 Devices result:', devicesResult);
          
          return NextResponse.json({
            success: true,
            message: 'Authentication successful',
            token: authResult.token,
            devices: devicesResult.devices || []
          });
        } else {
          console.log('❌ Authentication failed:', authResult.message);
          return NextResponse.json({ success: false, message: authResult.message }, { status: 401 });
        }

      case 'getLocation':
        if (!token || !deviceId) {
          return NextResponse.json({ success: false, message: 'Token and device ID are required' }, { status: 400 });
        }
        
        const locationResult = await garminService.getCurrentLocation(token, deviceId);
        return NextResponse.json(locationResult);

      default:
        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Garmin API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
