import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🧪 Test endpoint received:', body);
    
    const { apiKey, baseUrl } = body;
    
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing API key' 
      }, { status: 400 });
    }
    
    if (!baseUrl) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing base URL' 
      }, { status: 400 });
    }
    
    console.log('🧪 Testing API key:', apiKey.substring(0, 10) + '...');
    console.log('🧪 Testing base URL:', baseUrl);
    
    // Try a simple GET request to test basic connectivity
    console.log('🧪 Testing basic connectivity...');
    
    try {
      // Test with a simple endpoint that should exist
      const testResponse = await fetch(`${baseUrl}/Emergency/Respondent`, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });
      
      console.log('🧪 Test response status:', testResponse.status);
      console.log('🧪 Test response headers:', Object.fromEntries(testResponse.headers.entries()));
      
      if (testResponse.ok) {
        const testData = await testResponse.text();
        console.log('🧪 Test response data:', testData);
        
        return NextResponse.json({ 
          success: true, 
          message: 'API connectivity test successful',
          status: testResponse.status,
          data: testData
        });
      } else {
        const errorText = await testResponse.text();
        console.log('🧪 Test response error:', errorText);
        
        return NextResponse.json({ 
          success: false, 
          message: `API connectivity test failed: ${testResponse.status}`,
          status: testResponse.status,
          error: errorText
        });
      }
      
    } catch (fetchError) {
      console.error('🧪 Fetch error:', fetchError);
      return NextResponse.json({ 
        success: false, 
        message: `Fetch error: ${fetchError}` 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Error in test endpoint:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Test error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
