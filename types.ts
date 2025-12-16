
export interface SimulationConfig {
  durationMinutes: number;
  avgArrivalInterval: number; // minutes
  
  // Standard Clinic Settings
  numStdReceptionists: number;
  numStdDoctors: number; // New: Number of Standard Doctors
  stdReceptionTimeAvg: number;
  standardDoctorTimeAvg: number; // Mode for Triangular

  // AI Clinic Settings
  digitalAdoptionRate: number; // 0.0 to 1.0
  numKiosks: number;
  numNurses: number;
  numAiDoctors: number; // New: Number of AI Doctors
  aiKioskTimeAvg: number;
  aiTriageTimeAvg: number;
  aiDoctorTimeAvg: number; // Mode for Triangular
}

export enum PatientType {
  STANDARD = 'STANDARD',
  AI_WALK_IN = 'AI_WALK_IN',
  AI_DIGITAL = 'AI_DIGITAL',
}

// --- NEW Realtime Types ---

export type AgentState = 'MOVING' | 'WAITING' | 'PROCESSING' | 'COMPLETED';

export interface Point {
  x: number;
  y: number;
}

export interface Agent {
  id: number;
  type: PatientType;
  state: AgentState;
  position: Point;
  targetPosition: Point;
  currentRoomId: string | null;
  processingSince: number; // Game time
  processingDuration: number; // How long operation takes
  totalWaitTime: number;
}

export interface Room {
  id: string;
  name: string;
  type: 'QUEUE' | 'SERVICE';
  capacity: number; // 1 for doctor, N for waiting room
  occupants: number[]; // Agent IDs
  position: Point; // Center of room for rendering
  queue: number[]; // Agent IDs waiting to enter
  staffCount: number; // How many staff active here
  staffBusy: number; // How many staff currently busy
}

export interface HistoryPoint {
  time: number;
  stdDoctorTotal: number;
  aiDoctorTotal: number;
  stdIntakeTotal: number;
  aiIntakeTotal: number;
}

export interface RealtimeState {
  time: number; // Game minutes elapsed
  patients: Agent[];
  rooms: Room[];
  history: HistoryPoint[];
  stats: {
    // Global Exits
    stdFinished: number;
    aiFinished: number;
    
    // Resource Specific Counters (Patients Handled)
    stdReceptionHandled: number;
    stdDoctorHandled: number;
    
    aiKioskHandled: number;
    aiTriageHandled: number;
    aiDoctorHandled: number;

    // Utilization Tracking
    stdDoctorBusyTime: number;
    aiDoctorBusyTime: number;
  };
}

// --- Legacy Types (Keeping to avoid breakages in imports, though unused in Realtime) ---
export interface PatientMetrics {
  id: number;
  type: PatientType;
  arrivalTime: number;
  exitTime: number | null; 
  waitTime: number;
  serviceTime: number;
  usedKiosk: boolean;
}
export interface ResourceMetrics {
  name: string;
  busyTime: number;
  capacity: number;
}
export interface ClinicResult {
  name: string;
  totalPatients: number;
  throughput: number; 
  avgLoS: number;
  avgWaitTime: number;
  avgServiceTime: number;
  doctorUtilization: number;
  resourceStats: ResourceMetrics[];
  patients: PatientMetrics[];
}
export interface SimulationResult {
  standard: ClinicResult;
  ai: ClinicResult;
}