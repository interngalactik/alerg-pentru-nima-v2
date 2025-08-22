import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'Simple test endpoint is working',
    timestamp: Date.now(),
    status: 'ok'
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng } = body;
    
    return NextResponse.json({ 
      success: true,
      message: 'Simple test successful',
      received: { lat, lng },
      timestamp: Date.now()
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Simple test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
