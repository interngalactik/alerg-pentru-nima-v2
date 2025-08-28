import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Admin password from environment variable (not visible in client code)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Simple token secret from environment variable
const TOKEN_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

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

    // Log the attempt (without exposing the actual password)
    console.log('Admin login attempt:', {
      hasPassword: !!password,
      passwordLength: password?.length,
      adminPasswordSet: !!process.env.ADMIN_PASSWORD,
      jwtSecretSet: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV
    });

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

      const cookieOptions = {
        httpOnly: true,
        secure: true, // Always secure for HTTPS
        sameSite: 'lax' as const, // More permissive
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/'
        // Remove domain restriction
      };

      console.log('Setting admin token cookie with options:', {
        tokenLength: token.length,
        tokenStart: token.substring(0, 20) + '...',
        ...cookieOptions
      });

      // Return the token in the response body for localStorage
      const responseData = { 
        success: true, 
        message: 'Login successful',
        token: token
      };
      
      console.log('Login API: Returning response with token:', {
        success: responseData.success,
        message: responseData.message,
        hasToken: !!responseData.token,
        tokenLength: responseData.token?.length
      });
      
      return NextResponse.json(responseData);
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
