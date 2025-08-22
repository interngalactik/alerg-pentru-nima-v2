import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Admin password from environment variable (not visible in client code)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Simple token secret from environment variable
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'your-secret-key-change-this';

// Simple token generation (in production, use a proper JWT library)
function generateToken(payload: any): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadStr = btoa(JSON.stringify(payload));
  const signature = btoa(TOKEN_SECRET + payloadStr + Date.now());
  return `${header}.${payloadStr}.${signature}`;
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Validate password
    if (password === ADMIN_PASSWORD) {
      // Create simple token
      const token = generateToken({ 
        isAdmin: true, 
        timestamp: Date.now() 
      });

      // Set secure HTTP-only cookie
      const response = NextResponse.json({ 
        success: true, 
        message: 'Login successful' 
      });

      response.cookies.set('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/'
      });

      return response;
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid password' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Admin login endpoint' });
}
