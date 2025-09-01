import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📨 Received request body:', body);
    
    const { action, apiKey, baseUrl } = body;
    
    if (!action) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing action parameter' 
      }, { status: 400 });
    }
    
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing API key' 
      }, { status: 400 });
    }
    
    if (!baseUrl) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing base URL' 
      }, { status: 400 });
    }
    
    console.log('🔑 Using API key:', apiKey.substring(0, 10) + '...');
    console.log('🌐 Using base URL:', baseUrl);

    if (action === 'getCurrentLocation') {
      console.log('📍 Proxying location request to Garmin IPC v2 API...');
      
      // Make the request from the backend to avoid CORS
      const response = await fetch(`${baseUrl}/Location/LastKnownLocation?IMEI=301434030990580`, {
        headers: {
          'X-API-Key': apiKey,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log('📍 API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Location API error response:', errorText);
        throw new Error(`Location API request failed: ${response.status} - ${errorText}`);
      }

      // Handle empty response body
      const responseText = await response.text();
      console.log('📍 API response text:', responseText);
      
      let data;
      if (responseText.trim()) {
        try {
          data = JSON.parse(responseText);
          console.log('📍 API response data:', data);
        } catch (parseError) {
          console.error('❌ JSON parse error:', parseError);
          console.log('📍 Raw response text:', responseText);
          return NextResponse.json({ 
            success: false, 
            message: 'Invalid JSON response from location API' 
          });
        }
      } else {
        console.log('📍 Empty response body from location API');
        return NextResponse.json({ 
          success: false, 
          message: 'Empty response from location API' 
        });
      }

      if (data.locations && data.locations.length > 0) {
        const locationData = data.locations[0]; // Get first device location

        // Parse Garmin's special timestamp format /Date(1756235805000)/
        let parsedTimestamp;
        if (locationData.timestamp && locationData.timestamp.startsWith('/Date(') && locationData.timestamp.endsWith(')/')) {
          const timestampStr = locationData.timestamp.replace('/Date(', '').replace(')/', '');
          const timestampMs = parseInt(timestampStr);
          if (!isNaN(timestampMs)) {
            // Check if the timestamp is reasonable (within last 24 hours)
            const currentTime = Date.now();
            const timeDiff = Math.abs(currentTime - timestampMs);
            const oneDayMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
            
            if (timeDiff > oneDayMs) {
              console.log('⚠️ Garmin timestamp is too old, using current time instead');
              console.log('Garmin timestamp:', timestampMs, '→', new Date(timestampMs).toISOString());
              console.log('Current time:', currentTime, '→', new Date(currentTime).toISOString());
              parsedTimestamp = new Date().toISOString();
            } else {
              parsedTimestamp = new Date(timestampMs).toISOString();
            }
          } else {
            parsedTimestamp = new Date().toISOString();
          }
        } else {
          parsedTimestamp = new Date().toISOString();
        }

        const location = {
          latitude: locationData.coordinate.latitude,
          longitude: locationData.coordinate.longitude,
          timestamp: parsedTimestamp,
          elevation: locationData.altitude,
          accuracy: getAccuracyFromGPSStatus(locationData.gpsFixStatus),
          speed: locationData.speed,
          course: locationData.course,
          gpsStatus: locationData.gpsFixStatus
        };

        console.log('✅ Location extracted from API:', location);
        return NextResponse.json({ 
          success: true, 
          message: 'Location retrieved successfully', 
          location 
        });
      } else {
        console.log('❌ No location data in API response');
        return NextResponse.json({ 
          success: false, 
          message: 'No location data available' 
        });
      }

    } else if (action === 'getTrackingStatus') {
      console.log('📡 Proxying tracking status request to IPC v2 API...');
      
      // Try to get tracking status - this might be a GET request in v2
      // Let's try both GET and POST to see which works
      let response;
      try {
        // First try GET request
        console.log('📡 Trying GET request for tracking status...');
        response = await fetch(`${baseUrl}/Tracking/Tracking?IMEI=301434030990580`, {
          method: 'GET',
          headers: {
            'X-API-Key': apiKey,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          console.log('✅ GET request successful for tracking status');
        } else {
          console.log('❌ GET request failed, trying POST...');
          // If GET fails, try POST
          response = await fetch(`${baseUrl}/Tracking/Tracking?IMEI=301434030990580`, {
            method: 'POST',
            headers: {
              'X-API-Key': apiKey,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              Devices: [] // Empty array means all devices
            })
          });
        }
      } catch (fetchError) {
        console.error('❌ Fetch error:', fetchError);
        throw new Error(`Failed to fetch tracking status: ${fetchError}`);
      }

      console.log('📡 Tracking API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Tracking API error response:', errorText);
        throw new Error(`Tracking API request failed: ${response.status} - ${errorText}`);
      }

      // Handle empty response body
      const responseText = await response.text();
      console.log('📡 Tracking API response text:', responseText);
      
      let data;
      if (responseText.trim()) {
        try {
          data = JSON.parse(responseText);
          console.log('📡 Tracking API response data:', data);
        } catch (parseError) {
          console.error('❌ JSON parse error:', parseError);
          console.log('📡 Raw response text:', responseText);
          // Return success even if JSON parsing fails, as the API call was successful
          return NextResponse.json({ 
            success: true, 
            message: 'Tracking status retrieved (empty response)', 
            data: null 
          });
        }
      } else {
        console.log('📡 Empty response body from tracking API');
        data = null;
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Tracking status retrieved', 
        data 
      });

    } else if (action === 'requestLocationUpdate') {
      console.log('📍 Proxying location update request to IPC v2 API...');
      
      const response = await fetch(`${baseUrl}/Location/LocationRequest`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          IMEI: [] // Empty array means all devices
        })
      });

      console.log('📍 Location update API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Location update API error response:', errorText);
        throw new Error(`Location update API failed: ${response.status} - ${errorText}`);
      }

      // Handle empty response body
      const responseText = await response.text();
      console.log('📍 Location update API response text:', responseText);
      
      let data;
      if (responseText.trim()) {
        try {
          data = JSON.parse(responseText);
          console.log('📍 Location update API response data:', data);
        } catch (parseError) {
          console.error('❌ JSON parse error:', parseError);
          console.log('📍 Raw response text:', responseText);
          // Return success even if JSON parsing fails, as the API call was successful
          return NextResponse.json({ 
            success: true, 
            message: 'Location update requested successfully (empty response)' 
          });
        }
      } else {
        console.log('📍 Empty response body from location update API');
        data = null;
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Location update requested successfully' 
      });

    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid action specified' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error in Garmin IPC v2 location proxy:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Proxy error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}

function getAccuracyFromGPSStatus(gpsStatus: string): number {
  switch (gpsStatus) {
    case 'GPS_FIX_3D':
      return 5; // High accuracy
    case 'GPS_FIX_2D':
      return 15; // Medium accuracy
    case 'GPS_FIX_NONE':
      return 100; // Low accuracy
    default:
      return 50; // Default medium accuracy
  }
}
