import { SimulationConfig, SimulationResult, ClinicResult, PatientMetrics, PatientType, ResourceMetrics } from '../types';
import { randomTriangular, randomNormal, randomExponential } from '../utils/math';

// --- Simulation Internal Classes ---

interface SimEvent {
  time: number;
  type: 'ARRIVAL' | 'SERVICE_COMPLETED';
  patientId: number;
  clinicType: 'STANDARD' | 'AI';
  stage?: string; // e.g., 'RECEPTION', 'DOCTOR', 'KIOSK', 'NURSE'
}

class Resource {
  name: string;
  capacity: number;
  availableAt: number[]; // When each unit becomes free
  queue: { patientId: number, enterQueueTime: number }[];
  totalBusyTime: number[]; // Track busy time for each unit

  constructor(name: string, capacity: number) {
    this.name = name;
    this.capacity = capacity;
    this.availableAt = new Array(capacity).fill(0);
    this.totalBusyTime = new Array(capacity).fill(0);
    this.queue = [];
  }

  // Returns the index of the earliest available unit
  getEarliestUnitIndex(): number {
    let minIdx = 0;
    for (let i = 1; i < this.capacity; i++) {
      if (this.availableAt[i] < this.availableAt[minIdx]) {
        minIdx = i;
      }
    }
    return minIdx;
  }

  // Try to seize a unit. Returns wait time + unit index if successful, or null if queued
  seize(currentTime: number, duration: number): { unitIndex: number, startTime: number, finishTime: number, waitTime: number } {
    const unitIdx = this.getEarliestUnitIndex();
    
    // Logic: A resource is available if currentTime >= availableAt[unitIdx]
    // However, in a discrete event sim, we schedule into the future.
    // If we are seizing, it means we are at the front of the line (or just arrived and line is empty).
    
    // Simple availability check:
    // If the resource is free "now" (relative to event time), we take it.
    // If it's busy until later, the patient waits.
    
    const readyAt = Math.max(currentTime, this.availableAt[unitIdx]);
    const waitTime = readyAt - currentTime;
    const finishTime = readyAt + duration;

    // Update state
    this.availableAt[unitIdx] = finishTime;
    this.totalBusyTime[unitIdx] += duration;

    return { unitIndex: unitIdx, startTime: readyAt, finishTime, waitTime };
  }
}

class ClinicSimulation {
  config: SimulationConfig;
  currentTime: number;
  events: SimEvent[];
  patients: Map<number, PatientMetrics>;
  
  // Resources
  stdReception: Resource;
  stdDoctor: Resource;
  
  aiKiosks: Resource;
  aiNurses: Resource;
  aiDoctor: Resource;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.currentTime = 0;
    this.events = [];
    this.patients = new Map();

    // Init Resources
    this.stdReception = new Resource('Reception', config.numStdReceptionists);
    this.stdDoctor = new Resource('Doctor', config.numStdDoctors);
    
