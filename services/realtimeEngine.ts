import { SimulationConfig, RealtimeState, Agent, Room, PatientType } from '../types';
import { randomTriangular, randomNormal, randomExponential } from '../utils/math';

// Map Layout Constants (0-100 grid)
const POS = {
  // Standard Flow Updates
  STD_ENTRY: { x: 5, y: 20 },
  STD_CHECKIN_WAIT: { x: 20, y: 20 }, // New pre-reception waiting
  STD_RECEPTION: { x: 40, y: 20 },    // Reception (2 stations)
  STD_MAIN_WAIT: { x: 60, y: 20 },    // Post-reception waiting
  STD_DOCTOR: { x: 80, y: 20 },
  STD_EXIT: { x: 95, y: 20 },
  
  // AI Floor Plan
  AI_ENTRY: { x: 5, y: 70 },
  AI_KIOSK: { x: 20, y: 60 },      
  AI_WAITING: { x: 35, y: 70 },    // Queue for Triage
  AI_TRIAGE: { x: 50, y: 70 },     
  AI_POST_TRIAGE_WAIT: { x: 68, y: 70 }, // NEW: Queue for Doctor
  AI_DOCTOR: { x: 85, y: 70 },     
  AI_EXIT: { x: 95, y: 70 },
};

export class RealtimeEngine {
  state: RealtimeState;
  config: SimulationConfig;
  nextArrival: number; // Synchronized arrival timer
  patientCounter: number;
  lastHistoryCapture: number;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.patientCounter = 1;
    this.nextArrival = 0; // Immediate start
    this.lastHistoryCapture = 0;
    
