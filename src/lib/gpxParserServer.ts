import { parseString } from 'xml2js';
import { promisify } from 'util';

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

// Convert xml2js callback-based parsing to Promise-based
const parseXML = promisify(parseString);

export function parseGPXServer(gpxContent: string): Promise<ParsedGPX> {
  // console.log('Starting server-side GPX parsing...');
  
  return parseXML(gpxContent).then((result: any) => {
    const waypoints: GPXWaypoint[] = [];
    const tracks: GPXTrack[] = [];

    // Parse waypoints
    if (result.gpx && result.gpx.wpt) {
      const wptElements = Array.isArray(result.gpx.wpt) ? result.gpx.wpt : [result.gpx.wpt];
      
      wptElements.forEach((wpt: any) => {
        const lat = parseFloat(wpt.$.lat || '0');
        const lon = parseFloat(wpt.$.lon || '0');
        
        // Skip invalid coordinates
        if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) {
          return;
        }
        
        const name = wpt.name && wpt.name[0] ? wpt.name[0] : '';
        const desc = wpt.desc && wpt.desc[0] ? wpt.desc[0] : '';
        const ele = wpt.ele && wpt.ele[0] ? parseFloat(wpt.ele[0]) : undefined;
        
        waypoints.push({
          lat,
          lng: lon,
          name,
          description: desc,
          elevation: ele
        });
      });
    }

    // Parse tracks
    if (result.gpx && result.gpx.trk) {
      const trkElements = Array.isArray(result.gpx.trk) ? result.gpx.trk : [result.gpx.trk];
      
      trkElements.forEach((trk: any, trackIndex: number) => {
        const name = trk.name && trk.name[0] ? trk.name[0] : `Track ${trackIndex + 1}`;
        
        if (trk.trkseg) {
          const trksegElements = Array.isArray(trk.trkseg) ? trk.trkseg : [trk.trkseg];
          
          trksegElements.forEach((trkseg: any, segIndex: number) => {
            if (trkseg.trkpt) {
              const trkptElements = Array.isArray(trkseg.trkpt) ? trkseg.trkpt : [trkseg.trkpt];
              
              const points: [number, number][] = [];
              const elevation: number[] = [];
              const timestamps: string[] = [];

              trkptElements.forEach((trkpt: any) => {
                const lat = parseFloat(trkpt.$.lat || '0');
                const lon = parseFloat(trkpt.$.lon || '0');
                
                // Skip invalid coordinates
                if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) {
                  return;
                }
                
                points.push([lat, lon]);
                
                if (trkpt.ele && trkpt.ele[0]) {
                  elevation.push(parseFloat(trkpt.ele[0]));
                }
                
                if (trkpt.time && trkpt.time[0]) {
                  timestamps.push(trkpt.time[0]);
                }
              });

              if (points.length > 0) {
                tracks.push({
                  name,
                  points,
                  elevation: elevation.length > 0 ? elevation : undefined,
                  timestamps: timestamps.length > 0 ? timestamps : undefined
                });
              }
            }
          });
        }
      });
    }

    return { waypoints, tracks };
  }).catch((error: any) => {
    console.error('Error in server-side GPX parsing:', error);
    throw new Error(`Failed to parse GPX: ${error.message}`);
  });
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
