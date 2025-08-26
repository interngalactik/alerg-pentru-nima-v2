import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing different Garmin URLs...');
    
    // Try different possible Garmin URLs
    const urlsToTest = [
      'https://connect.garmin.com/auth/login',
      'https://connect.garmin.com/signin',
      'https://connect.garmin.com/login',
      'https://connect.garmin.com/',
      'https://www.garmin.com/en-US/account/signin/',
      'https://sso.garmin.com/sso/signin'
    ];

    const results = [];

    for (const url of urlsToTest) {
      try {
        console.log(`🧪 Testing URL: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          }
        });

        const result: any = {
          url,
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        };

        if (response.ok) {
          const html = await response.text();
          result.htmlLength = html.length;
          
          // Look for login-related content
          const hasLoginForm = html.includes('login') || html.includes('signin') || html.includes('username') || html.includes('password');
          result.hasLoginForm = hasLoginForm;
          
          // Look for CSRF token
          const csrfMatch = html.match(/name="csrf" value="([^"]+)"/);
          result.csrfToken = csrfMatch ? csrfMatch[1] : 'Not found';
          
          // Look for form fields
          const formFields = html.match(/name="([^"]+)"[^>]*>/g) || [];
          result.formFields = formFields.slice(0, 10);
          
          // Sample of HTML
          result.sampleHtml = html.substring(0, 500);
        }

        results.push(result);
        console.log(`🧪 ${url}: ${response.status} ${response.ok ? 'OK' : 'FAILED'}`);
        
      } catch (error) {
        console.log(`🧪 ${url}: ERROR - ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.push({
          url,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('🧪 Test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
