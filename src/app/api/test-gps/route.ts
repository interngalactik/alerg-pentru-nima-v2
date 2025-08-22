import { NextRequest, NextResponse } from 'next/server';
import { calculateTrailProgress } from '@/lib/trailProgressService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng, timestamp } = body;
    
    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Missing required fields: lat, lng' },
        { status: 400 }
      );
    }

    // Create test location point
    const testLocation = {
      id: `test_${Date.now()}`,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      timestamp: timestamp || Date.now(),
      accuracy: 10,
      elevation: 0,
      source: 'test-endpoint'
    };

    // Calculate trail progress
    const trailProgress = await calculateTrailProgress(testLocation);

    console.log('Test GPS location processed:', {
      location: testLocation,
      progress: trailProgress
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Test location processed',
      location: testLocation,
      progress: trailProgress
    });

  } catch (error) {
    console.error('Error processing test GPS location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET requests for testing
export async function GET() {
  try {
    console.log('GET /api/test-gps called');
    
    // Test if we can load GPX data
    const { calculateTrailProgress } = await import('@/lib/trailProgressService');
    console.log('Trail progress service imported successfully');
    
    // Create a test location
    const testLocation = {
      id: 'test_get',
      lat: 44.624535,
      lng: 22.666960,
      timestamp: Date.now(),
      accuracy: 10,
      elevation: 0,
      source: 'test-get'
    };
    
    console.log('Test location created:', testLocation);
    console.log('Starting trail progress calculation...');
    
    // Try to calculate progress
    const progress = await calculateTrailProgress(testLocation);
    
    console.log('Trail progress calculation completed:', progress);
    
    // Store the progress in Firebase so the client can receive it
    try {
      const { database } = await import('@/lib/firebase');
      const { ref, set } = await import('firebase/database');
      
      console.log('Attempting to store trail progress in Firebase...');
      
      // Store essential data plus limited segments for map rendering
      const essentialProgress = {
        completedDistance: progress.completedDistance,
        progressPercentage: progress.progressPercentage,
        lastLocation: progress.lastLocation,
        lastUpdated: progress.lastUpdated,
        estimatedCompletion: progress.estimatedCompletion,
        // Store limited segments for map rendering (smart sampling to respect progress)
        completedSegments: (() => {
          const totalSegments = progress.completedSegments.length;
          const sampleSize = Math.min(50, totalSegments); // Max 50 segments
          const step = Math.max(1, Math.floor(totalSegments / sampleSize));
          
          const sampledSegments = [];
          for (let i = 0; i < totalSegments && sampledSegments.length < sampleSize; i += step) {
            sampledSegments.push(progress.completedSegments[i]);
          }
          
          return sampledSegments;
        })()
      };
      
      const progressRef = ref(database, 'trailProgress');
      await set(progressRef, essentialProgress);
      console.log('Essential trail progress stored successfully in Firebase');
    } catch (storageError) {
      console.error('Failed to store trail progress in Firebase:', storageError);
    }
    
    return NextResponse.json({ 
      message: 'Test GPS endpoint is active',
      usage: 'POST with lat, lng, timestamp (optional)',
      example: {
        lat: 44.624535,
        lng: 22.666960,
        timestamp: Date.now()
      },
      testProgress: progress
    });
  } catch (error) {
    console.error('Error in GET /api/test-gps:', error);
    return NextResponse.json({ 
      error: 'Failed to test trail progress calculation',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
