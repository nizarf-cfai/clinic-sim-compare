import React from 'react';
import { Settings, PlayCircle } from 'lucide-react';
import { SimulationConfig } from '../types';

interface SidebarProps {
  config: SimulationConfig;
  setConfig: React.Dispatch<React.SetStateAction<SimulationConfig>>;
  onRun: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ config, setConfig, onRun, isMobileOpen, setIsMobileOpen }) => {
  const handleChange = (key: keyof SimulationConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const InputGroup = ({ label, value, min, max, step, onChange, unit = "" }: any) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
       <label className="text-xs font-medium text-slate-600 flex-1 mr-2">{label}</label>
       <div className="flex items-center gap-1">
          <input 
            type="number" 
            min={min} 
            max={max} 
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-20 text-sm font-semibold text-white bg-slate-700 border border-slate-600 rounded px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {unit && <span className="text-[10px] text-slate-400 font-medium w-6">{unit}</span>}
       </div>
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 z-30 h-full w-80 bg-white border-r border-slate-200 shadow-xl transition-transform duration-300 ease-in-out overflow-y-auto
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:shadow-none
      `}>
        <div className="p-6 pb-24 lg:pb-6">
          <div className="flex items-center gap-3 mb-6 text-blue-600">
            <Settings className="w-6 h-6" />
            <h1 className="text-xl font-bold tracking-tight">Configuration</h1>
          </div>

          <div className="space-y-6">
            
            {/* Global */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Global Simulation</h3>
              <InputGroup label="Duration" value={config.durationMinutes} min={60} max={1440} step={30} unit="min" onChange={(v: number) => handleChange('durationMinutes', v)} />
              <InputGroup label="Arrival Interval (Avg)" value={config.avgArrivalInterval} min={0.5} max={60} step={0.5} unit="min" onChange={(v: number) => handleChange('avgArrivalInterval', v)} />
            </div>

            {/* Standard Clinic */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Standard Clinic</h3>
              <InputGroup label="Receptionists" value={config.numStdReceptionists} min={1} max={10} step={1} onChange={(v: number) => handleChange('numStdReceptionists', v)} />
              <InputGroup label="Doctors" value={config.numStdDoctors} min={1} max={10} step={1} onChange={(v: number) => handleChange('numStdDoctors', v)} />
              <InputGroup label="Reception Time (Avg)" value={config.stdReceptionTimeAvg} min={1} max={60} step={1} unit="min" onChange={(v: number) => handleChange('stdReceptionTimeAvg', v)} />
              <InputGroup label="Doctor Time (Avg)" value={config.standardDoctorTimeAvg} min={1} max={120} step={1} unit="min" onChange={(v: number) => handleChange('standardDoctorTimeAvg', v)} />
            </div>

            {/* AI Clinic */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">AI-Enabled Clinic</h3>
              <InputGroup label="Digital Adoption (0-1)" value={config.digitalAdoptionRate} min={0} max={1} step={0.1} onChange={(v: number) => handleChange('digitalAdoptionRate', v)} />
              
              <InputGroup label="Pre-Consult Stations" value={config.numKiosks} min={1} max={20} step={1} onChange={(v: number) => handleChange('numKiosks', v)} />
              <InputGroup label="Triage Nurses" value={config.numNurses} min={1} max={20} step={1} onChange={(v: number) => handleChange('numNurses', v)} />
              <InputGroup label="AI Doctors" value={config.numAiDoctors} min={1} max={10} step={1} onChange={(v: number) => handleChange('numAiDoctors', v)} />
              
              <InputGroup label="Pre-Consult Time (Avg)" value={config.aiKioskTimeAvg} min={0.5} max={30} step={0.5} unit="min" onChange={(v: number) => handleChange('aiKioskTimeAvg', v)} />
              <InputGroup label="Triage Time (Avg)" value={config.aiTriageTimeAvg} min={0.5} max={30} step={0.5} unit="min" onChange={(v: number) => handleChange('aiTriageTimeAvg', v)} />
              <InputGroup label="AI Doctor Time (Avg)" value={config.aiDoctorTimeAvg} min={1} max={120} step={1} unit="min" onChange={(v: number) => handleChange('aiDoctorTimeAvg', v)} />
            </div>

            {/* Actions */}
            <div className="pt-2">
              <button 
                onClick={() => {
                   onRun();
                   if (window.innerWidth < 1024) setIsMobileOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-bold shadow-lg hover:shadow-xl hover:translate-y-[-1px] transition-all active:translate-y-[1px]"
              >
                <PlayCircle className="w-5 h-5" />
                Apply & Reset
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;