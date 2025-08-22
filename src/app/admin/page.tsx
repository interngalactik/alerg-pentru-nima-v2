'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import { Login as LoginIcon, Person as PersonIcon } from '@mui/icons-material';
import { AdminAuthService } from '@/lib/adminAuthService';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      if (await AdminAuthService.isAdminLoggedIn()) {
        // Already logged in, redirect to map
        router.push('/via-transilvanica');
      }
    };
    checkAuth();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Parola este obligatorie');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use the new authentication system
      const success = await AdminAuthService.login(password);
      
      if (success) {
        // Redirect back to map with admin access
        router.push('/via-transilvanica');
      } else {
        setError('Parolă incorectă');
      }
    } catch (error) {
      setError('Eroare la autentificare');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box textAlign="center" mb={3}>
          <PersonIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Acces Administrator
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Via Transilvanica Trail Map
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleLogin}>
          <TextField
            fullWidth
            type="password"
            label="Parolă Administrator"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            autoFocus
            placeholder="Introduceți parola de administrator"
            disabled={loading}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
            disabled={loading || !password.trim()}
            sx={{ mt: 3 }}
          >
            {loading ? 'Se verifică...' : 'Accesează'}
          </Button>
        </form>

        <Box mt={3} textAlign="center">
          <Button
            variant="text"
            onClick={() => router.push('/via-transilvanica')}
            sx={{ textTransform: 'none' }}
          >
            ← Înapoi la hartă
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
