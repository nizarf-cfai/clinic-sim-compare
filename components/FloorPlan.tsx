import React from 'react';
import { RealtimeState, Agent, Room, PatientType } from '../types';
import { User, Activity, Monitor, Clipboard, DoorOpen, HeartPulse, Armchair } from 'lucide-react';

interface FloorPlanProps {
  state: RealtimeState;
}

const RoomNode: React.FC<{ room: Room; allRooms: Room[] }> = ({ room, allRooms }) => {
  const isBusy = room.staffBusy >= room.capacity;
  
  let Icon = Activity;
  if (room.id.includes('reception')) Icon = Clipboard;
  if (room.id.includes('kiosk')) Icon = Monitor;
  if (room.id.includes('doctor')) Icon = HeartPulse;
  if (room.id.includes('wait') || room.id.includes('checkin')) Icon = Armchair;

  // Determine width based on capacity for service rooms
  const isMultiStation = room.type === 'SERVICE' && room.capacity > 1;
  const widthClass = isMultiStation ? 'w-32' : 'w-24';

  // --- Logic to find correct queue count ---
  let queueCount = room.queue.length;
  
  // Mapping visual queue rooms to logical service rooms
  const QUEUE_MAPPING: Record<string, string> = {
    'std_checkin_wait': 'std_reception',
    'std_main_wait': 'std_doctor',
    'ai_waiting': 'ai_triage',
    'ai_post_triage_wait': 'ai_doctor'
  };

  if (room.type === 'QUEUE' && QUEUE_MAPPING[room.id]) {
     const serviceRoomId = QUEUE_MAPPING[room.id];
     const serviceRoom = allRooms.find(r => r.id === serviceRoomId);
     if (serviceRoom) {
        queueCount = serviceRoom.queue.length;
     }
  }

  return (
    <div 
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center p-2 rounded-lg border-2 shadow-sm transition-colors duration-300 ${widthClass} min-h-[6rem]
        ${room.type === 'QUEUE' ? 'border-dashed border-slate-300 bg-slate-50' : 'bg-white'}
        ${room.type === 'SERVICE' && isBusy ? 'border-red-400 bg-red-50' : room.type === 'SERVICE' ? 'border-emerald-400' : ''}
      `}
      style={{ left: `${room.position.x}%`, top: `${room.position.y}%` }}
    >
      <div className="flex items-center gap-1 mb-1">
        <Icon className={`w-5 h-5 ${isBusy && room.type === 'SERVICE' ? 'text-red-500' : 'text-slate-600'}`} />
        <div className="text-[10px] font-bold text-center leading-tight text-slate-700">{room.name}</div>
      </div>
      
      {/* Multi-Station Visualization (e.g. Triage Boxes or Reception) */}
      {isMultiStation ? (
        <div className="grid grid-cols-2 gap-1.5 mt-1 w-full px-1">
           {Array.from({length: room.capacity}).map((_, i) => (
             <div 
                key={i} 
                className={`h-6 rounded border flex items-center justify-center text-[8px] font-bold shadow-sm transition-colors
                  ${i < room.staffBusy ? 'bg-red-200 border-red-300 text-red-800' : 'bg-emerald-100 border-emerald-200 text-emerald-800'}
                `}
             >
                {i < room.staffBusy ? 'BUSY' : `#${i+1}`}
             </div>
           ))}
        </div>
      ) : room.type === 'SERVICE' ? (
        // Single Station Dots
        <div className="mt-1 flex gap-0.5">
           {Array.from({length: Math.min(room.capacity, 5)}).map((_, i) => (
             <div key={i} className={`w-2 h-2 rounded-full ${i < room.staffBusy ? 'bg-red-500' : 'bg-emerald-200'}`} />
           ))}
        </div>
      ) : (
        // Queue Room Counter
        <div className="text-xs text-slate-400 mt-1 font-semibold">{queueCount} waiting</div>
      )}
    </div>
  );
};

const AgentNode: React.FC<{ agent: Agent }> = ({ agent }) => {
  const isStd = agent.type === PatientType.STANDARD;
  const isAi = !isStd;
  
  let colorClass = 'bg-blue-500';
  if (isAi) colorClass = 'bg-purple-600';
  if (agent.state === 'PROCESSING') colorClass = 'bg-green-500 animate-pulse';
  if (agent.state === 'WAITING') colorClass = 'bg-slate-400';

  return (
    <div 
      className={`absolute w-3 h-3 rounded-full shadow-sm transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-linear z-10 border border-white ${colorClass}`}
      style={{ left: `${agent.position.x}%`, top: `${agent.position.y}%` }}
    >
    </div>
  );
};

const FloorPlan: React.FC<FloorPlanProps> = ({ state }) => {
  return (
    <div className="relative w-full h-[500px] bg-slate-100 rounded-xl border border-slate-200 overflow-hidden shadow-inner select-none">
      {/* Background Labels */}
      <div className="absolute top-2 left-2 font-bold text-slate-400 text-sm tracking-widest uppercase pointer-events-none">Standard Clinic</div>
      <div className="absolute bottom-2 left-2 font-bold text-slate-400 text-sm tracking-widest uppercase pointer-events-none">AI-Enabled Clinic</div>
      
      {/* Divider */}
      <div className="absolute top-1/2 left-0 w-full h-px bg-slate-300 border-t border-dashed border-slate-400"></div>

      {/* Exits/Entrances */}
      <div className="absolute left-[2%] top-[20%] text-slate-400 flex flex-col items-center"><DoorOpen className="w-6 h-6"/> <span className="text-[10px]">IN</span></div>
      <div className="absolute right-[2%] top-[20%] text-slate-400 flex flex-col items-center"><DoorOpen className="w-6 h-6"/> <span className="text-[10px]">OUT</span></div>
      
      <div className="absolute left-[2%] bottom-[25%] text-slate-400 flex flex-col items-center"><DoorOpen className="w-6 h-6"/> <span className="text-[10px]">IN</span></div>
      <div className="absolute right-[2%] bottom-[25%] text-slate-400 flex flex-col items-center"><DoorOpen className="w-6 h-6"/> <span className="text-[10px]">OUT</span></div>

      {/* Rooms */}
      {state.rooms.map(room => (
        <RoomNode key={room.id} room={room} allRooms={state.rooms} />
      ))}

      {/* Agents */}
      {state.patients.map(agent => (
        <AgentNode key={agent.id} agent={agent} />
      ))}
    </div>
  );
};

export default FloorPlan;