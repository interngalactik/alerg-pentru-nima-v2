'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Box,
  Typography,
  IconButton
} from '@mui/material';
import { Close as CloseIcon, Lock as LockIcon } from '@mui/icons-material';

interface AdminLoginDialogProps {
  open: boolean;
  onClose: () => void;
  onLogin: (password: string) => Promise<boolean>;
}

const AdminLoginDialog: React.FC<AdminLoginDialogProps> = ({
  open,
  onClose,
  onLogin
}) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Parola este obligatorie');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await onLogin(password);
      if (success) {
        onClose();
        setPassword('');
      } else {
        setError('Parolă incorectă');
      }
    } catch (error) {
      setError('Eroare la autentificare');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <LockIcon color="primary" />
            <Typography variant="h6">
              Acces Administrator
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Introduceți parola pentru a accesa funcțiile de administrator
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            type="password"
            label="Parolă"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            autoFocus
            placeholder="Introduceți parola de administrator"
            disabled={loading}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Anulează
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading || !password.trim()}
            startIcon={loading ? undefined : <LockIcon />}
          >
            {loading ? 'Se verifică...' : 'Accesează'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AdminLoginDialog;
