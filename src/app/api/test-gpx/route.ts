import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    console.log('Testing server-side GPX loading...');
    
    // Test file system access
    const gpxPath = join(process.cwd(), 'public', 'gpx', 'via-transilvanica.gpx');
    console.log('GPX file path:', gpxPath);
    console.log('Current working directory:', process.cwd());
    
    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(gpxPath)) {
      return NextResponse.json({ 
        error: 'GPX file not found',
        path: gpxPath,
        cwd: process.cwd()
      }, { status: 404 });
    }
    
    // Try to read the file
    const gpxContent = readFileSync(gpxPath, 'utf-8');
    console.log('GPX file loaded successfully, size:', gpxContent.length, 'characters');
    
    // Check file content
    if (gpxContent.length < 100) {
      return NextResponse.json({ 
        error: 'GPX file appears to be empty',
        size: gpxContent.length
      }, { status: 400 });
    }
    
    // Check if it's valid XML
    if (!gpxContent.includes('<gpx') || !gpxContent.includes('</gpx>')) {
      return NextResponse.json({ 
        error: 'File does not appear to be valid GPX XML',
        firstLine: gpxContent.substring(0, 100)
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'GPX file loaded and validated successfully',
      fileSize: gpxContent.length,
      filePath: gpxPath,
      firstLine: gpxContent.substring(0, 100),
      lastLine: gpxContent.substring(gpxContent.length - 100)
    });
    
  } catch (error) {
    console.error('Error testing GPX loading:', error);
    return NextResponse.json({ 
      error: 'Failed to test GPX loading',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
