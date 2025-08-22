import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/firebase';
import { ref, set, push } from 'firebase/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Garmin InReach sends data in this format
    const { lat, lng, timestamp, accuracy, elevation } = body;
    
    if (!lat || !lng || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: lat, lng, timestamp' },
        { status: 400 }
      );
    }

    // Create location point
    const locationPoint = {
      id: `garmin_${Date.now()}`,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      timestamp: parseInt(timestamp),
      accuracy: accuracy ? parseFloat(accuracy) : undefined,
      elevation: elevation ? parseFloat(elevation) : undefined,
      source: 'garmin-inreach'
    };

    // Store the location
    const locationsRef = ref(database, 'locations');
    const newLocationRef = push(locationsRef);
    await set(newLocationRef, locationPoint);

    // Calculate trail progress server-side
    const { calculateTrailProgress } = await import('@/lib/trailProgressService');
    const trailProgress = await calculateTrailProgress(locationPoint);

    // Store the updated progress with limited segments for performance
    console.log('Attempting to store trail progress in Firebase...');
    
    // Store essential data plus limited segments for map rendering
    const essentialProgress = {
      completedDistance: trailProgress.completedDistance,
      progressPercentage: trailProgress.progressPercentage,
      lastLocation: trailProgress.lastLocation,
      lastUpdated: trailProgress.lastUpdated,
      estimatedCompletion: trailProgress.estimatedCompletion,
      // Store limited segments for map rendering (smart sampling to respect progress)
      completedSegments: (() => {
        const totalSegments = trailProgress.completedSegments.length;
        const sampleSize = Math.min(50, totalSegments); // Max 50 segments
        const step = Math.max(1, Math.floor(totalSegments / sampleSize));
        
        const sampledSegments = [];
        for (let i = 0; i < totalSegments && sampledSegments.length < sampleSize; i += step) {
          sampledSegments.push(trailProgress.completedSegments[i]);
        }
        
        return sampledSegments;
      })()
    };
    
    const progressRef = ref(database, 'trailProgress');
    
    try {
      await set(progressRef, essentialProgress);
      console.log('Trail progress stored successfully in Firebase');
    } catch (storageError) {
      console.error('Failed to store trail progress in Firebase:', storageError);
      throw storageError;
    }

    console.log('Garmin webhook processed:', {
      location: locationPoint,
      progress: trailProgress
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Location processed and trail progress updated',
      progress: trailProgress
    });

  } catch (error) {
    console.error('Error processing Garmin webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET requests for testing
export async function GET() {
  return NextResponse.json({ 
    message: 'Garmin InReach webhook endpoint is active',
    usage: 'POST with lat, lng, timestamp, accuracy, elevation'
  });
} 