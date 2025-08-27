import { NextRequest, NextResponse } from 'next/server';

class GarminExploreInvestigator {
  private baseUrl = 'https://explore.garmin.com';

  // Investigate the InReach page structure
  async investigateInReachPage(token: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('🔍 Investigating InReach page structure...');
      
      // Get the InReach page
      const response = await fetch(`${this.baseUrl}/inreach`, {
        headers: {
          'Cookie': token,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Referer': `${this.baseUrl}/`
        }
      });

      if (!response.ok) {
        return { success: false, message: 'Failed to access InReach page' };
      }

      const html = await response.text();
      console.log('🔍 InReach page HTML length:', html.length);

      // 1. Look for JavaScript variables containing location data
      const jsLocationPatterns = [
        /var\s+location\s*=\s*({[^}]+})/gi,
        /var\s+coordinates\s*=\s*({[^}]+})/gi,
        /var\s+position\s*=\s*({[^}]+})/gi,
        /var\s+tracking\s*=\s*({[^}]+})/gi,
        /locationData\s*=\s*({[^}]+})/gi,
        /coordinatesData\s*=\s*({[^}]+})/gi
      ];

      const jsLocations: Array<{ pattern: string; data: string }> = [];
      jsLocationPatterns.forEach(pattern => {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          jsLocations.push({
            pattern: pattern.source,
            data: match[1]
          });
        }
      });

      // 2. Look for data attributes
      const dataAttrPatterns = [
        /data-location="([^"]+)"/gi,
        /data-coordinates="([^"]+)"/gi,
        /data-position="([^"]+)"/gi,
        /data-lat="([^"]+)"/gi,
        /data-lng="([^"]+)"/gi
      ];

      const dataAttrs: Array<{ pattern: string; value: string }> = [];
      dataAttrPatterns.forEach(pattern => {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          dataAttrs.push({
            pattern: pattern.source,
            value: match[1]
          });
        }
      });

      // 3. Look for API endpoints in JavaScript
      const apiPatterns = [
        /fetch\(['"]([^'"]*\/api\/[^'"]*)['"]/gi,
        /\.ajax\(['"]([^'"]*)['"]/gi,
        /\.get\(['"]([^'"]*)['"]/gi,
        /\.post\(['"]([^'"]*)['"]/gi,
        /url:\s*['"]([^'"]*)['"]/gi
      ];

      const apiEndpoints: Array<{ pattern: string; endpoint: string }> = [];
      apiPatterns.forEach(pattern => {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          apiEndpoints.push({
            pattern: pattern.source,
            endpoint: match[1]
          });
        }
      });

      // 4. Look for coordinate patterns in the HTML
      const coordPatterns = [
        /([0-9]{1,3}\.[0-9]+)[,\s]+([0-9]{1,3}\.[0-9]+)/g,
        /lat["\s]*:["\s]*([0-9.-]+)["\s]*,[\s]*lng["\s]*:["\s]*([0-9.-]+)/gi,
        /latitude["\s]*:["\s]*([0-9.-]+)["\s]*,[\s]*longitude["\s]*:["\s]*([0-9.-]+)/gi
      ];

      const coordinates: Array<{ pattern: string; lat: string; lng: string }> = [];
      coordPatterns.forEach(pattern => {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          coordinates.push({
            pattern: pattern.source,
            lat: match[1],
            lng: match[2] || match[1]
          });
        }
      });

      // 5. Look for script tags and their content
      const scriptTags = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
      const scriptContents = scriptTags.slice(0, 5).map((script, index) => ({
        index,
        content: script.substring(0, 500) // First 500 chars
      }));

      // 6. Look for specific InReach-related content
      const hasInReachContent = html.includes('inreach') || html.includes('InReach') || html.includes('messenger');
      const hasMapContent = html.includes('map') || html.includes('Map') || html.includes('tracking');
      const hasLocationContent = html.includes('location') || html.includes('Location') || html.includes('coordinates');

      return {
        success: true,
        message: 'Investigation completed',
        data: {
          pageLength: html.length,
          hasInReachContent,
          hasMapContent,
          hasLocationContent,
          jsLocations,
          dataAttrs,
          apiEndpoints,
          coordinates,
          scriptContents,
          sampleHtml: html.substring(0, 1000)
        }
      };

    } catch (error) {
      console.error('🔍 Investigation error:', error);
      return {
        success: false,
        message: `Investigation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Test potential API endpoints
  async testApiEndpoints(token: string, endpoints: string[]): Promise<{ success: boolean; message: string; results?: any[] }> {
    try {
      console.log('🧪 Testing potential API endpoints...');
      
      const results = [];
      
      for (const endpoint of endpoints.slice(0, 10)) { // Test first 10
        try {
          const fullUrl = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
          console.log(`🧪 Testing: ${fullUrl}`);
          
          const response = await fetch(fullUrl, {
            headers: {
              'Cookie': token,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
          
          results.push({
            endpoint: fullUrl,
            status: response.status,
            accessible: response.ok,
            contentType: response.headers.get('content-type')
          });
          
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
        message: 'API endpoint testing completed',
        results
      };

    } catch (error) {
      console.error('🧪 API testing error:', error);
      return {
        success: false,
        message: `API testing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// GET /api/garmin/explore/investigate - Investigate InReach page
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'investigate';
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ success: false, message: 'Token parameter required' }, { status: 400 });
    }
    
    console.log('🔍 Garmin Explore Investigation API called with action:', action);
    
    const investigator = new GarminExploreInvestigator();

    switch (action) {
      case 'investigate':
        const investigateResult = await investigator.investigateInReachPage(token);
        return NextResponse.json(investigateResult);

      case 'test-apis':
        const endpoints = searchParams.get('endpoints')?.split(',') || [];
        const testResult = await investigator.testApiEndpoints(token, endpoints);
        return NextResponse.json(testResult);

      default:
        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Garmin Explore Investigation API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
