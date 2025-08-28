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
      case 'finish-start': return 'Sosire/Pornire Etapa';
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
        let textToCopy = `${waypoint.name} - ${getTypeLabel(waypoint.type)}\n${waypoint.details}\nCoordonate: ${waypoint.coordinates.lat}, ${waypoint.coordinates.lng}`;
        
        // Add date/time information if available
        if (waypoint.date || waypoint.eta || waypoint.startDate || waypoint.startTime) {
          textToCopy += '\n\nProgram și timp:';
          if (waypoint.date) textToCopy += `\nData de sosire: ${new Date(waypoint.date).toLocaleDateString('ro-RO')}`;
          if (waypoint.eta) textToCopy += `\nETA: ${new Date(waypoint.eta).toLocaleDateString('ro-RO')}`;
          if (waypoint.startDate) textToCopy += `\nData de start: ${new Date(waypoint.startDate).toLocaleDateString('ro-RO')}`;
          if (waypoint.startTime) textToCopy += `\nOra de start: ${waypoint.startTime}`;
        }
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

          {/* Date and Time Information */}
          {(waypoint.date || waypoint.eta || waypoint.startDate || waypoint.startTime) && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Program și timp
                </Typography>
                {waypoint.date && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Data de sosire:</strong> {new Date(waypoint.date).toLocaleDateString('ro-RO')}
                    <Typography variant="caption" color="text.secondary" display="block">
                      Când vei ajunge la acest punct
                    </Typography>
                  </Typography>
                )}
                {waypoint.eta && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>ETA:</strong> {new Date(waypoint.eta).toLocaleDateString('ro-RO')}
                    <Typography variant="caption" color="text.secondary" display="block">
                      Timpul estimat de sosire
                    </Typography>
                  </Typography>
                )}
                {waypoint.startDate && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Data de pornire:</strong> {new Date(waypoint.startDate).toLocaleDateString('ro-RO')}
                    <Typography variant="caption" color="text.secondary" display="block">
                      Când vei începe următoarea etapă
                    </Typography>
                  </Typography>
                )}
                {waypoint.startTime && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Ora de start:</strong> {waypoint.startTime}
                    <Typography variant="caption" color="text.secondary" display="block">
                      Ora când vei începe următoarea etapă
                    </Typography>
                  </Typography>
                )}
              </Box>
            </>
          )}

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
            Maps
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
