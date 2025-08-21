'use client';

import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Paper, LinearProgress, Chip, Grid, Card, CardContent, Button } from '@mui/material';
import { LocationOn, DirectionsWalk, Timer, TrendingUp } from '@mui/icons-material';
import dynamic from 'next/dynamic';
import Navigation from '@/components/via-transilvanica/Navigation';

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
    ? new Date(currentDate.getTime() + ((totalDistance - completedDistance) / (completedDistance / Math.abs(daysUntilStart))) * 24 * 60 * 60 * 1000)
    : null;

  // Handle start point change from GPX data
  const handleStartPointChange = (startPoint: [number, number] | null) => {
    setActualStartPoint(startPoint);
  };

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
              Pentru a putea acoperi costurile de hrană lunară a celor peste 140 de animale 
care își trăiesc viețile în pace și armonie în sanctuar, e nevoie de <strong style={{ color: 'var(--orange)' }}>7000 de susținători</strong> care să trimită un mesaj în valoare de <strong style={{ color: 'var(--orange)' }}>2 euro / lună</strong>.
<br></br>
<br></br>
Iar eu alerg pentru fiecare mesaj în parte.
            </Typography>
          </Box>

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
          
          {/* <Chip 
            label="Planificat" 
            color="warning" 
            icon={<DirectionsWalk />}
            sx={{ fontSize: '1.1rem', padding: 1 }}
          /> */}
        </Box>

                  {/* Countdown */}
           {isClient && timeUntilStart > 0 && (
            <Box sx={{ mb: 2, p: 2,  display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(255, 152, 0, 0.1)', borderRadius: 2 }}>
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
          />
        </Paper>

        {/* Current Status */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'var(--blue)' }}>
                <LocationOn sx={{ mr: 1, verticalAlign: 'middle' }} />
                Punctul de start
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Mănăstirea Putna</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Coordonate: {actualStartPoint ? `${actualStartPoint[0].toFixed(4)}, ${actualStartPoint[1].toFixed(4)}` : 'Se încarcă...'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Data de început: 1 Septembrie 2025, 08:00
              </Typography>
              {/* <Typography variant="body2" color="text.secondary">
                Mănăstirea medievală din Bucovina
              </Typography> */}
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'var(--blue)' }}>
                <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
                Planificare
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Durată estimată: 25 zile</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Distanță medie: {Math.ceil(totalDistance / 25)} km/zi
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Viteza estimată: 4-5 km/h
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <br />

                {/* Progress Overview */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={12}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'var(--blue)' }}>
                Progresul meu
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {completedDistance} km din {totalDistance} km
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentProgress.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={currentProgress} 
                  sx={{ 
                    height: 12, 
                    borderRadius: 6,
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: 'var(--blue)',
                      borderRadius: 6
                    }
                  }}
                />
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ color: 'var(--blue)', fontWeight: 'bold' }}>
                      {completedDistance}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      km parcurși
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ color: 'var(--blue)', fontWeight: 'bold' }}>
                      {totalDistance - completedDistance}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      km rămași
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ color: 'var(--blue)', fontWeight: 'bold' }}>
                      {isClient ? daysUntilStart : '...'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      zile până la început
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ color: 'var(--blue)', fontWeight: 'bold' }}>
                      25
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      zile estimat
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default ViaTransilvanicaPage; 