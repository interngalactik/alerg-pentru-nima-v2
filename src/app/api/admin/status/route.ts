import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Simple token secret from environment variable
const TOKEN_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Simple token validation
function validateToken(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    
    // Check if token is expired (24 hours)
    if (payload.timestamp && Date.now() - payload.timestamp > 24 * 60 * 60 * 1000) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Debug: Log environment variables
    console.log('Admin status - Environment variables:', {
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV
    });
    
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_token');

    console.log('Admin status check:', {
      hasToken: !!adminToken,
      tokenValue: adminToken ? adminToken.value.substring(0, 20) + '...' : 'none'
    });

    if (!adminToken) {
      console.log('No admin token found in cookies');
      return NextResponse.json({ isAdmin: false });
    }

    const decoded = validateToken(adminToken.value);
    console.log('Token validation result:', {
      hasDecoded: !!decoded,
      isAdmin: decoded?.isAdmin,
      timestamp: decoded?.timestamp
    });
    
    if (decoded && decoded.isAdmin === true) {
      return NextResponse.json({ isAdmin: true });
    } else {
      return NextResponse.json({ isAdmin: false });
    }
  } catch (error) {
    console.error('Admin status check error:', error);
    return NextResponse.json({ isAdmin: false });
  }
}
