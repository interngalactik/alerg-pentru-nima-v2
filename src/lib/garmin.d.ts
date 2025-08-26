export interface GarminCredentials {
  email: string;
  password: string;
}

export interface GarminLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
  elevation?: number;
  accuracy?: number;
  speed?: number;
  course?: number;
  gpsStatus?: string;
}

// Official API response interfaces
export interface LastKnownLocationsResponse {
  Locations: LastKnownLocation[];
}

export interface LastKnownLocation {
  IMEI: number;
  Timestamp?: string;
  Coordinate: LocationCoordinate;
  Altitude?: number;
  Speed?: number;
  Course?: number;
  GPSFixStatus?: string;
}

export interface LocationCoordinate {
  Latitude: number;
  Longitude: number;
}

export interface TrackingStatusResponse {
  Devices: TrackingStatus[];
}

export interface TrackingStatus {
  IMEI: number;
  Tracking: boolean;
  Interval?: number;
  LastReport?: string;
}

export interface LocationRequestResponse {
  Devices: RequestLocation[];
}

export interface RequestLocation {
  IMEI: number;
  Requested: boolean;
  StartDate?: string;
  ExpirationDate?: string;
}
