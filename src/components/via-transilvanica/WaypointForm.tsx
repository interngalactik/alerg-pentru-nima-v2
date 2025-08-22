'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert
} from '@mui/material';
import { WaypointFormData } from '../../types/waypoint';

interface WaypointFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: WaypointFormData) => void;
  initialData?: WaypointFormData;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export default function WaypointForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData, 
  coordinates 
}: WaypointFormProps) {
  const [formData, setFormData] = useState<WaypointFormData>({
    name: '',
    type: 'intermediary',
    details: '',
    coordinates: coordinates
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log('WaypointForm useEffect - isOpen:', isOpen, 'initialData:', initialData, 'coordinates:', coordinates);
    if (initialData) {
      setFormData(initialData);
      setIsInitialized(true);
    } else if (isOpen) {
      // Always initialize form when opening for a new waypoint
      const newFormData: WaypointFormData = {
        name: '',
        type: 'intermediary',
        details: '',
        coordinates: coordinates
      };
      console.log('Setting form data:', newFormData);
      setFormData(newFormData);
      setIsInitialized(true);
    }
    setErrors({});
  }, [initialData, isOpen, coordinates]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Numele este obligatoriu';
    }

    // Details are now optional, so no validation needed

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      console.error('Error submitting waypoint:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsInitialized(false);
    setErrors({});
    onClose();
  };

  const handleInputChange = (field: keyof WaypointFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleCoordinateChange = (field: 'lat' | 'lng', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setFormData(prev => ({
        ...prev,
        coordinates: {
          ...prev.coordinates,
          [field]: numValue
        }
      }));
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initialData ? 'Editează Waypoint' : 'Adaugă Waypoint Nou'}
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Name Field */}
            <TextField
              label="Nume"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              fullWidth
              required
            />

            {/* Type Field */}
            <FormControl fullWidth required>
              <InputLabel>Tip</InputLabel>
              <Select
                value={formData.type}
                label="Tip"
                onChange={(e) => handleInputChange('type', e.target.value)}
              >
                <MenuItem value="intermediary">Punct intermediar</MenuItem>
                <MenuItem value="finish-start">Finish/Start</MenuItem>
              </Select>
            </FormControl>

            {/* Details Field */}
            <TextField
              label="Detalii (opțional)"
              value={formData.details}
              onChange={(e) => handleInputChange('details', e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Adaugă detalii despre acest punct (opțional)"
            />

            {/* Coordinates Display */}
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Coordonate
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Latitudine"
                  type="number"
                  value={formData.coordinates.lat}
                  onChange={(e) => handleCoordinateChange('lat', e.target.value)}
                  fullWidth
                  inputProps={{ step: 0.000001 }}
                />
                <TextField
                  label="Longitudine"
                  type="number"
                  value={formData.coordinates.lng}
                  onChange={(e) => handleCoordinateChange('lng', e.target.value)}
                  fullWidth
                  inputProps={{ step: 0.000001 }}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={isSubmitting}>
            Anulează
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Salvează...' : (initialData ? 'Actualizează' : 'Adaugă')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
