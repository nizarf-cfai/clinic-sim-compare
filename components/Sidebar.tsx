import React from 'react';
import { Settings, PlayCircle, DollarSign } from 'lucide-react';
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
    setConfig(prev => {
      const updates: Partial<SimulationConfig> = { [key]: value };

      // Validate Standard Nurses
      if (key === 'stdTotalNurses' && prev.numStdReceptionists > value) {
        updates.numStdReceptionists = value;
      }

      // Validate AI Nurses
      if (key === 'aiTotalNurses' && prev.numNurses > value) {
        updates.numNurses = value;
      }

      return { ...prev, ...updates };
    });
  };

  const InputGroup = ({ label, value, min, max, step, onChange, unit = "" }: any) => (
    <div className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
       <label className="text-xs font-medium text-slate-600 flex-1 mr-2">{label}</label>
       <div className="flex items-center gap-1">
          <input 
            type="number" 
            min={min} 
            max={max} 
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-16 text-xs font-semibold text-white bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {unit && <span className="text-[10px] text-slate-400 font-medium w-5">{unit}</span>}
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
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center gap-2 mb-3 text-blue-600 shrink-0">
            <Settings className="w-5 h-5" />
            <h1 className="text-lg font-bold tracking-tight">Configuration</h1>
          </div>

          <div className="space-y-3 flex-1">
            
            {/* Global */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Global Simulation</h3>
              {/* Duration in HOURS, converted to Minutes for state */}
              <InputGroup 
                label="Duration (Hours)" 
                value={config.durationMinutes / 60} 
                min={1} max={24} step={0.5} 
                unit="hr" 
                onChange={(v: number) => handleChange('durationMinutes', v * 60)} 
              />
              <InputGroup label="Arrival Interval (Avg)" value={config.avgArrivalInterval} min={0.5} max={60} step={0.5} unit="min" onChange={(v: number) => handleChange('avgArrivalInterval', v)} />
            </div>

            {/* Financials */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <h3 className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Financials (Yearly)
              </h3>
              <InputGroup label="Nurse Salary" value={config.annualNurseSalary} min={30000} max={200000} step={1000} unit="$" onChange={(v: number) => handleChange('annualNurseSalary', v)} />
              <InputGroup label="Doctor Salary" value={config.annualDoctorSalary} min={100000} max={1000000} step={5000} unit="$" onChange={(v: number) => handleChange('annualDoctorSalary', v)} />
            </div>

            {/* Standard Clinic */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Standard Clinic</h3>
              <div className="mb-1 pb-1 border-b border-slate-200">
                <InputGroup label="Total Nurse Pool" value={config.stdTotalNurses} min={1} max={20} step={1} onChange={(v: number) => handleChange('stdTotalNurses', v)} />
              </div>
              <InputGroup label="Active Receptionists" value={config.numStdReceptionists} min={1} max={config.stdTotalNurses} step={1} onChange={(v: number) => handleChange('numStdReceptionists', v)} />
              <InputGroup label="Doctors" value={config.numStdDoctors} min={1} max={10} step={1} onChange={(v: number) => handleChange('numStdDoctors', v)} />
              <div className="mt-2 pt-1 border-t border-slate-200">
                <InputGroup label="Reception Time (Avg)" value={config.stdReceptionTimeAvg} min={1} max={60} step={1} unit="min" onChange={(v: number) => handleChange('stdReceptionTimeAvg', v)} />
                <InputGroup label="Doctor Time (Avg)" value={config.standardDoctorTimeAvg} min={1} max={120} step={1} unit="min" onChange={(v: number) => handleChange('standardDoctorTimeAvg', v)} />
              </div>
            </div>

            {/* AI Clinic */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">AI-Enabled Clinic</h3>
              <div className="mb-1 pb-1 border-b border-slate-200">
                <InputGroup label="Total Nurse Pool" value={config.aiTotalNurses} min={1} max={20} step={1} onChange={(v: number) => handleChange('aiTotalNurses', v)} />
              </div>
              <InputGroup label="Digital Adoption (0-1)" value={config.digitalAdoptionRate} min={0} max={1} step={0.1} onChange={(v: number) => handleChange('digitalAdoptionRate', v)} />
              
              <InputGroup label="Pre-Consult Stations" value={config.numKiosks} min={1} max={20} step={1} onChange={(v: number) => handleChange('numKiosks', v)} />
              <InputGroup label="Active Triage Nurses" value={config.numNurses} min={1} max={config.aiTotalNurses} step={1} onChange={(v: number) => handleChange('numNurses', v)} />
              <InputGroup label="AI Doctors" value={config.numAiDoctors} min={1} max={10} step={1} onChange={(v: number) => handleChange('numAiDoctors', v)} />
              
              <div className="mt-2 pt-1 border-t border-slate-200">
                <InputGroup label="Pre-Consult Time (Avg)" value={config.aiKioskTimeAvg} min={0.5} max={30} step={0.5} unit="min" onChange={(v: number) => handleChange('aiKioskTimeAvg', v)} />
                <InputGroup label="Triage Time (Avg)" value={config.aiTriageTimeAvg} min={0.5} max={30} step={0.5} unit="min" onChange={(v: number) => handleChange('aiTriageTimeAvg', v)} />
                <InputGroup label="AI Doctor Time (Avg)" value={config.aiDoctorTimeAvg} min={1} max={120} step={1} unit="min" onChange={(v: number) => handleChange('aiDoctorTimeAvg', v)} />
              </div>
            </div>
          </div>

          {/* Actions - Pinned to bottom comfortably */}
          <div className="pt-2 pb-4 lg:pb-0 shrink-0 mt-2">
            <button 
              onClick={() => {
                 onRun();
                 if (window.innerWidth < 1024) setIsMobileOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 px-4 rounded-lg font-bold shadow-md hover:shadow-lg hover:translate-y-[-1px] transition-all active:translate-y-[1px] text-sm"
            >
              <PlayCircle className="w-4 h-4" />
              Apply & Reset
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;