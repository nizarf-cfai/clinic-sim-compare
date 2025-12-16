import React from 'react';
import { SimulationResult, PatientType } from '../types';
import KPICard from './KPICard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Smartphone, Monitor, Users, Activity } from 'lucide-react';

interface DashboardProps {
  results: SimulationResult | null;
}

const Dashboard: React.FC<DashboardProps> = ({ results }) => {
  if (!results) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 min-h-[60vh]">
        <Activity className="w-16 h-16 opacity-20" />
        <p className="text-lg">Run the simulation to view results</p>
      </div>
    );
  }

  const { standard, ai } = results;

  // Chart Data Preparation
  const throughputData = [
    { name: 'Standard', Patients: standard.throughput },
    { name: 'AI-Enabled', Patients: ai.throughput },
  ];

  const timeBreakdownData = [
    { name: 'Standard', Waiting: parseFloat(standard.avgWaitTime.toFixed(1)), Service: parseFloat(standard.avgServiceTime.toFixed(1)) },
    { name: 'AI-Enabled', Waiting: parseFloat(ai.avgWaitTime.toFixed(1)), Service: parseFloat(ai.avgServiceTime.toFixed(1)) },
  ];

  const utilizationData = [
    { name: 'Standard Doctor', Utilization: parseFloat(standard.doctorUtilization.toFixed(1)) },
    { name: 'AI Doctor', Utilization: parseFloat(ai.doctorUtilization.toFixed(1)) },
    ...ai.resourceStats.map(r => ({ 
      name: r.name === 'Kiosk' ? 'AI Pre-Consult' : `AI ${r.name}`, 
      Utilization: parseFloat(r.busyTime.toFixed(1)) 
    }))
  ];

  // Specific AI Metrics
  const kioskUsers = ai.patients.filter(p => p.usedKiosk);
  const appUsers = ai.patients.filter(p => !p.usedKiosk && p.type === PatientType.AI_DIGITAL);

  const avgLosKiosk = kioskUsers.length 
    ? kioskUsers.reduce((acc, p) => acc + ((p.exitTime || 0) - p.arrivalTime), 0) / kioskUsers.length 
    : 0;
  
  const avgLosApp = appUsers.length 
    ? appUsers.reduce((acc, p) => acc + ((p.exitTime || 0) - p.arrivalTime), 0) / appUsers.length 
    : 0;

  const kioskUtilization = ai.resourceStats.find(r => r.name === 'Kiosk')?.busyTime || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <KPICard 
          title="Total Throughput"
          stdValue={standard.throughput}
          aiValue={ai.throughput}
          unit="pts"
        />
        <KPICard 
          title="Avg Length of Stay"
          stdValue={standard.avgLoS}
          aiValue={ai.avgLoS}
          unit="min"
          inverse={true}
        />
        <KPICard 
          title="Doctor Utilization"
          stdValue={standard.doctorUtilization}
          aiValue={ai.doctorUtilization}
          unit="%"
          inverse={true} 
        />
        <KPICard 
          title="Avg Wait for Doctor"
          stdValue={standard.avgWaitTime}
          aiValue={ai.avgWaitTime}
          unit="min"
          inverse={true}
        />
      </div>

      {/* 2. Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Throughput */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Patient Throughput</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={throughputData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80}/>
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="Patients" radius={[0, 4, 4, 0]}>
                    {throughputData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#94a3b8' : '#8b5cf6'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Time Breakdown (Avg per Patient)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeBreakdownData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
                <Bar dataKey="Waiting" stackId="a" fill="#cbd5e1" />
                <Bar dataKey="Service" stackId="a" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Resource Utilization & AI Deep Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Resource Utilization */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Resource Utilization (%)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={utilizationData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="Utilization" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                    {utilizationData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.name.includes('Standard') ? '#94a3b8' : '#8b5cf6'} /> 
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Specific Stats */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100">
          <h3 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Digital Health Metrics
          </h3>
          
          <div className="space-y-6">
            <div className="bg-white/60 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-600 font-medium">Pre-Consult Utilization</span>
                    <Monitor className="w-4 h-4 text-slate-400"/>
                </div>
                <div className="text-2xl font-bold text-slate-800">{kioskUtilization.toFixed(1)}%</div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: `${Math.min(kioskUtilization, 100)}%` }}></div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <div className="bg-white/60 p-3 rounded-lg flex flex-col">
                    <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Length of Stay</span>
                    <div className="flex justify-between items-center border-b border-indigo-100 pb-2 mb-2">
                        <span className="text-sm text-slate-600 flex items-center gap-2">
                            <Smartphone className="w-3 h-3 text-purple-500"/> App Users
                        </span>
                        <span className="font-bold text-slate-800">{avgLosApp.toFixed(0)} min</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 flex items-center gap-2">
                            <Users className="w-3 h-3 text-slate-500"/> Walk-ins (Pre-Consult)
                        </span>
                        <span className="font-bold text-slate-800">{avgLosKiosk.toFixed(0)} min</span>
                    </div>
                </div>
            </div>
            
            <div className="text-xs text-indigo-400 mt-2 italic">
               Note: App users skip the Pre-Consult queue entirely, directly entering Triage.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;