
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface TimeEntry {
  id: string;
  projectName: string;
  clockIn: string; // ISO string
  clockInLocation?: Coordinates;
  clockOut?: string; // ISO string
  clockOutLocation?: Coordinates;
}

export interface UserProfile {
  name: string;
  hourlyWage: number;
}
