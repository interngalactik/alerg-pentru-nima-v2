'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

// Performance optimization: Debounce function
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

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

  // Performance optimization: Memoized default values
  const defaultFormData = useMemo(() => ({
    name: '',
    type: 'intermediary' as const,
    details: '',
    coordinates: coordinates,
    date: '',
    eta: '',
    startDate: '',
    startTime: ''
  }), [coordinates]);

  // Performance optimization: Debounced form submission
  const debouncedSubmit = useCallback(
    debounce((data: WaypointFormData) => {
      onSubmit(data);
    }, 100),
    [onSubmit]
  );

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setIsInitialized(true);
    } else if (isOpen) {
      // Always initialize form when opening for a new waypoint
      setFormData(defaultFormData);
      setIsInitialized(true);
    }
    setErrors({});
  }, [initialData, isOpen, defaultFormData]);

  // Performance optimization: Memoized default start date/time function
  const setDefaultStartDateTime = useCallback(() => {
    // If we have a selected date, use the next day from that date
    if (formData.date) {
      const selectedDate = new Date(formData.date);
      const nextDay = new Date(selectedDate);
      nextDay.setDate(selectedDate.getDate() + 1);
      const nextDayString = nextDay.toISOString().split('T')[0];
      
      setFormData(prev => ({
        ...prev,
        startDate: nextDayString,
        startTime: '07:00'
      }));
    } else {
      // Fallback to tomorrow if no date is selected
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];
      
      setFormData(prev => ({
        ...prev,
        startDate: tomorrowString,
        startTime: '07:00'
      }));
    }
  }, [formData.date]);

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
  }, [formData.type, formData.date, formData.startDate, setDefaultStartDateTime]);

  // Performance optimization: Memoized validation function
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Numele este obligatoriu';
    }

    if (!formData.coordinates || 
        Math.abs(formData.coordinates.lat) < 0.001 || 
        Math.abs(formData.coordinates.lng) < 0.001) {
      newErrors.coordinates = 'Coordonatele sunt obligatorii';
    }

    if (formData.type === 'finish-start') {
      if (!formData.date) {
        newErrors.date = 'Data de sosire este obligatorie pentru punctele de sosire/pornire';
      }
      if (!formData.startDate) {
        newErrors.startDate = 'Data de pornire este obligatorie pentru punctele de sosire/pornire';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Performance optimization: Memoized form submission handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Use debounced submit for better performance
      debouncedSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting waypoint:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, debouncedSubmit, onClose]);

  // Performance optimization: Memoized form change handler
  const handleFormChange = useCallback((field: keyof WaypointFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for the field being changed
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  }, [errors]);

  // Performance optimization: Memoized coordinate update handler
  const handleCoordinateUpdate = useCallback((lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      coordinates: { lat, lng }
    }));
    
    if (onCoordinateSelect) {
      onCoordinateSelect({ lat, lng });
    }
    
    // Clear coordinate error if it exists
    if (errors.coordinates) {
      setErrors(prev => ({
        ...prev,
        coordinates: ''
      }));
    }
  }, [onCoordinateSelect, errors.coordinates]);

  // Performance optimization: Memoized form fields to prevent unnecessary re-renders
  const formFields = useMemo(() => ({
    name: (
      <TextField
        fullWidth
        label="Nume punct"
        value={formData.name}
        onChange={(e) => handleFormChange('name', e.target.value)}
        error={!!errors.name}
        helperText={errors.name}
        margin="normal"
        size="small"
      />
    ),
    type: (
      <FormControl fullWidth margin="normal" size="small">
        <InputLabel>Tip punct</InputLabel>
        <Select
          value={formData.type}
          onChange={(e) => handleFormChange('type', e.target.value)}
          label="Tip punct"
        >
          <MenuItem value="intermediary">Punct Intermediar</MenuItem>
          <MenuItem value="finish-start">Sosire/Pornire Etapa</MenuItem>
        </Select>
      </FormControl>
    ),
    details: (
      <TextField
        fullWidth
        label="Detalii (opțional)"
        value={formData.details}
        onChange={(e) => handleFormChange('details', e.target.value)}
        margin="normal"
        size="small"
        multiline
        rows={3}
      />
    ),
    date: (
      <TextField
        fullWidth
        label="Data de sosire"
        type="date"
        value={formData.date}
        onChange={(e) => handleFormChange('date', e.target.value)}
        margin="normal"
        size="small"
        InputLabelProps={{ shrink: true }}
      />
    ),
    eta: (
      <TextField
        fullWidth
        label="ETA (opțional)"
        type="datetime-local"
        value={formData.eta}
        onChange={(e) => handleFormChange('eta', e.target.value)}
        margin="normal"
        size="small"
        InputLabelProps={{ shrink: true }}
      />
    ),
    startDate: (
      <TextField
        fullWidth
        label="Data de pornire"
        type="date"
        value={formData.startDate}
        onChange={(e) => handleFormChange('startDate', e.target.value)}
        margin="normal"
        size="small"
        InputLabelProps={{ shrink: true }}
      />
    ),
    startTime: (
      <TextField
        fullWidth
        label="Ora de pornire"
        type="time"
        value={formData.startTime}
        onChange={(e) => handleFormChange('startTime', e.target.value)}
        margin="normal"
        size="small"
        InputLabelProps={{ shrink: true }}
      />
    )
  }), [formData, errors, handleFormChange]);

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



  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initialData ? 'Editează Waypoint' : 'Adaugă Waypoint Nou'}
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Name Field */}
            {formFields.name}

            {/* Type Field */}
            {formFields.type}

            {/* Date Field - for all waypoint types */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {formFields.date}
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
                {formFields.eta}
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
                  {formFields.startDate}
                  {formFields.startTime}
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
            {formFields.details}

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
                  onChange={(e) => handleCoordinateUpdate(parseFloat(e.target.value), formData.coordinates.lng)}
                  fullWidth
                  inputProps={{ step: 0.000001 }}
                />
                <TextField
                  label="Longitudine"
                  type="number"
                  value={formData.coordinates.lng}
                  onChange={(e) => handleCoordinateUpdate(formData.coordinates.lat, parseFloat(e.target.value))}
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
                      handleCoordinateUpdate(coordinates.lat, coordinates.lng);
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
          <Button onClick={onClose} disabled={isSubmitting}>
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
