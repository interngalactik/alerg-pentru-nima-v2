export interface GPXWaypoint {
  lat: number;
  lng: number;
  name?: string;
  description?: string;
  elevation?: number;
}

export interface GPXTrack {
  name?: string;
  points: [number, number][];
  elevation?: number[];
  timestamps?: string[];
}

export interface ParsedGPX {
  waypoints: GPXWaypoint[];
  tracks: GPXTrack[];
}

export function parseGPX(gpxContent: string): ParsedGPX {
  console.log('Starting GPX parsing...');
  
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxContent, 'text/xml');
  
  // Check for parsing errors
  const parseError = xmlDoc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    console.error('XML parsing error:', parseError[0].textContent);
    throw new Error('Invalid GPX file format');
  }
  
  const waypoints: GPXWaypoint[] = [];
  const tracks: GPXTrack[] = [];

  // Parse waypoints
  const wptElements = xmlDoc.getElementsByTagName('wpt');
  console.log(`Found ${wptElements.length} waypoints`);
  
  for (let i = 0; i < wptElements.length; i++) {
    const wpt = wptElements[i];
    const lat = parseFloat(wpt.getAttribute('lat') || '0');
    const lon = parseFloat(wpt.getAttribute('lon') || '0');
    
    // Skip invalid coordinates
    if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) {
      continue;
    }
    
    const name = wpt.getElementsByTagName('name')[0]?.textContent || '';
    const desc = wpt.getElementsByTagName('desc')[0]?.textContent || '';
    const ele = wpt.getElementsByTagName('ele')[0]?.textContent;
    
    waypoints.push({
      lat,
      lng: lon,
      name,
      description: desc,
      elevation: ele ? parseFloat(ele) : undefined
    });
  }

  // Parse tracks
  const trkElements = xmlDoc.getElementsByTagName('trk');
  console.log(`Found ${trkElements.length} tracks`);
  
  for (let i = 0; i < trkElements.length; i++) {
    const trk = trkElements[i];
    const name = trk.getElementsByTagName('name')[0]?.textContent || `Track ${i + 1}`;
    
    const trksegElements = trk.getElementsByTagName('trkseg');
    console.log(`Track ${i + 1} has ${trksegElements.length} segments`);
    
    for (let j = 0; j < trksegElements.length; j++) {
      const trkseg = trksegElements[j];
      const trkptElements = trkseg.getElementsByTagName('trkpt');
      
      const points: [number, number][] = [];
      const elevation: number[] = [];
      const timestamps: string[] = [];

      console.log(`Segment ${j + 1} has ${trkptElements.length} points`);

      for (let k = 0; k < trkptElements.length; k++) {
        const trkpt = trkptElements[k];
        const lat = parseFloat(trkpt.getAttribute('lat') || '0');
        const lon = parseFloat(trkpt.getAttribute('lon') || '0');
        
        // Skip invalid coordinates
        if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) {
          continue;
        }
        
        points.push([lat, lon]);
        
        const ele = trkpt.getElementsByTagName('ele')[0]?.textContent;
        if (ele) {
          elevation.push(parseFloat(ele));
        }
        
        const time = trkpt.getElementsByTagName('time')[0]?.textContent;
        if (time) {
          timestamps.push(time);
        }
      }

      if (points.length > 0) {
        tracks.push({
          name,
          points,
          elevation: elevation.length > 0 ? elevation : undefined,
          timestamps: timestamps.length > 0 ? timestamps : undefined
        });
        console.log(`Added track segment with ${points.length} points`);
      }
    }
  }

  console.log(`Parsing complete: ${waypoints.length} waypoints, ${tracks.length} tracks`);
  return { waypoints, tracks };
}

export function calculateDistance(point1: [number, number], point2: [number, number]): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (point2[0] - point1[0]) * Math.PI / 180;
  const dLon = (point2[1] - point1[1]) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1[0] * Math.PI / 180) * Math.cos(point2[0] * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function calculateTotalDistance(points: [number, number][]): number {
  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    totalDistance += calculateDistance(points[i-1], points[i]);
  }
  return totalDistance;
} 