    this.aiKiosks = new Resource('Kiosk', config.numKiosks);
    this.aiNurses = new Resource('Nurse', config.numNurses);
    this.aiDoctor = new Resource('Doctor', config.numAiDoctors);
  }

  addEvent(event: SimEvent) {
    this.events.push(event);
    // Keep sorted by time (min-heap would be better for huge sims, sort is fine for this scale)
    this.events.sort((a, b) => a.time - b.time);
  }

  run(): SimulationResult {
    // 1. Schedule Arrivals
    // We generate arrivals for the entire day for both clinics independently to have fair comparison volume-wise?
    // Or share the same arrival pattern? Let's share arrival times to control variance.
    
    let t = 0;
    let pId = 1;
    while (t < this.config.durationMinutes) {
        // Average arrival interval -> Exponential distribution rate = 1/avg
        const interArrival = randomExponential(1 / this.config.avgArrivalInterval);
        t += interArrival;
        
        if (t > this.config.durationMinutes) break;

        // Schedule Standard Arrival
        this.addEvent({
            time: t,
            type: 'ARRIVAL',
            clinicType: 'STANDARD',
            patientId: pId
        });

        // Schedule AI Arrival (Same time, same ID for comparison logic conceptually, though flows differ)
        this.addEvent({
            time: t,
            type: 'ARRIVAL',
            clinicType: 'AI',
            patientId: pId
        });
        
        // Initialize Patient Data
        // We need separate tracking for Standard vs AI patient experiences
        // We will store them in the Map using string keys: "STD-1", "AI-1"
        this.patients.set(this.getPatientKey(pId, 'STANDARD'), {
            id: pId,
            type: PatientType.STANDARD,
            arrivalTime: t,
            exitTime: null,
            waitTime: 0,
            serviceTime: 0,
            usedKiosk: false
        });

        // Determine AI type (Digital vs Walk-in)
        const isDigital = Math.random() < this.config.digitalAdoptionRate;
        this.patients.set(this.getPatientKey(pId, 'AI'), {
            id: pId,
            type: isDigital ? PatientType.AI_DIGITAL : PatientType.AI_WALK_IN,
            arrivalTime: t,
            exitTime: null,
            waitTime: 0,
            serviceTime: 0,
            usedKiosk: !isDigital
        });

        pId++;
    }

    // 2. Process Events
    while (this.events.length > 0) {
        const event = this.events.shift();
        if (!event) break;
        this.currentTime = event.time;

        if (event.clinicType === 'STANDARD') {
            this.processStandardEvent(event);
        } else {
            this.processAiEvent(event);
        }
    }

    return this.compileResults();
  }

  getPatientKey(id: number, type: 'STANDARD' | 'AI'): number {
      // Hacking a unique ID for the map: positive for STD, negative for AI
      return type === 'STANDARD' ? id : -id;
  }

  updatePatientMetrics(pKey: number, wait: number, service: number) {
      const p = this.patients.get(pKey);
      if (p) {
          p.waitTime += wait;
          p.serviceTime += service;
      }
  }

  // --- Standard Workflow ---
  processStandardEvent(event: SimEvent) {
      const pKey = this.getPatientKey(event.patientId, 'STANDARD');
      const patient = this.patients.get(pKey);
      if (!patient) return;

      if (event.type === 'ARRIVAL') {
          // Go to Reception
          this.scheduleService(this.stdReception, event.time, pKey, 'RECEPTION_DONE', () => 
            randomTriangular(3, 5, 8)
          );
      } else if (event.type === 'SERVICE_COMPLETED') {
          if (event.stage === 'RECEPTION_DONE') {
             // Go to Doctor
             // Wait Room is implicit queue for doctor
             this.scheduleService(this.stdDoctor, event.time, pKey, 'DOCTOR_DONE', () => 
                randomTriangular(15, this.config.standardDoctorTimeAvg, 25)
             );
          } else if (event.stage === 'DOCTOR_DONE') {
              // Exit
              patient.exitTime = event.time;
          }
      }
  }

  // --- AI Workflow ---
  processAiEvent(event: SimEvent) {
    const pKey = this.getPatientKey(event.patientId, 'AI');
    const patient = this.patients.get(pKey);
    if (!patient) return;

    if (event.type === 'ARRIVAL') {
        if (patient.type === PatientType.AI_DIGITAL) {
            // Skip Kiosk, Go to Triage
            this.scheduleService(this.aiNurses, event.time, pKey, 'TRIAGE_DONE', () => 
                randomNormal(5, 1)
            );
        } else {
            // Walk-in -> Kiosk
            this.scheduleService(this.aiKiosks, event.time, pKey, 'KIOSK_DONE', () => 
                randomTriangular(5, 7, 10)
            );
        }
    } else if (event.type === 'SERVICE_COMPLETED') {
        if (event.stage === 'KIOSK_DONE') {
            // Go to Triage
            this.scheduleService(this.aiNurses, event.time, pKey, 'TRIAGE_DONE', () => 
                randomNormal(5, 1)
            );
        } else if (event.stage === 'TRIAGE_DONE') {
            // Go to Doctor
            this.scheduleService(this.aiDoctor, event.time, pKey, 'DOCTOR_DONE', () => 
                randomTriangular(8, this.config.aiDoctorTimeAvg, 12)
            );
        } else if (event.stage === 'DOCTOR_DONE') {
            // Exit
            patient.exitTime = event.time;
        }
    }
  }

  // Generic Scheduler
  scheduleService(resource: Resource, currentTime: number, pKey: number, nextStageName: string, durationFn: () => number) {
      // Logic: 
      // 1. Is resource free? 
      // Since this is a simple linear/branching flow without complex resource pre-emption or priorities,
      // we can check the resource availability immediately.
      // NOTE: In a strict event loop, we would put in a queue object. 
      // But here, `resource.seize` calculates the earliest start time based on previous commitments.
      // This "Fast Forward" resource logic works because the patient flow is linear per patient.
      // However, multiple patients compete. `resource.availableAt` handles that competition statefuly.
      
      const duration = durationFn();
      const { finishTime, waitTime } = resource.seize(currentTime, duration);
      
      this.updatePatientMetrics(pKey, waitTime, duration);

      this.addEvent({
          time: finishTime,
          type: 'SERVICE_COMPLETED',
          patientId: Math.abs(pKey), // ID is absolute
          clinicType: pKey > 0 ? 'STANDARD' : 'AI',
          stage: nextStageName
      });
  }

  compileResults(): SimulationResult {
      const stdPatients = Array.from(this.patients.values()).filter(p => p.type === PatientType.STANDARD && p.exitTime !== null);
      const aiPatients = Array.from(this.patients.values()).filter(p => p.type !== PatientType.STANDARD && p.exitTime !== null);

      const calcStats = (patients: PatientMetrics[], resources: Resource[], name: string): ClinicResult => {
          const count = patients.length;
          const totalWait = patients.reduce((acc, p) => acc + p.waitTime, 0);
          const totalService = patients.reduce((acc, p) => acc + p.serviceTime, 0);
          // LoS = Exit - Arrival. Also equals Wait + Service.
          const totalLoS = patients.reduce((acc, p) => acc + ((p.exitTime || 0) - p.arrivalTime), 0);

          const docRes = resources.find(r => r.name === 'Doctor');
          const docUtilization = docRes 
            ? (docRes.totalBusyTime[0] / this.config.durationMinutes) * 100 
            : 0;

          const resourceStats: ResourceMetrics[] = resources.map(r => ({
              name: r.name,
              capacity: r.capacity,
              // Sum busy time across all units, divide by (duration * capacity)
              busyTime: (r.totalBusyTime.reduce((a, b) => a + b, 0) / (this.config.durationMinutes * r.capacity)) * 100
          }));

          return {
              name,
              totalPatients: this.patients.size / 2, // Approximate total arrivals
              throughput: count,
              avgLoS: count ? totalLoS / count : 0,
              avgWaitTime: count ? totalWait / count : 0,
              avgServiceTime: count ? totalService / count : 0,
              doctorUtilization: Math.min(docUtilization, 100), // Cap at 100 due to potential overflow in loose logic
              resourceStats,
              patients
          };
      };

      return {
          standard: calcStats(stdPatients, [this.stdReception, this.stdDoctor], 'Standard Clinic'),
          ai: calcStats(aiPatients, [this.aiKiosks, this.aiNurses, this.aiDoctor], 'AI-Enabled Clinic')
      };
  }
}

export const runSimulation = (config: SimulationConfig): SimulationResult => {
    const sim = new ClinicSimulation(config);
    return sim.run();
};