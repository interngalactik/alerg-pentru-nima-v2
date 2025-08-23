import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Test location data
    const testLocation = {
      lat: body.lat || 44.624535, // Default to Via Transilvanica start
      lng: body.lng || 22.666960,
      timestamp: Date.now(),
      accuracy: body.accuracy || 10,
      elevation: body.elevation || 0
    };

    // Call the Garmin webhook endpoint to simulate a real update
    const response = await fetch(`${request.nextUrl.origin}/api/garmin-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testLocation),
    });

    if (response.ok) {
      return NextResponse.json({ 
        success: true, 
        message: 'Test location sent successfully',
        location: testLocation
      });
    } else {
      const errorData = await response.json();
      return NextResponse.json(
        { success: false, error: 'Failed to process location', details: errorData },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error sending test location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Test Garmin location endpoint',
    usage: 'POST with lat, lng, accuracy, elevation to simulate Garmin InReach location update',
    example: {
      lat: 44.624535,
      lng: 22.666960,
      accuracy: 10,
      elevation: 0
    }
  });
}
