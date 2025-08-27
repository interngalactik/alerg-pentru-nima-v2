import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { AdminAuthService } from '../../lib/adminAuthService';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check admin status on mount
  React.useEffect(() => {
    const checkAdminStatus = async () => {
      const status = await AdminAuthService.isAdminLoggedIn();
      setIsLoggedIn(status);
    };
    checkAdminStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const success = await AdminAuthService.login(password);
      
      if (success) {
        setIsLoggedIn(true);
        onLoginSuccess();
      } else {
        setError('Parola incorectă');
      }
    } catch (error) {
      setError('Eroare la autentificare');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    AdminAuthService.logout();
    setIsLoggedIn(false);
    onLoginSuccess(); // This will refresh the admin status
  };

  if (isLoggedIn) {
    return (
      <Paper sx={{ p: 2, maxWidth: 300, mx: 'auto', mt: 2 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Admin Logat
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ești autentificat ca administrator
          </Typography>
          <Button
            variant="outlined"
            color="error"
            onClick={handleLogout}
            fullWidth
          >
            Deconectare
          </Button>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, maxWidth: 300, mx: 'auto', mt: 2 }}>
      <Box component="form" onSubmit={handleSubmit} sx={{ textAlign: 'center' }}>
        <LockIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Autentificare Admin
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Introdu parola pentru accesul de administrator
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <TextField
          type="password"
          label="Parolă"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
          required
        />
        
        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={isLoading}
        >
          {isLoading ? 'Se conectează...' : 'Conectare'}
        </Button>
      </Box>
    </Paper>
  );
}
