'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  TrendingUp,
  Speed
} from '@mui/icons-material';
import { locationService, LocationPoint } from '@/lib/locationService';

import { AdminAuthService } from '@/lib/adminAuthService';
import { GarminService } from '@/lib/garminService';
import { runTimelineService, RunTimeline } from '@/lib/runTimelineService';
import { waypointCompletionService } from '@/lib/waypointCompletionService';

interface GarminTrackerProps {
  totalDistance: number;
  trackProgress?: { completedDistance: number; totalDistance: number; progressPercentage: number } | null;
  elevationData?: number[];
}

const GarminTracker: React.FC<GarminTrackerProps> = ({ 
  totalDistance,
  trackProgress,
  elevationData
}) => {
  // Helper functions for elevation calculations - using the same logic as TrailMap overlay
  const calculateCompletedElevationGain = (elevationData: number[], progressPercentage: number) => {
    if (elevationData.length === 0 || progressPercentage === 0) {
      return 0;
    }
    
    // Calculate how many elevation points correspond to the completed progress
    const totalPoints = elevationData.length;
    const completedPoints = Math.floor((progressPercentage / 100) * totalPoints);
    
    // Use the same logic as TrailMap: slice elevation data to completed portion
    const completedElevations = elevationData.slice(0, completedPoints);
    
    let completedElevationGain = 0;
    for (let i = 1; i < completedElevations.length; i++) {
      const elevationDiff = completedElevations[i] - completedElevations[i - 1];
      if (elevationDiff > 0) {
        completedElevationGain += elevationDiff;
      }
    }
    return completedElevationGain;
  };

  const calculateTotalElevationGain = (elevationData: number[]) => {
    if (elevationData.length === 0) {
      return 0;
    }
    
    // Use the exact same logic as TrailMap overlay
    let totalElevationGain = 0;
    for (let i = 1; i < elevationData.length; i++) {
      const elevationDiff = elevationData[i] - elevationData[i - 1];
      if (elevationDiff > 0) {
        totalElevationGain += elevationDiff;
      }
    }
    return totalElevationGain;
  };

  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(null);
  const [locations, setLocations] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [garminEmail, setGarminEmail] = useState('');
  const [garminPassword, setGarminPassword] = useState('');
  const [garminConnected, setGarminConnected] = useState(false);
  const [garminConnecting, setGarminConnecting] = useState(false);
  const [garminError, setGarminError] = useState<string | null>(null);
  const [runTimeline, setRunTimeline] = useState<RunTimeline | null>(null);
  const [startRunDate, setStartRunDate] = useState('');
  const [startRunTime, setStartRunTime] = useState('08:00');
  const [finishRunDate, setFinishRunDate] = useState('');
  const [finishRunTime, setFinishRunTime] = useState('18:00');
  
  // Create Garmin service instance (use useRef to maintain instance across renders)
  const garminServiceRef = useRef<GarminService | null>(null);
  
  // Initialize the service if it doesn't exist
  if (!garminServiceRef.current) {
    garminServiceRef.current = new GarminService();
  }
  
  const garminService = garminServiceRef.current;

  // Auto-configure Garmin service with API key from environment
  useEffect(() => {
    const configureGarminService = async () => {
      try {
        // Try to get API key from environment variables
        // Note: In Next.js, environment variables need to be prefixed with NEXT_PUBLIC_ to be available in browser
        const apiKey = process.env.NEXT_PUBLIC_GARMIN_API_KEY || process.env.GARMIN_API_KEY;
        
        if (apiKey) {
          garminService.setApiKey(apiKey);
          setGarminConnected(true);
        } else {
          console.log('⚠️ No GARMIN_API_KEY found in environment');
        }
      } catch (error) {
        console.error('❌ Error auto-configuring Garmin service:', error);
      }
    };
    
    configureGarminService();
  }, [garminService]);
  
  // These elevation variables are now available throughout the component:
  // - completedElevationGain: Current elevation gain based on progress
  // - totalElevationGain: Total elevation gain for the entire trail

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const isAdminUser = await AdminAuthService.isAdminLoggedIn();
        setIsAdmin(isAdminUser);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setAdminLoading(false);
      }
    };
    
    checkAdminStatus();
    
    // Set up interval to check admin status periodically
    const interval = setInterval(checkAdminStatus, 30000); // Check every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Automatic location fetching every 10 minutes (since Garmin updates every 10 minutes)
  useEffect(() => {
    const fetchLocationInterval = setInterval(async () => {
      try {
        // Only fetch if we have a Garmin service configured
        if (garminService && garminService.isAuthenticated()) {
          console.log('🔄 Auto-fetching location from Garmin...');
          const result = await garminService.getCurrentLocation();
          if (result.success && result.location) {
            console.log('✅ Auto-fetched location:', result.location);
            // Reload data to show new location
            await loadData();
          } else {
            console.log('⚠️ Auto-fetch failed:', result.message);
          }
        }
      } catch (error) {
        console.error('❌ Error in auto-fetch:', error);
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(fetchLocationInterval);
  }, [garminService]);

  // Load initial data
  useEffect(() => {
    loadData();
    loadRunTimeline();
    
    // Set up real-time listeners
    const unsubscribeLocations = locationService.onLocationsUpdate(setLocations);

    const unsubscribeTimeline = runTimelineService.onTimelineUpdate(setRunTimeline);
    
          return () => {
        unsubscribeLocations();
        unsubscribeTimeline();
      };
  }, []);

  // Load run timeline
  const loadRunTimeline = async () => {
    try {
      const timeline = await runTimelineService.getRunTimeline();
      setRunTimeline(timeline);
      if (timeline) {
        // Convert ISO dates to yyyy-MM-dd format for input fields
        const startDate = new Date(timeline.startDate);
        const finishDate = new Date(timeline.finishDate);
        
        setStartRunDate(startDate.toISOString().split('T')[0]);
        setStartRunTime(timeline.startTime);
        setFinishRunDate(finishDate.toISOString().split('T')[0]);
        setFinishRunTime(timeline.finishTime);
      }
    } catch (error) {
      console.error('Error loading run timeline:', error);
    }
  };

  // Set run timeline
  const handleSetRunTimeline = async () => {
    if (!startRunDate || !finishRunDate) {
      alert('Please set both start and finish dates');
      return;
    }

    if (new Date(startRunDate) >= new Date(finishRunDate)) {
      alert('Finish date must be after start date');
      return;
    }

    try {
      await runTimelineService.setRunTimeline({
        startDate: startRunDate,
        startTime: startRunTime,
        finishDate: finishRunDate,
        finishTime: finishRunTime
      });
      
      alert('✅ Run timeline set successfully!');
      
      // Clear previous waypoint completions when setting new timeline
      try {
        await waypointCompletionService.clearAllCompletions();
        console.log('✅ Previous waypoint completions cleared for new timeline');
      } catch (error) {
        console.warn('⚠️ Could not clear previous completions:', error);
      }
      
      await loadRunTimeline();
    } catch (error) {
      alert('❌ Error setting run timeline: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const locationsData = await locationService.getLocations();
      
      setLocations(locationsData);
      
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



  // Connect to Garmin InReach
  const handleGarminConnect = async () => {
    if (!garminEmail) {
      setGarminError('Please enter your API key');
      return;
    }

    try {
      setGarminConnecting(true);
      setGarminError(null);

      // Set the API key directly
      garminService.setApiKey(garminEmail, garminPassword || undefined);
      
      // Test the connection by trying to get tracking status
      const result = await garminService.getTrackingStatus();

      if (result.success) {
        setGarminConnected(true);
        setGarminError(null);
        startGarminLocationUpdates();
      } else {
        setGarminError(result.message || 'API key validation failed. Please check your API key.');
      }
    } catch (error) {
      console.error('Garmin connection error:', error);
      setGarminError(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setGarminConnecting(false);
    }
  };

  // Start automatic location updates from Garmin
  const startGarminLocationUpdates = () => {
    if (!garminService.isAuthenticated()) return;

    // Update location every 10 minutes (matching InReach frequency)
    const interval = setInterval(async () => {
      try {
        const result = await garminService.getCurrentLocation();
        if (result.success && result.location) {
          await locationService.addLocation({
            lat: result.location.latitude,
            lng: result.location.longitude,
            timestamp: new Date(result.location.timestamp).getTime(),
            elevation: result.location.elevation,
            accuracy: result.location.accuracy
          });
          
          // Refresh progress data after adding new location
          setTimeout(() => {
            loadData();
          }, 2000); // Wait 2 seconds for webhook to process
        }
      } catch (error) {
        console.error('Error updating location from Garmin:', error);
      }
    }, 10 * 60 * 1000); // 10 minutes

    // Cleanup on unmount
    return () => clearInterval(interval);
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
              {isAdmin && garminConnected && (
                <Chip 
                  label="InReach Connected" 
                  size="small" 
                  color="success" 
                  variant="outlined"
                  sx={{ ml: 1 }}
                />
              )}
              {isAdmin && runTimeline && (
                <Chip 
                  label={runTimelineService.getRunStatus(runTimeline)}
                  size="small" 
                  color={runTimelineService.isRunActive(runTimeline) ? "success" : "default"}
                  variant="outlined"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>

        {isAdmin && (
          <Tooltip title="Refresh tracking data">
            <span>
              <IconButton onClick={handleRefresh} disabled={loading}>
                <Refresh />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {isAdmin && (
          <Tooltip title="Force refresh progress data">
            <span>
              <IconButton 
                onClick={async () => {
                  try {
                    await loadData();
                    alert('✅ Progress data refreshed!');
                  } catch (error) {
                    alert('❌ Error refreshing: ' + (error instanceof Error ? error.message : 'Unknown error'));
                  }
                }} 
                disabled={loading}
                sx={{ ml: 1 }}
              >
                <Refresh color="primary" />
              </IconButton>
            </span>
          </Tooltip>
        )}
        
        {/* Manual Location Refresh Button - Admin Only */}
        {isAdmin && (
          <Tooltip title="Manually fetch current location from Garmin">
            <span>
              <IconButton 
                onClick={async () => {
                  try {
                    setLoading(true);
                    console.log('🔄 Manually fetching location from Garmin...');
                    
                    // First, request a fresh location update from the device
                    console.log('📡 Requesting fresh location update from InReach device...');
                    const updateResult = await garminService.requestLocationUpdate();
                    console.log('📡 Location update request result:', updateResult);
                    
                    // Wait a moment for the device to process
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Now fetch the current location
                    const result = await garminService.getCurrentLocation();
                    if (result.success && result.location) {
                      console.log('✅ Manual fetch successful:', result.location);
                      await loadData();
                      alert('✅ Location refreshed from Garmin!');
                    } else {
                      console.log('⚠️ Manual fetch failed:', result.message);
                      alert('⚠️ Failed to fetch location: ' + result.message);
                    }
                  } catch (error) {
                    console.error('❌ Error in manual fetch:', error);
                    alert('❌ Error fetching location: ' + (error instanceof Error ? error.message : 'Unknown error'));
                  } finally {
                    setLoading(false);
                  }
                }} 
                disabled={loading}
                sx={{ ml: 1 }}
              >
                <MyLocation color="secondary" />
              </IconButton>
            </span>
          </Tooltip>
        )}
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
                {trackProgress?.completedDistance ? trackProgress.completedDistance.toFixed(2) : '0.00'} km / {totalDistance.toFixed(2)} km
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TrendingUp sx={{ mr: 1, color: 'var(--orange)' }} />
              <Typography variant="body2">
                {elevationData && elevationData.length > 0 && trackProgress ? 
                  `${Math.round(calculateCompletedElevationGain(elevationData, trackProgress.progressPercentage))} m / ${Math.round(calculateTotalElevationGain(elevationData))} m` : 
                  '0 m / 0 m'
                }
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Speed sx={{ mr: 1, color: 'var(--orange)' }} />
              <Typography variant="body2">
                {trackProgress?.progressPercentage ? trackProgress.progressPercentage.toFixed(1) : '0.0'}% Complet
              </Typography>
            </Box>

            {/* Elevation Progress */}
            {/* {elevationData && elevationData.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ mr: 1 }}>
                  📈 Elevație: {completedElevationGain.toFixed(0)}m / {totalElevationGain.toFixed(0)}m
                </Typography>
              </Box>
            )} */}

            {/* ETA calculation removed - not available in new progress system */}
          </Paper>
        </Grid>

        {/* Manual Location Update - Admin Only */}
        {!adminLoading && isAdmin && (
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
        )}

        {/* Garmin InReach Configuration - Admin Only */}
        {!adminLoading && isAdmin && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, backgroundColor: 'rgba(76, 175, 80, 0.05)' }}>
              <Typography variant="subtitle2" sx={{ mb: 2, color: 'var(--blue)' }}>
                Garmin InReach Configuration
              </Typography>
              
              {garminError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setGarminError(null)}>
                  {garminError}
                </Alert>
              )}
              
              {garminConnected ? (
                <Box>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    ✅ Connected to Garmin InReach! Location updates will be fetched every 10 minutes.
                  </Alert>
                  <Button
                    variant="outlined"
                    onClick={async () => {
                      try {
                        const result = await garminService.getCurrentLocation();
                        if (result.success && result.location) {
                          await locationService.addLocation({
                            lat: result.location.latitude,
                            lng: result.location.longitude,
                            timestamp: new Date(result.location.timestamp).getTime(),
                            elevation: result.location.elevation,
                            accuracy: result.location.accuracy
                          });
                          alert('✅ Location fetched successfully!\nLat: ' + result.location.latitude.toFixed(6) + '\nLng: ' + result.location.longitude.toFixed(6));
                          
                          // Refresh progress data after adding new location
                          setTimeout(() => {
                            loadData();
                          }, 2000); // Wait 2 seconds for webhook to process
                        } else {
                          alert('❌ No location data available: ' + (result.message || 'Unknown error'));
                        }
                      } catch (error) {
                        alert('❌ Error fetching location: ' + (error instanceof Error ? error.message : 'Unknown error'));
                      }
                    }}
                    sx={{ mr: 1 }}
                  >
                    Test Fetch Location
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      garminService.logout();
                      setGarminConnected(false);
                      setGarminEmail('');
                      setGarminPassword('');
                    }}
                  >
                    Disconnect
                  </Button>
                </Box>
              ) : (
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="API Key"
                      value={garminEmail}
                      onChange={(e) => setGarminEmail(e.target.value)}
                      placeholder="Your Garmin IPC v2 API Key"
                      size="small"
                      fullWidth
                      type="password"
                      helperText="Get this from explore.garmin.com > Admin Controls > Portal Connect"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Custom API URL (Optional)"
                      value={garminPassword}
                      onChange={(e) => setGarminPassword(e.target.value)}
                      placeholder="e.g., https://your-tenant.inreachapp.com"
                      size="small"
                      fullWidth
                      helperText="Leave empty to use default IPC v2 URL"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      onClick={handleGarminConnect}
                      disabled={garminConnecting || !garminEmail}
                      startIcon={garminConnecting ? <CircularProgress size={16} /> : <LocationOn />}
                      sx={{ backgroundColor: 'var(--orange)', mr: 1 }}
                    >
                      {garminConnecting ? 'Connecting...' : 'Connect InReach'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setGarminEmail('');
                        setGarminPassword('');
                        setGarminError(null);
                      }}
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      Clear Fields
                    </Button>
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={async () => {
                        if (confirm('This will clear all test location data and start fresh. Are you sure?')) {
                          try {
                            // Clear all locations from Firebase
                            const locations = await locationService.getLocations();
                            for (const location of locations) {
                              await locationService.deleteLocation(location.id);
                            }
                            // Clear progress
                            await locationService.clearProgress();
                            // Reload data
                            await loadData();
                            alert('✅ All test data cleared! Ready for fresh start.');
                          } catch (error) {
                            alert('❌ Error clearing data: ' + (error instanceof Error ? error.message : 'Unknown error'));
                          }
                        }
                      }}
                      size="small"
                    >
                      Clear Test Data
                    </Button>
                  </Grid>
                </Grid>
              )}
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Connect your Garmin InReach Messenger using your IPC v2 API key for automatic location updates every 10 minutes
              </Typography>
            </Paper>
          </Grid>
        )}

        {/* Run Timeline Management - Admin Only */}
        {!adminLoading && isAdmin && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, backgroundColor: 'rgba(156, 39, 176, 0.05)' }}>
              <Typography variant="subtitle2" sx={{ mb: 2, color: 'var(--blue)' }}>
                Run Timeline Management
              </Typography>
              
              {runTimeline && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <strong>Current Status:</strong> {runTimelineService.getRunStatus(runTimeline)}
                  <br />
                  <strong>Start Date:</strong> {new Date(runTimeline.startDate).toLocaleDateString()}
                  <br />
                  <strong>Finish Date:</strong> {new Date(runTimeline.finishDate).toLocaleDateString()}
                </Alert>
              )}
              
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Start Date"
                    type="date"
                    value={startRunDate}
                    onChange={(e) => setStartRunDate(e.target.value)}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField
                    label="Start Time"
                    type="time"
                    value={startRunTime}
                    onChange={(e) => setStartRunTime(e.target.value)}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Finish Date"
                    type="date"
                    value={finishRunDate}
                    onChange={(e) => setFinishRunDate(e.target.value)}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField
                    label="Finish Time"
                    type="time"
                    value={finishRunTime}
                    onChange={(e) => setFinishRunTime(e.target.value)}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    variant="contained"
                    onClick={handleSetRunTimeline}
                    disabled={!startRunDate || !finishRunDate}
                    sx={{ backgroundColor: 'var(--purple)', mr: 1 }}
                  >
                    Set Timeline
                  </Button>
                  {runTimeline && (
                    <>
                      <Button
                        variant="outlined"
                        color="warning"
                        onClick={async () => {
                          if (confirm('This will clear all waypoint completions and start fresh. Are you sure?')) {
                            try {
                              await waypointCompletionService.clearAllCompletions();
                              alert('✅ All waypoint completions cleared! Ready for fresh start.');
                            } catch (error) {
                              alert('❌ Error clearing completions: ' + (error instanceof Error ? error.message : 'Unknown error'));
                            }
                          }
                        }}
                        size="small"
                        sx={{ mr: 1 }}
                      >
                        Clear Completions
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={async () => {
                          if (confirm('This will clear the run timeline. Are you sure?')) {
                            try {
                              await runTimelineService.clearRunTimeline();
                              setRunTimeline(null);
                              setStartRunDate('');
                              setFinishRunDate('');
                              alert('✅ Run timeline cleared!');
                            } catch (error) {
                              alert('❌ Error clearing timeline: ' + (error instanceof Error ? error.message : 'Unknown error'));
                            }
                          }
                        }}
                        size="small"
                      >
                        Clear Timeline
                      </Button>
                    </>
                  )}
                </Grid>
              </Grid>
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Set the start and finish dates for your Via Transilvanica run. Progress will only be tracked during this period.
              </Typography>
            </Paper>
          </Grid>
        )}

        {/* Location History - Admin Only */}
        {!adminLoading && isAdmin && locations.length > 0 && (
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