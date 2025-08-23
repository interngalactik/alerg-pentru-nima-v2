'use client';

import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Paper, LinearProgress, Chip, Grid, Card, CardContent, Button } from '@mui/material';
import { LocationOn, DirectionsWalk, Timer, TrendingUp } from '@mui/icons-material';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Navigation from '@/components/via-transilvanica/Navigation';
import GarminTracker from '@/components/via-transilvanica/GarminTracker';
import CryptoJS from 'crypto-js';


// Dynamically import the map component to avoid SSR issues
const TrailMap = dynamic(() => import('@/components/via-transilvanica/TrailMap'), {
  ssr: false,
  loading: () => <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading map...</Box>
});

const ViaTransilvanicaPage = () => {
  const [currentProgress, setCurrentProgress] = useState(0); // 0-100 percentage
  const [currentLocation, setCurrentLocation] = useState({ lat: 46.0569, lng: 24.2603 }); // Sibiu coordinates
  const [totalDistance, setTotalDistance] = useState(1400); // km
  const [completedDistance, setCompletedDistance] = useState(0); // km
  const [startDate] = useState(new Date('2025-09-01T08:00:00')); // Planned start date at 8:00 AM
  const [currentDate, setCurrentDate] = useState(new Date());
  const [actualStartPoint, setActualStartPoint] = useState<[number, number] | null>(null);
  const [isClient, setIsClient] = useState(false); // Add client-side only state
  const [trackProgress, setTrackProgress] = useState<{ completedDistance: number; totalDistance: number; progressPercentage: number } | null>(null);
  const [smsCount, setSmsCount] = useState(0);


  // Set client-side flag after mount to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update current date every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate progress percentage
  useEffect(() => {
    const progress = (completedDistance / totalDistance) * 100;
    setCurrentProgress(Math.min(progress, 100));
  }, [completedDistance, totalDistance]);



  // Calculate countdown only on client side
  const timeUntilStart = isClient ? startDate.getTime() - currentDate.getTime() : 0;
  const daysUntilStart = isClient ? Math.floor(timeUntilStart / (1000 * 60 * 60 * 24)) : 0;
  const hoursUntilStart = isClient ? Math.floor((timeUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)) : 0;
  const minutesUntilStart = isClient ? Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60)) : 0;
  const secondsUntilStart = isClient ? Math.floor((timeUntilStart % (1000 * 60)) / 1000) : 0;

  // Calculate estimated completion (if already started)
  const estimatedCompletion = completedDistance > 0 && timeUntilStart <= 0
    ? new Date(currentDate.getTime() + (((trackProgress?.totalDistance || totalDistance) - completedDistance) / (completedDistance / Math.abs(daysUntilStart))) * 24 * 60 * 60 * 1000)
    : null;

  // Handle start point change from GPX data
  const handleStartPointChange = (startPoint: [number, number] | null) => {
    setActualStartPoint(startPoint);
  };

  // Handle progress update from TrailMap
  const handleProgressUpdate = (progress: { completedDistance: number; totalDistance: number; progressPercentage: number }) => {
    // Only update if the values have actually changed to prevent infinite loops
    setCompletedDistance(prev => progress.completedDistance !== prev ? progress.completedDistance : prev);
    setCurrentProgress(prev => progress.progressPercentage !== prev ? progress.progressPercentage : prev);
    setTrackProgress(prev => {
      if (!prev || 
          prev.completedDistance !== progress.completedDistance || 
          prev.totalDistance !== progress.totalDistance || 
          prev.progressPercentage !== progress.progressPercentage) {
        return progress;
      }
      return prev;
    });
  };

  // Fetch SMS count from API
  useEffect(() => {
    const fetchSmsCount = async () => {
      try {
        const authId = "675";
        const authKey = "8a0e3a142a901c2b9c90c94e40118d07";
        const apiUrl = `https://sms-2w-api.syscomdigital.ro/stats/total-donatori/${authId}`;
        const ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const startDate = new Date('2022-03-15');
        const fromDate = startDate.toISOString().slice(0, 10);

        const authorization = CryptoJS.SHA1(`${authKey}&${ts}`).toString();
        const data = new URLSearchParams({
          authorization: authorization,
          ts: ts,
          'from-date': fromDate,
        });

        const response = await fetch(apiUrl, {
          method: 'POST',
          body: data,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        const responseData = await response.text();
        const arr = responseData.split('"');
        const sms = arr[3];
        setSmsCount(parseInt(sms));
      } catch (err) {
        console.error('Error fetching SMS count:', err);
        // Keep the previous value if there's an error
      }
    };

    fetchSmsCount(); // Call fetch function on component mount
    const intervalId = setInterval(fetchSmsCount, 30 * 60 * 1000); // Fetch every 30 minutes

    return () => clearInterval(intervalId);
  }, []);



  return (
    <>
      <Navigation />
      <Container maxWidth="xl" sx={{ py: 4 }}>
                {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h4" component="h1" sx={{ 
            fontWeight: 'bold', 
            mb: 2
          }}>
            <span style={{ color: 'var(--blue)' }}>Alerg pentru Nima</span>{' '}
            <span style={{ color: '#000', fontFamily: 'cursive', fontStyle: 'italic', fontSize: '0.7em', opacity: 0.6 }}>pe</span>{' '}
            <span style={{ color: '#EF7D00' }}>Via Transilvanica</span>
          </Typography>
          <Typography variant="h5" sx={{ color: 'text.secondary', mb: 3 }}>
            1400 km pe drumul care unește
          </Typography>

          {/* Mission Statement */}
          <Box sx={{ mb: 4, width: '59em', mx: 'auto' }}>
            <Typography variant="body1" sx={{ mb: 2, fontSize: '1.2rem', lineHeight: 1.6 }}>
              Pe 1 septembrie 2025 {isClient && timeUntilStart > 0 ? 'voi porni' : 'am pornit'} în alergare pe traseul <a href="https://www.via-transilvanica.ro/" target='__blank' style={{ color: '#EF7D00', textDecoration: 'underline' }}>Via Transilvanica</a> pentru a susține{' '}
              <a href="https://sanctuarnima.ro" target='__blank'><strong style={{ color: 'var(--orange)', textDecoration: 'underline' }}>Sanctuarul Nima</strong></a> - primul sanctuar din România 
              destinat animalelor de fermă salvate de la abator sau exploatare.
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, fontSize: '1.2rem', lineHeight: 1.6 }}>
              Pentru a putea acoperi costurile de hrană lunară a celor peste 140 de animale au nevoie de 7000 de SMS-uri în valoare de 2 euro / lună. Alătură-te și tu celor {smsCount} de susținători.
