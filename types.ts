
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Photo {
  id: string;
  dataUrl: string; // base64 data URL
  caption: string;
  timestamp: string; // ISO string
}

export interface Task {
  id: string;
  jobId: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  photos: Photo[];
  createdAt: string;
  completedAt?: string;
}

export interface Job {
  id: string;
  name: string;
  client: string;
  description: string;
  address: string;
  hourlyRate: number;
  tasks: Task[];
  photos: Photo[];
  createdAt: string;
  color: string;
}

export interface TimeEntry {
  id: string;
  projectName: string;
  jobId?: string;
  clockIn: string; // ISO string
  clockInLocation?: Coordinates;
  clockOut?: string; // ISO string
  clockOutLocation?: Coordinates;
  notes?: string;
  photos?: Photo[];
}

export interface UserProfile {
  name: string;
  hourlyWage: number;
}
