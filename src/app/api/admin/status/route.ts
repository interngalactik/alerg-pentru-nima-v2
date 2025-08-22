import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Simple token secret from environment variable
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'your-secret-key-change-this';

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
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_token');

    if (!adminToken) {
      return NextResponse.json({ isAdmin: false });
    }

    const decoded = validateToken(adminToken.value);
    
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