<br></br>
<br></br>
Iar eu alerg pentru fiecare mesaj în parte.
            </Typography>
          </Box>

          {/* Countdown */}
          {isClient && timeUntilStart > 0 && (
            <Box sx={{ mb: 2, p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(255, 152, 0, 0.1)', borderRadius: 2 }}>
              <Typography variant="body1" sx={{ mb: 1, color: 'var(--blue)', fontWeight: 'bold' }}>
                Au mai rămas
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ textAlign: 'center', minWidth: 60 }}>
                  <Typography variant="h5" sx={{ color: 'var(--blue)', fontWeight: 'bold' }}>
                    {daysUntilStart}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    zile
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', minWidth: 60 }}>
                  <Typography variant="h5" sx={{ color: 'var(--blue)', fontWeight: 'bold' }}>
                    {hoursUntilStart.toString().padStart(2, '0')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ore
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', minWidth: 60 }}>
                  <Typography variant="h5" sx={{ color: 'var(--blue)', fontWeight: 'bold' }}>
                    {minutesUntilStart.toString().padStart(2, '0')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    minute
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', minWidth: 60 }}>
                  <Typography variant="h5" sx={{ color: 'var(--blue)', fontWeight: 'bold' }}>
                    {secondsUntilStart.toString().padStart(2, '0')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    secunde
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

          {/* Donation Call to Action */}
          <Box sx={{ mb: 4, p: 3, backgroundColor: 'rgba(25, 118, 210, 0.1)', borderRadius: 2, maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'var(--blue)' }}>
              Cum poți susține cauza?
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Donează <strong style={{ color: 'var(--orange)' }}>2 euro / lună</strong> pentru hrana animalelor salvate
            </Typography>
            <Button 
              variant="contained" 
              size="large"
              onClick={() => {
                const smsBody = "NIMA";
                const smsNumber = "8845";
                
                // Check if it's Android
                const isAndroid = /android/i.test(navigator.userAgent);
                const smsLink = isAndroid 
                  ? `sms:${smsNumber}?body=${smsBody}`  // Android format
                  : `sms://${smsNumber}&body=${encodeURIComponent(smsBody)}`; // iOS format
                
                window.location.href = smsLink;
              }}
              sx={{ 
                backgroundColor: 'var(--orange)',
                color: 'white',
                fontSize: '1.1rem',
                padding: '12px 24px',
                '&:hover': {
                  backgroundColor: 'var(--orange)',
                  opacity: 0.9
                },
                textTransform: 'none'
              }}
            >
              Trimite NIMA prin SMS la 8845
            </Button>
            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary', fontSize: '0.8rem', fontStyle: 'italic', opacity: 0.6 }}>
              * Pentru dezabonare, trimite "NIMA STOP" la 8845
            </Typography>
          </Box>
        </Box>


        {/* Map Section */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'var(--blue)' }}>
            Traseul Via Transilvanica
          </Typography>
                      <TrailMap
              currentLocation={currentLocation}
              progress={currentProgress}
              completedDistance={completedDistance}
              onStartPointChange={handleStartPointChange}
              onProgressUpdate={handleProgressUpdate}
            />
        </Paper>

                {/* Garmin InReach Tracker */}
                <GarminTracker 
          trailPoints={[]} // This will be populated from GPX data
          totalDistance={trackProgress?.totalDistance || totalDistance}
          trackProgress={trackProgress}
        />


      </Container>
    </>
  );
};

export default ViaTransilvanicaPage; 