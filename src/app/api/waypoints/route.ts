import { NextRequest, NextResponse } from 'next/server';
import { WaypointService } from '@/lib/waypointService';

export async function GET() {
  try {
    const waypoints = await WaypointService.getAllWaypoints();
    return NextResponse.json({ success: true, waypoints });
  } catch (error) {
    console.error('Error getting waypoints:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get waypoints' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, details, coordinates, createdBy = 'Admin' } = body;
    
    if (!name || !type || !details || !coordinates) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const waypointId = await WaypointService.addWaypoint({
      name, 
      type, 
      details, 
      coordinates
    });
    
    return NextResponse.json({ success: true, waypointId });
  } catch (error) {
    console.error('Error adding waypoint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add waypoint' },
      { status: 500 }
    );
  }
}
