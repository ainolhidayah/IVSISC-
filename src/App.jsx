import React, { useState } from 'react';
import AdminDashboard from './components/AdminDashboard';
import PanelForm from './components/PanelForm';

export default function App() {
  const [view, setView] = useState('admin'); // 'admin' | 'panel'

  return (
    <div>
      {/* Bar Navigasi Penukar Mod */}
      <div className="bg-slate-800 text-white p-3 flex justify-between items-center px-6">
        <span className="font-bold text-sm tracking-wide">SISTEM PENILAIAN SISC+</span>
        <div className="flex gap-2">
          <button 
            onClick={() => setView('admin')}
            className={`px-3 py-1 rounded text-xs font-semibold ${view === 'admin' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            Portal Admin
          </button>
          <button 
            onClick={() => setView('panel')}
            className={`px-3 py-1 rounded text-xs font-semibold ${view === 'panel' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            Borang Panel
          </button>
        </div>
      </div>

      {/* Paparan Komponen */}
      {view === 'admin' ? <AdminDashboard /> : <PanelForm />}
    </div>
  );
}
