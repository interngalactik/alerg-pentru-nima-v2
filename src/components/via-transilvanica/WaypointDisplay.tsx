'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { Waypoint } from '../../types/waypoint';

interface WaypointDisplayProps {
  waypoint: Waypoint;
  isAdmin: boolean;
  onEdit: (waypoint: Waypoint) => void;
  onDelete: (waypointId: string) => void;
  onClose: () => void;
}

export default function WaypointDisplay({ 
  waypoint, 
  isAdmin, 
  onEdit, 
  onDelete, 
  onClose 
}: WaypointDisplayProps) {
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'intermediary': return 'Punct intermediar';
      case 'finish-start': return 'Finish/Start';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'intermediary': return 'primary';
      case 'finish-start': return 'warning';
      default: return 'default';
    }
  };

  const handleShare = async () => {
    try {
      const shareData = {
        title: waypoint.name,
        text: `${waypoint.name} - ${getTypeLabel(waypoint.type)}`,
        url: window.location.href
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        const textToCopy = `${waypoint.name} - ${getTypeLabel(waypoint.type)}\n${waypoint.details}\nCoordonate: ${waypoint.coordinates.lat}, ${waypoint.coordinates.lng}`;
        await navigator.clipboard.writeText(textToCopy);
        alert('Informațiile au fost copiate în clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const openInGoogleMaps = () => {
    const { lat, lng } = waypoint.coordinates;
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" component="span">
            {waypoint.name}
          </Typography>
          <Chip 
            label={getTypeLabel(waypoint.type)} 
            color={getTypeColor(waypoint.type) as any}
            size="small"
          />
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Details */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Detalii
            </Typography>
            <Typography variant="body1">
              {waypoint.details}
            </Typography>
          </Box>

          <Divider />

          {/* Coordinates */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Coordonate
            </Typography>
            <Typography variant="body2" fontFamily="monospace">
              {waypoint.coordinates.lat.toFixed(6)}, {waypoint.coordinates.lng.toFixed(6)}
            </Typography>
          </Box>

          <Divider />

          {/* Metadata */}
          {
            isAdmin && (
                <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Informații
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Creat de: {waypoint.createdBy}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Creat la: {formatDate(waypoint.createdAt)}
            </Typography>
            {waypoint.updatedAt !== waypoint.createdAt && (
              <Typography variant="body2" color="text.secondary">
                Actualizat la: {formatDate(waypoint.updatedAt)}
              </Typography>
            )}
          </Box>)
          }
        </Box>
      </DialogContent>

      <DialogActions>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {/* User Actions */}
          <Button
            variant="outlined"
            startIcon={<LocationIcon />}
            onClick={openInGoogleMaps}
          >
            Deschide în Google Maps
          </Button>

          <Button
            variant="outlined"
            startIcon={<ShareIcon />}
            onClick={handleShare}
          >
            Partajează
          </Button>

          {/* Admin Actions */}
          {isAdmin && (
            <>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<EditIcon />}
                onClick={() => onEdit(waypoint)}
              >
                Editează
              </Button>

              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  if (confirm('Ești sigur că vrei să ștergi acest waypoint?')) {
                    onDelete(waypoint.id);
                  }
                }}
              >
                Șterge
              </Button>
            </>
          )}

          <Button onClick={onClose} variant="contained">
            Închide
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
