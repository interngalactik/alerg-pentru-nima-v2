export interface Waypoint {
  id: string;
  name: string;
  type: 'intermediary' | 'finish-start';
  details: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  date?: string; // Date for the waypoint
  eta?: string; // Estimated time of arrival
  startDate?: string; // Start date for finish/start waypoints
  startTime?: string; // Start time for finish/start waypoints
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface WaypointFormData {
  name: string;
  type: 'intermediary' | 'finish-start';
  details: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  date?: string; // Date for the waypoint
  eta?: string; // Estimated time of arrival
  startDate?: string; // Start date for finish/start waypoints
  startTime?: string; // Start time for finish/start waypoints
}

export interface WaypointDisplayProps {
  waypoint: Waypoint;
  isAdmin: boolean;
  onEdit: (waypoint: Waypoint) => void;
  onDelete: (waypointId: string) => void;
  onClose: () => void;
}

export interface WaypointFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: WaypointFormData) => void;
  initialData?: WaypointFormData;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface WaypointMarkerProps {
  waypoint: Waypoint;
  onClick: (waypoint: Waypoint) => void;
}
