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

class GarminV2Service {
  private baseUrl = 'https://connect.garmin.com';
  private authToken: string | null = null;
  private deviceId: string | null = null;

  // Authenticate using Garmin's modern API
  async authenticate(credentials: GarminCredentials): Promise<{ success: boolean; message: string; token?: string }> {
    try {
      console.log('🔐 Starting Garmin V2 authentication...');
      
      // Step 1: Get the modern login page
      console.log('📄 Fetching modern Garmin login...');
      const loginResponse = await fetch(`${this.baseUrl}/modern/auth/login`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      console.log('📄 Login response status:', loginResponse.status);
      
      if (!loginResponse.ok) {
        console.log('❌ Failed to access modern login page');
        return { success: false, message: 'Failed to access Garmin login page' };
      }

      const loginHtml = await loginResponse.text();
      console.log('📄 Login HTML length:', loginHtml.length);
      
      // Look for modern form structure
      const formMatch = loginHtml.match(/<form[^>]*action="([^"]*)"[^>]*>/);
      const formAction = formMatch ? formMatch[1] : '/modern/auth/login';
      
      // Extract any hidden fields
      const hiddenFields = loginHtml.match(/<input[^>]*type="hidden"[^>]*>/g) || [];
      const formData = new URLSearchParams();
      
      // Add credentials
      formData.append('username', credentials.email);
      formData.append('password', credentials.password);
      
      // Add hidden fields
      hiddenFields.forEach(field => {
        const nameMatch = field.match(/name="([^"]*)"/);
        const valueMatch = field.match(/value="([^"]*)"/);
        if (nameMatch && valueMatch) {
          formData.append(nameMatch[1], valueMatch[1]);
        }
      });

      console.log('📤 Submitting modern login form...');
      const authResponse = await fetch(`${this.baseUrl}${formAction}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': `${this.baseUrl}/modern/auth/login`,
          'Origin': this.baseUrl
        },
        body: formData,
        redirect: 'manual'
      });

      console.log('📤 Auth response status:', authResponse.status);
      console.log('📤 Auth response headers:', Object.fromEntries(authResponse.headers.entries()));

      // Check for successful authentication
      if (authResponse.status === 302 || authResponse.status === 200) {
        const cookies = authResponse.headers.get('set-cookie');
        console.log('🍪 Cookies found:', cookies ? 'Yes' : 'No');
        
        if (cookies) {
          this.authToken = cookies;
          console.log('✅ Authentication successful');
          return { success: true, message: 'Authentication successful', token: cookies };
        }
      }

      // Try to get error message from response
      let errorMessage = 'Authentication failed';
      try {
        const errorHtml = await authResponse.text();
        if (errorHtml.includes('Invalid username or password')) {
          errorMessage = 'Invalid username or password';
        } else if (errorHtml.includes('error')) {
          errorMessage = 'Login error occurred';
        }
      } catch (e) {
        // Ignore parsing errors
      }

      console.log('❌ Authentication failed:', errorMessage);
      return { success: false, message: errorMessage };
      
    } catch (error) {
      console.error('❌ Garmin V2 authentication error:', error);
      return { success: false, message: `Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  // Get devices using modern API
  async getDevices(token: string): Promise<{ success: boolean; devices?: any[]; message: string }> {
    try {
      console.log('📱 Fetching devices with modern API...');
      
      const response = await fetch(`${this.baseUrl}/modern/proxy/device-service/devices`, {
        headers: {
          'Cookie': token,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Referer': `${this.baseUrl}/modern/`
        }
      });

      console.log('📱 Devices response status:', response.status);

      if (!response.ok) {
        return { success: false, message: 'Failed to fetch devices' };
      }

      const devicesResponse = await response.json();
      console.log('📱 Raw devices response:', JSON.stringify(devicesResponse, null, 2));
      
      // Handle different response formats
      let devices = [];
      if (Array.isArray(devicesResponse)) {
        devices = devicesResponse;
      } else if (devicesResponse && typeof devicesResponse === 'object') {
        // Check if devices are nested in the response
        if (Array.isArray(devicesResponse.devices)) {
          devices = devicesResponse.devices;
        } else if (Array.isArray(devicesResponse.data)) {
          devices = devicesResponse.data;
        } else if (Array.isArray(devicesResponse.items)) {
          devices = devicesResponse.items;
        } else {
          // Log the structure to understand what we got
          console.log('📱 Response structure keys:', Object.keys(devicesResponse));
          console.log('📱 Response structure:', devicesResponse);
        }
      }
      
      console.log('📱 Processed devices array length:', devices.length);
      
      // Find InReach device
      const inreachDevice = devices.find((device: any) => 
        device.deviceType?.includes('inreach') || 
        device.deviceType?.includes('InReach') ||
        device.deviceType?.includes('messenger')
      );

      if (inreachDevice) {
        this.deviceId = inreachDevice.deviceId;
        console.log('📱 InReach device found:', inreachDevice.deviceId);
      } else {
        console.log('📱 No InReach device found');
      }

      return { success: true, devices, message: 'Devices fetched successfully' };
    } catch (error) {
      console.error('Error fetching devices:', error);
      return { success: false, message: `Error fetching devices: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  // Get current location using modern API
  async getCurrentLocation(token: string, deviceId: string): Promise<{ success: boolean; location?: GarminLocation; message: string }> {
    try {
      console.log('📍 Fetching location with modern API...');
      
      const response = await fetch(`${this.baseUrl}/modern/proxy/location-service/locations/latest?deviceId=${deviceId}`, {
        headers: {
          'Cookie': token,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Referer': `${this.baseUrl}/modern/`
        }
      });

      console.log('📍 Location response status:', response.status);

      if (!response.ok) {
        return { success: false, message: 'Failed to fetch location' };
      }

      const locationData = await response.json();
      console.log('📍 Location data received:', !!locationData);
      
      if (locationData && locationData.latitude && locationData.longitude) {
        const location: GarminLocation = {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          timestamp: locationData.timestamp || new Date().toISOString(),
          elevation: locationData.elevation,
          accuracy: locationData.accuracy
        };
        
        console.log('✅ Location parsed successfully');
        return { success: true, location, message: 'Location fetched successfully' };
      }

      return { success: false, message: 'No location data available' };
    } catch (error) {
      console.error('Error fetching location:', error);
      return { success: false, message: `Error fetching location: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }
}

// POST /api/garmin/v2 - Modern Garmin API
export async function POST(request: NextRequest) {
  try {
    const { action, credentials, token, deviceId } = await request.json();
    console.log('🚀 Garmin V2 API called with action:', action);
    
    const garminService = new GarminV2Service();

    switch (action) {
      case 'authenticate':
        console.log('🔐 V2 Authentication requested for:', credentials?.email);
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials');
          return NextResponse.json({ success: false, message: 'Email and password are required' }, { status: 400 });
        }
        
        console.log('🔐 Calling Garmin V2 authentication...');
        const authResult = await garminService.authenticate(credentials);
        console.log('🔐 V2 Authentication result:', authResult);
        
        if (authResult.success && authResult.token) {
          console.log('✅ V2 Authentication successful, getting devices...');
          const devicesResult = await garminService.getDevices(authResult.token);
          console.log('📱 V2 Devices result:', devicesResult);
          
          return NextResponse.json({
            success: true,
            message: 'Authentication successful',
            token: authResult.token,
            devices: devicesResult.devices || []
          });
        } else {
          console.log('❌ V2 Authentication failed:', authResult.message);
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
    console.error('Garmin V2 API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
