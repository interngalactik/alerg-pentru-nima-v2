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
  onCoordinateSelect?: (coordinates: { lat: number; lng: number }) => void;
}

export default function WaypointForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData, 
  coordinates,
  onCoordinateSelect
}: WaypointFormProps) {
  const [formData, setFormData] = useState<WaypointFormData>({
    name: '',
    type: 'intermediary',
    details: '',
    coordinates: coordinates,
    date: '',
    eta: '',
    startDate: '',
    startTime: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setIsInitialized(true);
    } else if (isOpen) {
      // Always initialize form when opening for a new waypoint
      const newFormData: WaypointFormData = {
        name: '',
        type: 'intermediary',
        details: '',
        coordinates: coordinates,
        date: '',
        eta: '',
        startDate: '',
        startTime: ''
      };
      setFormData(newFormData);
      setIsInitialized(true);
    }
    setErrors({});
  }, [initialData, isOpen, coordinates]);

  // Auto-set default values when waypoint type changes
  useEffect(() => {
    if (formData.type === 'finish-start') {
      // If we have an arrival date, set start date to next day
      if (formData.date && !formData.startDate) {
        const arrivalDate = new Date(formData.date);
        const nextDay = new Date(arrivalDate);
        nextDay.setDate(arrivalDate.getDate() + 1);
        const nextDayString = nextDay.toISOString().split('T')[0];
        
        setFormData(prev => ({
          ...prev,
          startDate: nextDayString,
          startTime: prev.startTime || '07:00'
        }));
      }
      // If no arrival date, set both to tomorrow
      else if (!formData.date && !formData.startDate) {
        setDefaultStartDateTime();
      }
    }
  }, [formData.type, formData.date]);

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
    
    // Auto-update start date when arrival date changes for finish/start waypoints
    if (field === 'date' && formData.type === 'finish-start' && value) {
      const arrivalDate = new Date(value as string);
      const nextDay = new Date(arrivalDate);
      nextDay.setDate(arrivalDate.getDate() + 1);
      
      const nextDayString = nextDay.toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        startDate: nextDayString
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

  // Calculate ETA based on previous movement (simplified calculation)
  const calculateETA = () => {
    // This is a placeholder - in a real app, you'd calculate based on:
    // - Previous waypoint distance
    // - Average movement speed
    // - Current progress
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return tomorrow.toISOString().split('T')[0];
  };

  // Set default date to today
  const setDefaultDate = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({
      ...prev,
      date: today
    }));
    
    // Auto-update start date for finish/start waypoints
    if (formData.type === 'finish-start') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextDayString = tomorrow.toISOString().split('T')[0];
      
      setFormData(prev => ({
        ...prev,
        startDate: nextDayString
      }));
    }
  };

  // Set default start date/time for finish/start waypoints
  const setDefaultStartDateTime = () => {
    // Use arrival date + 1 day if available, otherwise tomorrow
    let startDate: string;
    if (formData.date) {
      const arrivalDate = new Date(formData.date);
      const nextDay = new Date(arrivalDate);
      nextDay.setDate(arrivalDate.getDate() + 1);
      startDate = nextDay.toISOString().split('T')[0];
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      startDate = tomorrow.toISOString().split('T')[0];
    }
    
    const startTime = '07:00'; // Default start time 7:00 AM
    
    setFormData(prev => ({
      ...prev,
      startDate,
      startTime
    }));
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

            {/* Date Field - for all waypoint types */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                label="Data de sosire (opțional)"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                helperText="Data când vei ajunge la acest punct (data de sosire)"
              />
              <Button 
                variant="outlined" 
                size="small"
                onClick={setDefaultDate}
                sx={{ minWidth: 'auto', px: 2 }}
              >
                Astăzi
              </Button>
            </Box>

            {/* ETA Field - for intermediary waypoints */}
            {formData.type === 'intermediary' && (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  label="ETA (opțional)"
                  type="date"
                  value={formData.eta}
                  onChange={(e) => handleInputChange('eta', e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  helperText="Timpul estimat de sosire"
                />
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={calculateETA}
                  sx={{ minWidth: 'auto', px: 2 }}
                >
                  Calculează
                </Button>
              </Box>
            )}

            {/* Start Date and Time - for finish/start waypoints */}
            {formData.type === 'finish-start' && (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
                  <TextField
                    label="Data de start"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    helperText="Data când vei începe următoarea etapă"
                  />
                  <TextField
                    label="Ora de start"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    helperText="Ora când vei începe următoarea etapă"
                  />
                </Box>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={setDefaultStartDateTime}
                  sx={{ minWidth: 'auto', px: 2 }}
                >
                  {formData.date ? 'Următoarea zi' : 'Mâine 7:00'}
                </Button>
              </Box>
            )}

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

            {/* Coordinates Section */}
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Coordonate
              </Typography>
              
              {/* Coordinate Input Fields */}
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
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
              
              {/* Map Coordinate Selection */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Sau selectează coordonatele pe hartă:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => onCoordinateSelect?.(formData.coordinates)}
                    sx={{ minWidth: 'auto', px: 2 }}
                  >
                    Selectează pe hartă
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      handleCoordinateChange('lat', coordinates.lat.toString());
                      handleCoordinateChange('lng', coordinates.lng.toString());
                    }}
                    sx={{ minWidth: 'auto', px: 2 }}
                  >
                    Folosește locația curentă
                  </Button>
                </Box>
              </Box>
              
              {/* Current Coordinates Display */}
              <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 0.5, border: '1px solid #e0e0e0' }}>
                <Typography variant="caption" color="text.secondary">
                  Coordonatele curente: {formData.coordinates.lat.toFixed(6)}, {formData.coordinates.lng.toFixed(6)}
                </Typography>
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
