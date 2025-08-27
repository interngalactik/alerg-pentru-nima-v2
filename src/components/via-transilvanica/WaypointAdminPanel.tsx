'use_client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Map as MapIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { Waypoint, WaypointFormData } from '@/types/waypoint';
import { WaypointService } from '@/lib/waypointService';
import WaypointForm from './WaypointForm';

interface WaypointAdminPanelProps {
  isAdmin: boolean;
  onClose: () => void;
}

const WaypointAdminPanel: React.FC<WaypointAdminPanelProps> = ({ isAdmin, onClose }) => {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingWaypoint, setEditingWaypoint] = useState<Waypoint | null>(null);
  const [formCoordinates, setFormCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Load waypoints on component mount
  useEffect(() => {
    if (isAdmin) {
      loadWaypoints();
    }
  }, [isAdmin]);

  const loadWaypoints = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const waypointsData = await WaypointService.getAllWaypoints();
      setWaypoints(waypointsData);
    } catch (error) {
      setError('Eroare la încărcarea waypoint-urilor');
      console.error('Error loading waypoints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWaypoint = async (waypointData: WaypointFormData) => {
    try {
      await WaypointService.addWaypoint(waypointData);
      await loadWaypoints(); // Reload the list
      setShowForm(false);
      setFormCoordinates(null);
    } catch (error) {
      console.error('Error adding waypoint:', error);
    }
  };

  const handleEditWaypoint = async (waypointData: WaypointFormData) => {
    if (!editingWaypoint) return;
    
    try {
      await WaypointService.updateWaypoint(editingWaypoint.id, waypointData);
      await loadWaypoints(); // Reload the list
      setEditingWaypoint(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error updating waypoint:', error);
      throw error;
    }
  };

  const handleDeleteWaypoint = async (waypointId: string) => {
    try {
      await WaypointService.deleteWaypoint(waypointId);
      await loadWaypoints(); // Reload the list
    } catch (error) {
      setError('Eroare la ștergerea waypoint-ului');
      console.error('Error deleting waypoint:', error);
    }
  };

  const handleEdit = (waypoint: Waypoint) => {
    setEditingWaypoint(waypoint);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingWaypoint(null);
    setFormCoordinates(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingWaypoint(null);
    setFormCoordinates(null);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'intermediary': return 'Punct intermediar';
      case 'finish': return 'Finish pentru ziua respectivă';
      case 'start': return 'Start pentru ziua următoare';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'intermediary': return 'default';
      case 'finish': return 'error';
      case 'start': return 'success';
      default: return 'default';
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Box sx={{ p: 2, maxHeight: '80vh', overflow: 'auto' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">
          Administrare Waypoint-uri
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
          fullWidth
        >
          Adaugă Waypoint Nou
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      {loading ? (
        <Typography>Se încarcă...</Typography>
      ) : waypoints.length === 0 ? (
        <Typography color="text.secondary" textAlign="center">
          Nu există waypoint-uri încă. Adaugă primul waypoint!
        </Typography>
      ) : (
        <List>
          {waypoints.map((waypoint) => (
            <ListItem key={waypoint.id} divider>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {waypoint.name}
                    </Typography>
                    <Chip
                      label={getTypeLabel(waypoint.type)}
                      color={getTypeColor(waypoint.type) as any}
                      size="small"
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {waypoint.details}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Coordonate: {waypoint.coordinates.lat.toFixed(6)}, {waypoint.coordinates.lng.toFixed(6)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Adăugat: {new Date(waypoint.createdAt).toLocaleDateString('ro-RO')}
                    </Typography>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Box display="flex" gap={1}>
                  <Tooltip title="Editează">
                    <IconButton
                      edge="end"
                      onClick={() => handleEdit(waypoint)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Șterge">
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteWaypoint(waypoint.id)}
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {/* Waypoint Form Dialog */}
      <WaypointForm
        isOpen={showForm}
        onClose={handleFormClose}
        onSubmit={editingWaypoint ? handleEditWaypoint : handleAddWaypoint}
        initialData={editingWaypoint || undefined}
        coordinates={formCoordinates || { lat: 46.0569, lng: 24.2603 }}
        onCoordinateSelect={setFormCoordinates}
      />
    </Box>
  );
};

export default WaypointAdminPanel;
