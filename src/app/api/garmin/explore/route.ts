import { NextRequest, NextResponse } from 'next/server';

interface GarminCredentials {
  email: string;
  password: string;
}

class GarminExploreService {
  private baseUrl = 'https://explore.garmin.com';

  // Test Garmin Explore access
  async testAccess(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('🧪 Testing Garmin Explore access...');
      
      // Try to access the main explore page
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      console.log('🧪 Explore response status:', response.status);
      console.log('🧪 Explore response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const html = await response.text();
        console.log('🧪 Explore HTML length:', html.length);
        
        // Look for login/signin elements
        const hasLogin = html.includes('login') || html.includes('signin') || html.includes('Sign In');
        const hasInReach = html.includes('inreach') || html.includes('InReach') || html.includes('messenger');
        
        return {
          success: true,
          message: 'Garmin Explore accessible',
          data: {
            status: response.status,
            hasLogin,
            hasInReach,
            htmlLength: html.length,
            sampleHtml: html.substring(0, 1000)
          }
        };
      } else {
        return {
          success: false,
          message: `Failed to access Garmin Explore: ${response.status}`
        };
      }
    } catch (error) {
      console.error('🧪 Explore test error:', error);
      return {
        success: false,
        message: `Error testing Explore: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Try to find InReach-specific endpoints
  async findInReachEndpoints(): Promise<{ success: boolean; message: string; endpoints?: string[] }> {
    try {
      console.log('🔍 Searching for InReach endpoints...');
      
      const possibleEndpoints = [
        `${this.baseUrl}/inreach`,
        `${this.baseUrl}/messenger`,
        `${this.baseUrl}/devices`,
        `${this.baseUrl}/api/devices`,
        `${this.baseUrl}/api/inreach`,
        `${this.baseUrl}/api/messenger`
      ];

      const results = [];
      
      for (const endpoint of possibleEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
          
          results.push({
            endpoint,
            status: response.status,
            accessible: response.ok
          });
          
          console.log(`🔍 ${endpoint}: ${response.status} ${response.ok ? 'OK' : 'FAILED'}`);
        } catch (error) {
          results.push({
            endpoint,
            status: 'ERROR',
            accessible: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return {
        success: true,
        message: 'Endpoint search completed',
        endpoints: results
      };
    } catch (error) {
      console.error('🔍 Endpoint search error:', error);
      return {
        success: false,
        message: `Error searching endpoints: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// GET /api/garmin/explore - Test Garmin Explore access
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'test';
    
    console.log('🧪 Garmin Explore API called with action:', action);
    
    const exploreService = new GarminExploreService();

    switch (action) {
      case 'test':
        const testResult = await exploreService.testAccess();
        return NextResponse.json(testResult);

      case 'endpoints':
        const endpointsResult = await exploreService.findInReachEndpoints();
        return NextResponse.json(endpointsResult);

      default:
        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Garmin Explore API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
