import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import FloorPlan from './components/FloorPlan';
import RealtimeDashboard from './components/RealtimeDashboard';
import { SimulationConfig, RealtimeState } from './types';
import { RealtimeEngine } from './services/realtimeEngine';
import { Menu, Play, Pause, RotateCcw } from 'lucide-react';

const DEFAULT_CONFIG: SimulationConfig = {
  durationMinutes: 480, // 8 hours
  avgArrivalInterval: 4.5,
  
  // Salaries (Annual)
  annualNurseSalary: 70000,
  annualDoctorSalary: 250000,

  // Standard Defaults
  stdTotalNurses: 3, // Pool size
  numStdReceptionists: 2, // Active
  numStdDoctors: 1,
  stdReceptionTimeAvg: 13,
  standardDoctorTimeAvg: 48,
  
  // AI Defaults
  digitalAdoptionRate: 0.5,
  aiTotalNurses: 3, // Pool size
  numKiosks: 2,
  numNurses: 2, // Active Triage
  numAiDoctors: 1,
  aiKioskTimeAvg: 3,
  aiTriageTimeAvg: 4.5,
  aiDoctorTimeAvg: 4,
};

function App() {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // Realtime State
  const [engine, setEngine] = useState<RealtimeEngine | null>(null);
  const [simState, setSimState] = useState<RealtimeState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(5); // 5x speed default (slower for visibility)

  const requestRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number | undefined>(undefined);

  // Initialize Engine
  useEffect(() => {
    resetSimulation();
  }, []);

  // Handle Simulation Loop
  const animate = (time: number) => {
    if (lastTimeRef.current !== undefined && engine && isPlaying) {
      const deltaMs = time - lastTimeRef.current;
      
      // Convert browser delta (ms) to game minutes
      const dtSeconds = deltaMs / 1000;
      const simMinutesPassed = dtSeconds * speed; 
      
      if (engine.state.time < config.durationMinutes) {
          engine.update(simMinutesPassed);
          // Force React Re-render
          // CRITICAL FIX: Deep Clone to decouple Engine's mutable state from React's immutable/frozen state
          setSimState(JSON.parse(JSON.stringify(engine.state)));
      } else {
        setIsPlaying(false);
      }
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [engine, isPlaying, speed]);

  const resetSimulation = () => {
    setIsPlaying(false);
    const newEngine = new RealtimeEngine(config);
    setEngine(newEngine);
    setSimState({ ...newEngine.state }); // Initial state is fine to be shallow or deep
    lastTimeRef.current = undefined;
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    lastTimeRef.current = undefined; // Reset delta timer on resume
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar 
        config={config} 
        setConfig={setConfig} 
        onRun={resetSimulation} // Re-purposed "Run" to Reset/Apply config
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      <main className="flex-1 w-full lg:w-auto h-screen overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0 z-10">
           <div className="flex items-center gap-3">
               <button onClick={() => setIsMobileOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                 <Menu className="w-6 h-6" />
               </button>
               <div>
                   <h1 className="font-bold text-xl text-slate-800 hidden sm:block">Clinic Simulation: Visualizer</h1>
               </div>
           </div>

           {/* Playback Controls */}
           <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={togglePlay}
                className={`p-2 rounded-md transition-colors flex items-center gap-2 ${isPlaying ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                <span className="text-sm font-bold w-12 text-center">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
              </button>
              
              <button onClick={resetSimulation} className="p-2 text-slate-500 hover:bg-white rounded-md transition-colors" title="Reset">
                  <RotateCcw className="w-5 h-5" />
              </button>
              
              <div className="h-6 w-px bg-slate-300 mx-1"></div>
              
              <div className="flex items-center gap-2 px-2">
                 <span className="text-xs font-bold text-slate-500 uppercase">Speed</span>
                 <input 
                    type="range" 
                    min="1" max="50" step="1"
                    value={speed}
                    onChange={(e) => setSpeed(parseInt(e.target.value))}
                    className="w-24 h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
                 />
                 <span className="text-xs font-mono w-8">{speed}x</span>
              </div>
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {simState && (
            <>
              <FloorPlan state={simState} />
              <RealtimeDashboard state={simState} config={config} speed={speed} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;