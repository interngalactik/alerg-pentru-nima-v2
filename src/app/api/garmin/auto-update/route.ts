import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/firebase';
import { ref, set, push } from 'firebase/database';

// This endpoint is called by a server-side cron job to automatically update Garmin locations
export async function POST(request: NextRequest) {
  try {
    const { apiKey, baseUrl } = await request.json();
    
    if (!apiKey || !baseUrl) {
      return NextResponse.json({ 
        success: false, 
        message: 'API key and base URL are required' 
      }, { status: 400 });
    }

    console.log('🤖 Auto-update: Starting automatic Garmin location fetch...');

    // Step 1: Request fresh location update from InReach device
    console.log('📡 Auto-update: Requesting fresh location update...');
    const updateResponse = await fetch(`${baseUrl}/Location/LocationRequest`, {
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

    if (!updateResponse.ok) {
      console.log('⚠️ Auto-update: Location update request failed');
    } else {
      console.log('✅ Auto-update: Location update requested successfully');
    }

    // Step 2: Wait for device to process
    console.log('⏳ Auto-update: Waiting for device to process...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 3: Fetch the fresh location data
    console.log('📍 Auto-update: Fetching fresh location data...');
    const locationResponse = await fetch(`${baseUrl}/Location/LastKnownLocation?IMEI=301434030990580`, {
      headers: {
        'X-API-Key': apiKey,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!locationResponse.ok) {
      throw new Error(`Location API failed: ${locationResponse.status}`);
    }

    const responseText = await locationResponse.text();
    let data;
    
    if (responseText.trim()) {
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Invalid JSON response from location API');
      }
    } else {
      throw new Error('Empty response from location API');
    }

    if (data.locations && data.locations.length > 0) {
      const locationData = data.locations[0];
      
      // Parse Garmin's timestamp format
      let parsedTimestamp;
      if (locationData.timestamp && locationData.timestamp.startsWith('/Date(') && locationData.timestamp.endsWith(')/')) {
        const timestampStr = locationData.timestamp.replace('/Date(', '').replace(')/', '');
        const timestampMs = parseInt(timestampStr);
        if (!isNaN(timestampMs)) {
          parsedTimestamp = new Date(timestampMs).toISOString();
        } else {
          parsedTimestamp = new Date().toISOString();
        }
      } else {
        parsedTimestamp = new Date().toISOString();
      }

      // Create location point
      const locationPoint = {
        id: `garmin_auto_${Date.now()}`,
        lat: locationData.coordinate.latitude,
        lng: locationData.coordinate.longitude,
        timestamp: new Date(parsedTimestamp).getTime(),
        accuracy: locationData.gpsFixStatus === 4 ? 50 : 100, // GPS status 4 = good fix
        elevation: locationData.altitude,
        source: 'garmin-auto-update'
      };

      // Store the location directly in Firebase
      const locationsRef = ref(database, 'locations');
      const newLocationRef = push(locationsRef);
      await set(newLocationRef, locationPoint);

      console.log('✅ Auto-update: Location stored successfully:', locationPoint);

      // Calculate trail progress server-side
      const { calculateTrailProgress } = await import('@/lib/trailProgressService');
      const trailProgress = await calculateTrailProgress(locationPoint);

      // Store progress
      const progressRef = ref(database, 'trailProgress');
      await set(progressRef, {
        completedDistance: trailProgress.completedDistance,
        progressPercentage: trailProgress.progressPercentage,
        lastLocation: trailProgress.lastLocation,
        lastUpdated: trailProgress.lastUpdated,
        estimatedCompletion: trailProgress.estimatedCompletion,
        completedSegments: trailProgress.completedSegments.slice(0, 50) // Limit segments
      });

      console.log('✅ Auto-update: Trail progress calculated and stored');

      return NextResponse.json({ 
        success: true, 
        message: 'Automatic location update completed',
        location: locationPoint,
        progress: trailProgress
      });

    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'No location data available' 
      });
    }

  } catch (error) {
    console.error('❌ Auto-update error:', error);
    return NextResponse.json(
      { error: 'Automatic update failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({ 
    message: 'Auto-update endpoint - use POST with apiKey and baseUrl' 
  });
}

