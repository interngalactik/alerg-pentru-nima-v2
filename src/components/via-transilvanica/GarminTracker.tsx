'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  Grid, 
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  LocationOn, 
  MyLocation, 
  Refresh, 
  Timeline,
  Speed
} from '@mui/icons-material';
import { locationService, LocationPoint } from '@/lib/locationService';
import { TrailProgress } from '@/lib/trailProgressService';

interface GarminTrackerProps {
  trailPoints: [number, number][];
  totalDistance: number;
  trackProgress?: { completedDistance: number; totalDistance: number; progressPercentage: number } | null;
  onProgressUpdate?: (progress: TrailProgress) => void;
}

const GarminTracker: React.FC<GarminTrackerProps> = ({ 
  trailPoints, 
  totalDistance, 
  trackProgress: mapTrackProgress,
  onProgressUpdate 
}) => {
  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(null);
  const [progress, setProgress] = useState<TrailProgress | null>(null);
  const [locations, setLocations] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadData();
    
    // Set up real-time listeners
    const unsubscribeLocations = locationService.onLocationsUpdate(setLocations);
    const unsubscribeProgress = locationService.onProgressUpdate(setProgress);
    
    return () => {
      unsubscribeLocations();
      unsubscribeProgress();
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [locationsData, progressData] = await Promise.all([
        locationService.getLocations(),
        locationService.getProgress()
      ]);
      
      setLocations(locationsData);
      setProgress(progressData);
      
      if (locationsData.length > 0) {
        setCurrentLocation(locationsData[locationsData.length - 1]);
      }
    } catch (err) {
      setError('Failed to load tracking data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualLocationUpdate = async () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (isNaN(lat) || isNaN(lng)) {
      setError('Please enter valid coordinates');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await locationService.simulateLocationUpdate(lat, lng);
      
      // Clear manual input
      setManualLat('');
      setManualLng('');
      
      // Reload data
      await loadData();
      
    } catch (err) {
      setError('Failed to update location');
      console.error('Error updating location:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const getCurrentProgress = () => {
    if (!mapTrackProgress || totalDistance <= 0) return 0;
    const completedDistance = Math.min(mapTrackProgress.completedDistance, totalDistance);
    return Math.min((completedDistance / totalDistance) * 100, 100);
  };



  if (loading && locations.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ color: 'var(--blue)', fontWeight: 'bold' }}>
          <MyLocation sx={{ mr: 1, verticalAlign: 'middle' }} />
          Tracking
        </Typography>
        <Tooltip title="Refresh tracking data">
          <span>
            <IconButton onClick={handleRefresh} disabled={loading}>
              <Refresh />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Current Status */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, backgroundColor: 'rgba(25, 118, 210, 0.05)' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'var(--blue)' }}>
              Starea actuală
            </Typography>
            
            {currentLocation ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocationOn sx={{ mr: 1, color: 'var(--orange)' }} />
                  <Typography variant="body2">
                    {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Ultima actualizare: {new Date(currentLocation.timestamp).toLocaleString()}
                </Typography>
                {currentLocation.accuracy && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Acuratețe: ±{currentLocation.accuracy}m
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nu există date de localizare disponibile
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Progress Overview */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, backgroundColor: 'rgba(76, 175, 80, 0.05)' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'var(--blue)' }}>
              Progresul traseului
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Timeline sx={{ mr: 1, color: 'var(--orange)' }} />
              <Typography variant="body2">
                {mapTrackProgress?.completedDistance ? mapTrackProgress.completedDistance.toFixed(2) : '0.00'} km / {totalDistance.toFixed(2)} km
              </Typography>
            </Box>
            {mapTrackProgress?.completedDistance && mapTrackProgress.completedDistance > totalDistance && (
              <Typography variant="caption" color="warning.main" display="block">
                ⚠️ Completed distance exceeds total distance. Using total distance as maximum.
              </Typography>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Speed sx={{ mr: 1, color: 'var(--orange)' }} />
              <Typography variant="body2">
                {getCurrentProgress().toFixed(1)}% Complet
              </Typography>
            </Box>

            {/* ETA calculation removed - not available in new progress system */}
          </Paper>
        </Grid>

        {/* Manual Location Update */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, backgroundColor: 'rgba(255, 152, 0, 0.05)' }}>
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'var(--blue)' }}>
              Manual Location Update (Testing)
            </Typography>
            
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Latitude"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  placeholder="e.g., 47.866123"
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Longitude"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  placeholder="e.g., 25.598178"
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  variant="contained"
                  onClick={handleManualLocationUpdate}
                  disabled={loading || !manualLat || !manualLng}
                  startIcon={loading ? <CircularProgress size={16} /> : <LocationOn />}
                  sx={{ backgroundColor: 'var(--orange)' }}
                >
                  Update Location
                </Button>
              </Grid>
            </Grid>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Use this to simulate Garmin InReach location updates for testing
            </Typography>
          </Paper>
        </Grid>

        {/* Location History */}
        {locations.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, color: 'var(--blue)' }}>
                Location History ({locations.length} points)
              </Typography>
              
              <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                {locations.slice(-10).reverse().map((location) => (
                  <Box key={location.id} sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    p: 1,
                    borderBottom: '1px solid rgba(0,0,0,0.1)',
                    '&:last-child': { borderBottom: 'none' }
                  }}>
                    <Box>
                      <Typography variant="body2">
                        {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(location.timestamp).toLocaleString()}
                      </Typography>
                    </Box>
                    <Chip 
                      label={`±${location.accuracy || 'N/A'}m`} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default GarminTracker; 