    this.state = {
      time: 0,
      patients: [],
      rooms: this.initializeRooms(config),
      // Initialize with t=0 to allow charts to render immediately
      history: [{ 
        time: 0, 
        stdDoctorTotal: 0, 
        aiDoctorTotal: 0, 
        stdIntakeTotal: 0, 
        aiIntakeTotal: 0 
      }],
      stats: {
        stdFinished: 0,
        aiFinished: 0,
        
        stdReceptionHandled: 0,
        stdDoctorHandled: 0,
        
        aiKioskHandled: 0,
        aiTriageHandled: 0,
        aiDoctorHandled: 0,

        stdDoctorBusyTime: 0,
        aiDoctorBusyTime: 0
      }
    };
  }

  initializeRooms(config: SimulationConfig): Room[] {
    return [
      // STANDARD FLOW
      // 1. Check-in Waiting (Queue for Reception)
      { id: 'std_checkin_wait', name: 'Check-in Q', type: 'QUEUE', capacity: 999, staffCount: 0, staffBusy: 0, occupants: [], queue: [], position: POS.STD_CHECKIN_WAIT },
      // 2. Reception (Configurable Capacity)
      { id: 'std_reception', name: 'Reception', type: 'SERVICE', capacity: config.numStdReceptionists, staffCount: config.numStdReceptionists, staffBusy: 0, occupants: [], queue: [], position: POS.STD_RECEPTION },
      // 3. Main Waiting (Queue for Doctor)
      { id: 'std_main_wait', name: 'Waiting Room', type: 'QUEUE', capacity: 999, staffCount: 0, staffBusy: 0, occupants: [], queue: [], position: POS.STD_MAIN_WAIT },
      // 4. Doctor
      { id: 'std_doctor', name: 'Doctor Office', type: 'SERVICE', capacity: config.numStdDoctors, staffCount: config.numStdDoctors, staffBusy: 0, occupants: [], queue: [], position: POS.STD_DOCTOR },
      
      // AI FLOW
      { id: 'ai_kiosk', name: 'AI Pre-Consult', type: 'SERVICE', capacity: config.numKiosks, staffCount: config.numKiosks, staffBusy: 0, occupants: [], queue: [], position: POS.AI_KIOSK },
      { id: 'ai_waiting', name: 'Triage Waiting', type: 'QUEUE', capacity: 999, staffCount: 0, staffBusy: 0, occupants: [], queue: [], position: POS.AI_WAITING },
      { id: 'ai_triage', name: 'Triage Nurses', type: 'SERVICE', capacity: config.numNurses, staffCount: config.numNurses, staffBusy: 0, occupants: [], queue: [], position: POS.AI_TRIAGE },
      { id: 'ai_post_triage_wait', name: 'Dr. Waiting', type: 'QUEUE', capacity: 999, staffCount: 0, staffBusy: 0, occupants: [], queue: [], position: POS.AI_POST_TRIAGE_WAIT },
      { id: 'ai_doctor', name: 'AI Doctor', type: 'SERVICE', capacity: config.numAiDoctors, staffCount: config.numAiDoctors, staffBusy: 0, occupants: [], queue: [], position: POS.AI_DOCTOR },
    ];
  }

  // Helper to find a room
  getRoom(id: string): Room {
    return this.state.rooms.find(r => r.id === id)!;
  }

  // --- Main Tick ---
  update(dtMinutes: number) {
    this.state.time += dtMinutes;

    // 1. Spawning
    this.handleSpawning();

    // 2. Logic Updates (Movements, Service completion)
    // We iterate backwards so we can remove completed agents safely
    for (let i = this.state.patients.length - 1; i >= 0; i--) {
      const p = this.state.patients[i];
      this.updateAgent(p, dtMinutes);
      
      if (p.state === 'COMPLETED') {
        // Update stats
        if (p.type === PatientType.STANDARD) {
           this.state.stats.stdFinished++;
        } else {
           this.state.stats.aiFinished++;
        }
        // Remove from list
        this.state.patients.splice(i, 1);
      }
    }
    
    // 3. Resource Utilization Stats
    const stdDoc = this.getRoom('std_doctor');
    // For multi-doctor, staffBusy counts how many represent actively working docs
    // We add the proportion of docs working * dt
    if (stdDoc.staffBusy > 0) this.state.stats.stdDoctorBusyTime += dtMinutes * (stdDoc.staffBusy / stdDoc.capacity);
    
    const aiDoc = this.getRoom('ai_doctor');
    if (aiDoc.staffBusy > 0) this.state.stats.aiDoctorBusyTime += dtMinutes * (aiDoc.staffBusy / aiDoc.capacity);

    // 4. Capture History (Every 5 minutes)
    if (this.state.time - this.lastHistoryCapture >= 5) {
      this.captureHistory();
      this.lastHistoryCapture = this.state.time;
    }
  }

  captureHistory() {
    // Defensive check
    if (!this.state.history) this.state.history = [];
    
    // Create a new array reference to avoid "object is not extensible" errors
    // if React has frozen the previous array instance.
    this.state.history = [
      ...this.state.history,
      {
        time: Math.floor(this.state.time),
        stdDoctorTotal: this.state.stats.stdDoctorHandled,
        aiDoctorTotal: this.state.stats.aiDoctorHandled,
        stdIntakeTotal: this.state.stats.stdReceptionHandled,
        aiIntakeTotal: this.state.stats.aiTriageHandled
      }
    ];
  }

  handleSpawning() {
    // Synchronized Spawning: Both clinics get a patient at the exact same time
    // Use a while loop to catch up if time jump > interval
    while (this.state.time >= this.nextArrival && this.state.time < this.config.durationMinutes) {
      
      // 1. Spawn Standard Patient
      this.spawnPatient(PatientType.STANDARD);
      
      // 2. Spawn AI Patient (Randomize Type)
      const isDigital = Math.random() < this.config.digitalAdoptionRate;
      this.spawnPatient(isDigital ? PatientType.AI_DIGITAL : PatientType.AI_WALK_IN);
      
      // 3. Schedule next joint arrival
      this.nextArrival += randomExponential(1 / this.config.avgArrivalInterval);
      
      // Safety break to prevent infinite loops if interval is 0 or extremely small
      if (this.nextArrival <= this.state.time) {
         this.nextArrival = this.state.time + 0.1; 
      }
    }
  }

  spawnPatient(type: PatientType) {
    const startPos = type === PatientType.STANDARD ? POS.STD_ENTRY : POS.AI_ENTRY;
    
    let targetPos = { x: 0, y: 0 };
    
    // Flow Logic
    if (type === PatientType.STANDARD) {
      // 1. Enter Check-in Waiting (Queue for Reception)
      this.addToQueue('std_reception', this.patientCounter);
      targetPos = POS.STD_CHECKIN_WAIT; // Stand in the waiting room
    } else if (type === PatientType.AI_WALK_IN) {
      this.addToQueue('ai_kiosk', this.patientCounter);
      targetPos = POS.AI_KIOSK;
    } else {
      // AI Digital -> Direct to Waiting Room (Queue for Triage)
      this.addToQueue('ai_triage', this.patientCounter);
      targetPos = POS.AI_WAITING;
    }

    const agent: Agent = {
      id: this.patientCounter++,
      type,
      state: 'MOVING',
      position: { ...startPos },
      targetPosition: targetPos,
      currentRoomId: null,
      processingSince: 0,
      processingDuration: 0,
      totalWaitTime: 0
    };
    
    this.state.patients.push(agent);
  }

  addToQueue(roomId: string, agentId: number) {
    const room = this.getRoom(roomId);
    room.queue.push(agentId);
  }

  updateAgent(agent: Agent, dt: number) {
    if (agent.state === 'MOVING') {
      this.moveAgent(agent, dt);
    } else if (agent.state === 'WAITING') {
      agent.totalWaitTime += dt;
      // Check if we can enter service
      // We look at the room we are queuing for
      const targetRoom = this.state.rooms.find(r => r.queue.includes(agent.id));
      if (targetRoom) {
        // Queue Logic: Enter if at front AND capacity available
        if (targetRoom.queue[0] === agent.id && targetRoom.staffBusy < targetRoom.capacity) {
           // ENTER ROOM
           targetRoom.queue.shift(); // Remove from queue
           targetRoom.staffBusy++;
           targetRoom.occupants.push(agent.id);
           
           agent.state = 'PROCESSING';
           agent.currentRoomId = targetRoom.id;
           agent.position = { ...targetRoom.position }; // Snap to room center
           agent.processingSince = this.state.time;
           
           // Determine Service Duration
           agent.processingDuration = this.getDuration(targetRoom.id);
        }
      }
    } else if (agent.state === 'PROCESSING') {
      if (this.state.time >= agent.processingSince + agent.processingDuration) {
        // FINISHED PROCESSING
        const room = this.getRoom(agent.currentRoomId!);
        room.staffBusy--;
        room.occupants = room.occupants.filter(id => id !== agent.id);
        
        // INCREMENT STATS FOR STATION
        if (room.id === 'std_reception') this.state.stats.stdReceptionHandled++;
        if (room.id === 'std_doctor') this.state.stats.stdDoctorHandled++;
        if (room.id === 'ai_kiosk') this.state.stats.aiKioskHandled++;
        if (room.id === 'ai_triage') this.state.stats.aiTriageHandled++;
        if (room.id === 'ai_doctor') this.state.stats.aiDoctorHandled++;

        // Determine Next Destination
        this.routeNext(agent, room.id);
      }
    }
  }

  moveAgent(agent: Agent, dt: number) {
    // Simple linear interpolation
    const speed = 30; // units per minute
    const dx = agent.targetPosition.x - agent.position.x;
    const dy = agent.targetPosition.y - agent.position.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist <= speed * dt) {
      // Arrived
      agent.position = { ...agent.targetPosition };
      
      if (agent.targetPosition.x === POS.STD_EXIT.x && agent.targetPosition.y === POS.STD_EXIT.y) {
          agent.state = 'COMPLETED';
      } else if (agent.targetPosition.x === POS.AI_EXIT.x && agent.targetPosition.y === POS.AI_EXIT.y) {
          agent.state = 'COMPLETED';
      } else {
          // Arrived at a room queue
          agent.state = 'WAITING';
      }
    } else {
      // Move
      const ratio = (speed * dt) / dist;
      agent.position.x += dx * ratio;
      agent.position.y += dy * ratio;
    }
  }

  routeNext(agent: Agent, currentRoomId: string) {
    agent.currentRoomId = null;
    agent.state = 'MOVING';

    // --- STANDARD ROUTING ---
    if (currentRoomId === 'std_reception') {
      // Finished reception -> Go to Main Waiting (Queue for Doctor)
      this.addToQueue('std_doctor', agent.id);
      agent.targetPosition = POS.STD_MAIN_WAIT; 
    } 
    else if (currentRoomId === 'std_doctor') {
      agent.targetPosition = POS.STD_EXIT;
    }

    // --- AI ROUTING ---
    else if (currentRoomId === 'ai_kiosk') {
      // Step: Kiosk -> Waiting Room (Queue for Triage)
      this.addToQueue('ai_triage', agent.id);
      agent.targetPosition = POS.AI_WAITING;
    }
    else if (currentRoomId === 'ai_triage') {
      // Step: Triage -> Waiting Room (Queue for Doctor) -> Doctor
      this.addToQueue('ai_doctor', agent.id);
      agent.targetPosition = POS.AI_POST_TRIAGE_WAIT;
    }
    else if (currentRoomId === 'ai_doctor') {
      agent.targetPosition = POS.AI_EXIT;
    }
  }

  getDuration(roomId: string): number {
    const safeMin = (val: number) => Math.max(0.1, val);
    
    switch(roomId) {
      case 'std_reception': {
         const avg = this.config.stdReceptionTimeAvg;
         return randomTriangular(safeMin(avg * 0.5), avg, avg * 1.5);
      }
      case 'std_doctor': {
         const avg = this.config.standardDoctorTimeAvg;
         return randomTriangular(safeMin(avg * 0.5), avg, avg * 1.5);
      }
      case 'ai_kiosk': {
         const avg = this.config.aiKioskTimeAvg;
         return randomTriangular(safeMin(avg * 0.5), avg, avg * 1.5);
      }
      case 'ai_triage': {
         return Math.max(0.1, randomNormal(this.config.aiTriageTimeAvg, this.config.aiTriageTimeAvg * 0.2));
      }
      case 'ai_doctor': {
         const avg = this.config.aiDoctorTimeAvg;
         return randomTriangular(safeMin(avg * 0.5), avg, avg * 1.5);
      }
      default: return 1;
    }
  }
}