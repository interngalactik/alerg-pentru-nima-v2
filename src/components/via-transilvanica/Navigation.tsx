'use client';

import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Map as MapIcon } from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function Navigation() {
  const pathname = usePathname();
  const isAdminPage = pathname === '/admin';

  return (
    <Box
      sx={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}
    >
      {!isAdminPage ? (
        <Link href="/" passHref>
          <Box
            sx={{
              zIndex: 1,
              width: '5em',
              marginTop: '1.5em',
              marginLeft: '2em',
              transition: 'opacity 0.2s',
              position: 'relative',
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.7
              }
            }}
          >
            <Image
              src="/images/alerg-pentru-nima-logo.svg"
              alt="Alerg pentru Nima"
              width={200}
              height={50}
              style={{ 
                width: '100%',
                height: 'auto'
              }}
            />
          </Box>
        </Link>
      ) : (
        <Link href="/via-transilvanica" passHref>
          <Button
            variant="contained"
            startIcon={<MapIcon />}
            sx={{ 
              backgroundColor: 'white', 
              color: 'primary.main',
              boxShadow: 2,
              '&:hover': {
                backgroundColor: 'grey.100'
              }
            }}
          >
            Înapoi la Hartă
          </Button>
        </Link>
      )}
    </Box>
  );
} 