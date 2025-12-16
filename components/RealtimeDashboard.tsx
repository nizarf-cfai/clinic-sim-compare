import React from 'react';
import { RealtimeState, SimulationConfig, PatientType } from '../types';
import { Timer, Zap, Users, Monitor, Clipboard, HeartPulse, Stethoscope, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Filter } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Props {
  state: RealtimeState;
  config: SimulationConfig;
  speed: number;
}

// Reusable Stat Card
const MetricCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon: any; 
  colorClass: string; 
  bgClass: string;
  subLabel?: string;
}> = ({ title, value, icon: Icon, colorClass, bgClass, subLabel }) => (
  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
      {subLabel && <p className="text-xs text-slate-500">{subLabel}</p>}
    </div>
    <div className={`p-3 rounded-lg ${bgClass}`}>
       <Icon className={`w-6 h-6 ${colorClass}`} />
    </div>
  </div>
);

const GroupSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
    <h3 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
      {title}
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {children}
    </div>
  </div>
);

const RealtimeDashboard: React.FC<Props> = ({ state, config, speed }) => {
  const formatTime = (min: number) => {
    const h = Math.floor(min / 60);
    const m = Math.floor(min % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Calculate dynamic In/Out stats (Safe access)
  const stdActive = state.patients ? state.patients.filter(p => p.type === PatientType.STANDARD).length : 0;
  const stdOut = state.stats?.stdFinished || 0;
  const stdIn = stdActive + stdOut;

  const aiActive = state.patients ? state.patients.filter(p => p.type !== PatientType.STANDARD).length : 0;
  const aiOut = state.stats?.aiFinished || 0;
  const aiIn = aiActive + aiOut;

  // Safe history access
  const historyData = state.history || [];

  return (
    <div className="space-y-6">
      
      {/* 1. Top Bar: Time & Speed */}
      <div className="flex items-center justify-between bg-slate-800 text-white p-4 rounded-xl shadow-md">
         <div className="flex items-center gap-4">
            <div className="p-2 bg-slate-700 rounded-lg">
                <Timer className="w-6 h-6 text-blue-300" />
            </div>
            <div>
                <p className="text-xs text-slate-400 uppercase font-bold">Simulation Clock</p>
                <p className="text-xl font-mono font-bold tracking-wide">
                  {formatTime(state.time)} <span className="text-slate-500 text-sm">/ {formatTime(config.durationMinutes)}</span>
                </p>
            </div>
         </div>
         <div className="text-right">
             <p className="text-xs text-slate-400 uppercase font-bold">Speed</p>
             <p className="text-lg font-bold text-emerald-400">{speed}x</p>
         </div>
      </div>

      {/* 2. Patient Throughput Section with IN/OUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Standard Patients Card */}
        <div className="bg-white p-5 rounded-xl border-l-4 border-slate-400 shadow-sm">
           <div className="flex items-center justify-between mb-4">
              <div>
                 <p className="text-sm font-bold text-slate-500 uppercase">Standard Clinic</p>
                 <p className="text-xs text-slate-400">Manual Workflow</p>
              </div>
              <div className="bg-slate-100 p-2 rounded-full">
                 <Users className="w-6 h-6 text-slate-500" />
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-3">
                 <ArrowDownToLine className="w-5 h-5 text-blue-500" />
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Total In</p>
                    <p className="text-xl font-bold text-slate-800">{stdIn}</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <ArrowUpFromLine className="w-5 h-5 text-emerald-500" />
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Out</p>
                    <p className="text-xl font-bold text-slate-800">{stdOut}</p>
                 </div>
              </div>
           </div>
        </div>

        {/* AI Patients Card */}
        <div className="bg-white p-5 rounded-xl border-l-4 border-purple-500 shadow-sm">
           <div className="flex items-center justify-between mb-4">
              <div>
                 <p className="text-sm font-bold text-purple-600 uppercase">AI-Enabled Clinic</p>
                 <p className="text-xs text-slate-400">Digital Workflow</p>
              </div>
              <div className="bg-purple-100 p-2 rounded-full">
                 <Zap className="w-6 h-6 text-purple-600" />
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-3">
                 <ArrowDownToLine className="w-5 h-5 text-blue-500" />
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Total In</p>
                    <p className="text-xl font-bold text-slate-800">{aiIn}</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <ArrowUpFromLine className="w-5 h-5 text-emerald-500" />
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Out</p>
                    <p className="text-xl font-bold text-slate-800">{aiOut}</p>
                 </div>
              </div>
           </div>
        </div>

      </div>

      {/* 3. Detailed Resource Metrics */}
      <h2 className="text-lg font-bold text-slate-800 border-b pb-2">Resource Performance</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Standard Resources */}
        <div className="space-y-4">
           <GroupSection title="Standard Resources">
              <MetricCard 
                title="Receptionists" 
                value={state.stats.stdReceptionHandled} 
                icon={Clipboard} 
                colorClass="text-slate-600" 
                bgClass="bg-slate-200"
                subLabel="Patients Checked-in"
              />
              <MetricCard 
                title="Doctor" 
                value={state.stats.stdDoctorHandled} 
                icon={Stethoscope} 
                colorClass="text-blue-600" 
                bgClass="bg-blue-100"
                subLabel="Consultations Completed"
              />
           </GroupSection>
        </div>

        {/* AI Resources */}
        <div className="space-y-4">
           <GroupSection title="AI Clinic Resources">
              <MetricCard 
                title="AI Pre-Consult" 
                value={state.stats.aiKioskHandled} 
                icon={Monitor} 
                colorClass="text-indigo-600" 
                bgClass="bg-indigo-100"
                subLabel="Automated Intakes"
              />
              <MetricCard 
                title="Triage Nurses" 
                value={state.stats.aiTriageHandled} 
                icon={HeartPulse} 
                colorClass="text-rose-600" 
                bgClass="bg-rose-100"
                subLabel="Patients Triaged"
              />
              <div className="md:col-span-2">
                <MetricCard 
                  title="AI-Assisted Doctor" 
                  value={state.stats.aiDoctorHandled} 
                  icon={Stethoscope} 
                  colorClass="text-purple-600" 
                  bgClass="bg-purple-100"
                  subLabel="Consultations Completed"
                />
              </div>
           </GroupSection>
        </div>
      </div>

      {/* 4. Live Charts */}
      <h2 className="text-lg font-bold text-slate-800 border-b pb-2 pt-4">Live Analytics</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Productivity Graph */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm min-w-0">
            <h3 className="text-sm font-bold text-slate-600 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Productivity (Doctor Output)
            </h3>
            <div className="h-60 w-full" style={{ minHeight: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                          dataKey="time" 
                          type="number"
                          domain={[0, config.durationMinutes]}
                          tickFormatter={(val) => Math.round(val).toString()} 
                          label={{ value: 'Time (min)', position: 'insideBottom', offset: -5, fontSize: 12 }} 
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Line type="monotone" dataKey="stdDoctorTotal" name="Standard Doctor" stroke="#94a3b8" strokeWidth={2} dot={false} isAnimationActive={false} />
                        <Line type="monotone" dataKey="aiDoctorTotal" name="AI Doctor" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Intake Graph */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm min-w-0">
            <h3 className="text-sm font-bold text-slate-600 mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-500" />
                Intake Capacity (Processed)
            </h3>
            <div className="h-60 w-full" style={{ minHeight: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                          dataKey="time" 
                          type="number"
                          domain={[0, config.durationMinutes]}
                          tickFormatter={(val) => Math.round(val).toString()} 
                          label={{ value: 'Time (min)', position: 'insideBottom', offset: -5, fontSize: 12 }} 
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Line type="monotone" dataKey="stdIntakeTotal" name="Standard Reception" stroke="#94a3b8" strokeWidth={2} dot={false} isAnimationActive={false} />
                        <Line type="monotone" dataKey="aiIntakeTotal" name="AI Pre-Consult + Triage" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

      </div>
    </div>
  );
};

export default RealtimeDashboard;