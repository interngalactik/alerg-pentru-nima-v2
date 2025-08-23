import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { GPXTrack } from '@/lib/gpxParser';

interface ElevationProfileProps {
  tracks: GPXTrack[];
  height?: number;
}

interface ElevationPoint {
  distance: number;
  elevation: number;
  lat: number;
  lng: number;
}

const ElevationProfile: React.FC<ElevationProfileProps> = ({ tracks, height = 200 }) => {
  // Calculate cumulative distance and extract elevation data
  const getElevationData = (): ElevationPoint[] => {
    if (!tracks || tracks.length === 0) return [];

    const elevationPoints: ElevationPoint[] = [];
    let cumulativeDistance = 0;

    tracks.forEach(track => {
      track.points.forEach((point, index) => {
        // Get elevation from the separate elevation array if available
        const elevation = track.elevation && track.elevation[index] ? track.elevation[index] : 0;
        
        if (index === 0) {
          // First point
          elevationPoints.push({
            distance: cumulativeDistance,
            elevation: elevation,
            lat: point[0],
            lng: point[1]
          });
        } else {
          // Calculate distance from previous point
          const prevPoint = track.points[index - 1];
          const distance = calculateDistance(
            prevPoint[0], prevPoint[1],
            point[0], point[1]
          );
          cumulativeDistance += distance;

          elevationPoints.push({
            distance: cumulativeDistance,
            elevation: elevation,
            lat: point[0],
            lng: point[1]
          });
        }
      });
    });

    return elevationPoints;
  };

  // Haversine formula to calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRadians = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

  const elevationData = getElevationData();

  if (elevationData.length === 0) {
    return (
      <Paper sx={{ p: 2, mt: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No elevation data available
        </Typography>
      </Paper>
    );
  }

  // Find min/max values for scaling
  const elevations = elevationData.map(p => p.elevation);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const totalDistance = elevationData[elevationData.length - 1]?.distance || 0;

  // Create SVG path for elevation profile
  const createElevationPath = (): string => {
    if (elevationData.length < 2) return '';

    const points = elevationData.map((point, index) => {
      const x = (point.distance / totalDistance) * 100;
      const y = 100 - ((point.elevation - minElevation) / (maxElevation - minElevation)) * 100;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  const elevationPath = createElevationPath();

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
        Profilul de Elevație - Via Transilvanica
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Distanța totală: {totalDistance.toFixed(1)} km
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Elevația minimă: {minElevation.toFixed(0)} m
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Elevația maximă: {maxElevation.toFixed(0)} m
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Diferența de elevație: {(maxElevation - minElevation).toFixed(0)} m
        </Typography>
      </Box>

      <Box sx={{ width: '100%', height, position: 'relative', overflow: 'hidden' }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f0f0f0" strokeWidth="0.5" />
            </pattern>
          </defs>
          
          {/* Background grid */}
          <rect width="100" height="100" fill="url(#grid)" />
          
          {/* Elevation profile line */}
          <path
            d={elevationPath}
            fill="none"
            stroke="#4caf50"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Fill area under the line */}
          <path
            d={`${elevationPath} L 100,100 L 0,100 Z`}
            fill="url(#elevationGradient)"
            opacity="0.3"
          />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="elevationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4caf50" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#4caf50" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Distance markers */}
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', px: 1 }}>
          {[0, 25, 50, 75, 100].map(percent => (
            <Typography key={percent} variant="caption" color="text.secondary">
              {((percent / 100) * totalDistance).toFixed(0)} km
            </Typography>
          ))}
        </Box>
        
        {/* Elevation markers */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', py: 1 }}>
          {[100, 75, 50, 25, 0].map(percent => (
            <Typography key={percent} variant="caption" color="text.secondary">
              {((percent / 100) * (maxElevation - minElevation) + minElevation).toFixed(0)} m
            </Typography>
          ))}
        </Box>
      </Box>
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Interpretare:</strong> Linia verde arată variația de elevație de-a lungul traseului. 
          Zonele mai înalte sunt reprezentate prin vârfuri, iar zonele mai joase prin văi.
        </Typography>
      </Box>
    </Paper>
  );
};

export default ElevationProfile;
