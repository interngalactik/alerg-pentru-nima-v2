import React, { useState } from 'react';
import { useMapEvents } from 'react-leaflet';
import { Box, Button, Dialog, DialogContent, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { WaypointFormData } from '../../types/waypoint';

interface MapClickHandlerProps {
  isAdmin: boolean;
  onAddWaypoint: (data: WaypointFormData) => void;
}

export default function MapClickHandler({ isAdmin, onAddWaypoint }: MapClickHandlerProps) {
  const [clickedPosition, setClickedPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useMapEvents({
    click: (e) => {
      if (isAdmin) {
        setClickedPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
        setShowAddDialog(true);
      }
    },
  });

  const handleAddWaypoint = () => {
    if (clickedPosition) {
      const waypointData = {
        name: '',
        type: 'intermediary' as const,
        details: '',
        coordinates: clickedPosition
      };
      console.log('MapClickHandler sending waypoint data:', waypointData);
      // Just trigger the form to open with the clicked coordinates
      onAddWaypoint(waypointData);
      setShowAddDialog(false);
      setClickedPosition(null);
    }
  };

  const handleClose = () => {
    setShowAddDialog(false);
    setClickedPosition(null);
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Dialog 
      open={showAddDialog} 
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogContent>
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="h6" gutterBottom>
            Adaugă Waypoint Nou
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Ai dat click pe coordonatele: {clickedPosition?.lat.toFixed(6)}, {clickedPosition?.lng.toFixed(6)}
          </Typography>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddWaypoint}
            size="large"
            sx={{ mr: 1 }}
          >
            Adaugă Waypoint
          </Button>

          <Button
            variant="outlined"
            onClick={handleClose}
            size="large"
          >
            Anulează
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
