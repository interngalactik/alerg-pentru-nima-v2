'use client';

import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Home, DirectionsWalk } from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';

const Navigation: React.FC = () => {
  return (
    <AppBar 
      position="static" 
      sx={{ 
        backgroundColor: 'white', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        mb: 2
      }}
    >
      <Toolbar>
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '5em', marginTop: '1.5em', marginBottom: '1.5em' }}>
            <Image 
              src="/images/alerg-pentru-nima-logo.svg"
              alt="Alerg pentru Nima"
              width={120}
              height={30}
              style={{ height: 'auto' }}
            />
          </Box>
        </Link>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Button 
              startIcon={<Home />}
              sx={{ 
                color: 'var(--blue)',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.04)'
                }
              }}
            >
              Acasă
            </Button>
          </Link>
          
          <Button 
            startIcon={<DirectionsWalk />}
            sx={{ 
              backgroundColor: '#EF7D00',
              color: 'white',
              '&:hover': {
                backgroundColor: '#EF7D00',
                opacity: 0.9
              }
            }}
          >
            Via Transilvanica
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation; 