import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { UserPlus, UserCheck, FileText, Download, CheckCircle, XCircle, Search, Trash2 } from 'lucide-react';

// Inisialisasi Supabase Client dari Environment Variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('calon'); // 'calon' | 'panel' | 'keputusan'
  
  // State Pengurusan Calon
  const [calonList, setCalonList] = useState([]);
  const [newCalon, setNewCalon] = useState({
    no_kp: '',
    nama_penuh: '',
    zon_temuduga: 'Zon Tengah',
    bilik_temuduga: 'Bilik 1',
    sme_subjek: ''
  });

  // State Pengurusan Panel
  const [panelList, setPanelList] = useState([]);
  const [newPanel, setNewPanel] = useState({
    email: '',
    password: '',
    nama_panel: ''
  });

  // State Pemantauan Keputusan
  const [resultsList, setResultsList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchCalon();
    fetchPanel();
    fetchKeputusan();
  }, []);

  // ----------------------------------------------------
  // 1. MODUL PENGURUSAN CALON
  // ----------------------------------------------------
  const fetchCalon = async () => {
    const { data, error } = await supabase.from('calon').select('*').order('created_at', { ascending: false });
    if (!error) setCalonList(data || []);
  };

  const handleAddCalon = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    const { error } = await supabase.from('calon').insert([newCalon]);

    if (error) {
      setMessage({ type: 'error', text: 'Gagal mendaftar calon: ' + error.message });
    } else {
      setMessage({ type: 'success', text: 'Calon berjaya didaftarkan!' });
      setNewCalon({ no_kp: '', nama_penuh: '', zon_temuduga: 'Zon Tengah', bilik_temuduga: 'Bilik 1', sme_subjek: '' });
      fetchCalon();
    }
    setLoading(false);
  };

  const handleDeleteCalon = async (no_kp) => {
    if (window.confirm(`Adakah anda pasti mahu memadam calon No. KP: ${no_kp}?`)) {
      await supabase.from('calon').delete().eq('no_kp', no_kp);
      fetchCalon();
    }
  };

  // ----------------------------------------------------
  // 2. MODUL PENGURUSAN PANEL PENEMUDUGA
  // ----------------------------------------------------
  const fetchPanel = async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('role', 'panel');
    if (!error) setPanelList(data || []);
  };

  const handleRegisterPanel = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newPanel.email,
      password: newPanel.password,
    });

    if (authError) {
      setMessage({ type: 'error', text: 'Gagal mendaftar akaun panel: ' + authError.message });
      setLoading(false);
      return;
    }

    if (authData?.user) {
      const { error: profileError } = await supabase.from('profiles').insert([{
        id: authData.user.id,
        nama_panel: newPanel.nama_panel,
        email: newPanel.email,
        role: 'panel'
      }]);

      if (profileError) {
        setMessage({ type: 'error', text: 'Gagal menyimpan profil panel: ' + profileError.message });
      } else {
        setMessage({ type: 'success', text: 'Panel penemuduga berjaya didaftarkan!' });
        setNewPanel({ email: '', password: '', nama_panel: '' });
        fetchPanel();
      }
    }
    setLoading(false);
  };

  // ----------------------------------------------------
  // 3. MODUL PEMANTAUAN KEPUTUSAN LIVE
  // ----------------------------------------------------
  const fetchKeputusan = async () => {
    const { data, error } = await supabase
      .from('penilaian_skor')
      .select(`
        *,
        calon (nama_penuh, sme_subjek),
        profiles (nama_panel)
      `)
      .order('created_at', { ascending: false });

    if (!error) setResultsList(data || []);
  };

  const exportToCSV = () => {
    if (resultsList.length === 0) return alert('Tiada data penilaian untuk dieksport.');
    
    const headers = [
      "No KP", "Nama Calon", "Zon", "Bilik", "SME Subjek", "Nama Panel", 
      "Bimbingan (25%)", "Instruksional (20%)", "Pemikiran Strategik (20%)", 
      "Analisis Data (15%)", "Interpersonal (10%)", "Evidens (10%)", 
      "Jumlah Markah (%)", "Status Perakuan", "Ulasan Panel"
    ];
    
    const rows = resultsList.map(r => [
      `"${r.no_kp_calon}"`,
      `"${r.calon?.nama_penuh || ''}"`,
      `"${r.zon}"`,
      `"${r.bilik}"`,
      `"${r.calon?.sme_subjek || ''}"`,
      `"${r.profiles?.nama_panel || ''}"`,
      r.skor_bimbingan,
      r.skor_instruksional,
      r.skor_pemikiran_strategik,
      r.skor_analisis_data,
      r.skor_interpersonal,
      r.skor_evidens,
      r.jumlah_markah,
      r.status_lulus ? "DIPERAKUKAN" : "TIDAK DIPERAKUKAN",
      `"${r.ulasan_panel || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Penilaian_SISC_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredResults = resultsList.filter(r => 
    r.no_kp_calon.includes(searchTerm) ||
    (r.calon?.nama_penuh && r.calon.nama_penuh.toLowerCase().includes(searchTerm.toLowerCase())) ||
    r.zon.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Admin */}
        <div className="bg-slate-900 text-white p-6 rounded-lg shadow-md mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Papan Pemuka Pentadbir (Admin Dashboard)</h1>
            <p className="text-slate-400 text-sm mt-1">Sistem Penilaian & Temu Duga Jawatan SISC+</p>
          </div>
          <span className="bg-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider">
            Portal Admin
          </span>
        </div>

        {/* Mesej Status */}
        {message.text && (
          <div className={`p-4 mb-6 rounded-md flex items-center gap-2 ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message.type === 'error' ? <XCircle size={20}/> : <CheckCircle size={20}/>}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Tab Navigasi */}
        <div className="flex border-b border-slate-200 mb-6 bg-white rounded-t-lg px-4 pt-2">
          <button
            onClick={() => setActiveTab('calon')}
            className={`flex items-center gap-2 py-3 px-6 font-semibold border-b-2 text-sm transition-all ${
              activeTab === 'calon' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus size={18} /> Pengurusan Calon
          </button>
          <button
            onClick={() => setActiveTab('panel')}
            className={`flex items-center gap-2 py-3 px-6 font-semibold border-b-2 text-sm transition-all ${
              activeTab === 'panel' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck size={18} /> Pendaftaran Panel
          </button>
          <button
            onClick={() => setActiveTab('keputusan')}
            className={`flex items-center gap-2 py-3 px-6 font-semibold border-b-2 text-sm transition-all ${
              activeTab === 'keputusan' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText size={18} /> Pemantauan Keputusan Live
          </button>
        </div>

        {/* TAB 1: PENGURUSAN CALON */}
        {activeTab === 'calon' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-fit">
              <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Kunci Masuk Calon Baru</h2>
              <form onSubmit={handleAddCalon} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombor Kad Pengenalan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 850809134875"
                    className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={newCalon.no_kp}
                    onChange={(e) => setNewCalon({ ...newCalon, no_kp: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nama Penuh Calon</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: MOHD SOLEHAN BIN AHMAD SHAH"
                    className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={newCalon.nama_penuh}
                    onChange={(e) => setNewCalon({ ...newCalon, nama_penuh: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Zon Temuduga</label>
                  <select
                    className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={newCalon.zon_temuduga}
                    onChange={(e) => setNewCalon({ ...newCalon, zon_temuduga: e.target.value })}
                  >
                    <option value="Zon Tengah">Zon Tengah</option>
                    <option value="Zon Utara">Zon Utara</option>
                    <option value="Zon Selatan">Zon Selatan</option>
                    <option value="Zon Sabah">Zon Sabah</option>
                    <option value="Zon Sarawak">Zon Sarawak</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bilik Temuduga</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bilik Delima / Bilik 1"
                    className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={newCalon.bilik_temuduga}
                    onChange={(e) => setNewCalon({ ...newCalon, bilik_temuduga: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Subject Matter Expert (SME)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bahasa Melayu / Sains / Matematik"
                    className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={newCalon.sme_subjek}
                    onChange={(e) => setNewCalon({ ...newCalon, sme_subjek: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded transition-all text-sm shadow"
                >
                  {loading ? 'Menyimpan...' : 'Daftar Calon'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Senarai Calon Berdaftar ({calonList.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase text-xs border-b">
                      <th className="p-3">No. KP</th>
                      <th className="p-3">Nama Penuh</th>
                      <th className="p-3">Zon</th>
                      <th className="p-3">Bilik</th>
                      <th className="p-3">SME Subjek</th>
                      <th className="p-3 text-center">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calonList.length === 0 ? (
                      <tr><td colSpan="6" className="text-center p-4 text-slate-500">Tiada calon didaftarkan.</td></tr>
                    ) : (
                      calonList.map((c) => (
                        <tr key={c.no_kp} className="border-b hover:bg-slate-50">
                          <td className="p-3 font-mono text-xs">{c.no_kp}</td>
                          <td className="p-3 font-semibold text-slate-800">{c.nama_penuh}</td>
                          <td className="p-3">{c.zon_temuduga}</td>
                          <td className="p-3">{c.bilik_temuduga}</td>
                          <td className="p-3"><span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded text-xs font-medium">{c.sme_subjek}</span></td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteCalon(c.no_kp)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Padam Calon"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PENDAFTARAN PANEL */}
        {activeTab === 'panel' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-fit">
              <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Daftar Panel Penemuduga</h2>
              <form onSubmit={handleRegisterPanel} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nama Penuh Panel</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: DR. NORHANA BINTI BAKHARY"
                    className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={newPanel.nama_panel}
                    onChange={(e) => setNewPanel({ ...newPanel, nama_panel: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">E-mel Rasmi Panel</label>
                  <input
                    type="email"
                    required
                    placeholder="panel@moe.gov.my"
                    className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={newPanel.email}
                    onChange={(e) => setNewPanel({ ...newPanel, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kata Laluan Sementara</label>
                  <input
                    type="password"
                    required
                    placeholder="Minima 6 aksara"
                    className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={newPanel.password}
                    onChange={(e) => setNewPanel({ ...newPanel, password: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded transition-all text-sm shadow"
                >
                  {loading ? 'Daftar Panel...' : 'Daftar Panel Penemuduga'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Senarai Panel Berdaftar ({panelList.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase text-xs border-b">
                      <th className="p-3">Nama Panel</th>
                      <th className="p-3">E-mel</th>
                      <th className="p-3">Peranan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {panelList.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800">{p.nama_panel}</td>
                        <td className="p-3">{p.email}</td>
                        <td className="p-3"><span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded font-semibold uppercase">{p.role}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PEMANTAUAN KEPUTUSAN */}
        {activeTab === 'keputusan' && (
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 pb-4 border-b">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Pemantauan Keputusan Penilaian Temu Duga</h2>
                <p className="text-slate-500 text-xs">Maklumat markah dikemas kini secara langsung daripada panel penemuduga.</p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari Nama / No KP / Zon..."
                    className="w-full pl-9 pr-3 py-2 border rounded-md text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded transition-all shadow whitespace-nowrap"
                >
                  <Download size={16} /> Eksport Laporan (CSV)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white uppercase">
                    <th className="p-3">No. KP</th>
                    <th className="p-3">Nama Calon</th>
                    <th className="p-3">Zon & Bilik</th>
                    <th className="p-3">SME Subjek</th>
                    <th className="p-3">Penemuduga</th>
                    <th className="p-3 text-center">Jumlah Markah (%)</th>
                    <th className="p-3 text-center">Status Perakuan</th>
                    <th className="p-3">Ulasan Panel</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.length === 0 ? (
                    <tr><td colSpan="8" className="text-center p-6 text-slate-500">Tiada rekod penilaian dijumpai.</td></tr>
                  ) : (
                    filteredResults.map((r) => (
                      <tr key={r.id} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-mono">{r.no_kp_calon}</td>
                        <td className="p-3 font-bold text-slate-800">{r.calon?.nama_penuh || 'N/A'}</td>
                        <td className="p-3">{r.zon} ({r.bilik})</td>
                        <td className="p-3">{r.calon?.sme_subjek}</td>
                        <td className="p-3">{r.profiles?.nama_panel || 'Panel'}</td>
                        <td className="p-3 text-center font-bold text-sm text-blue-700">{r.jumlah_markah}%</td>
                        <td className="p-3 text-center">
                          {r.status_lulus ? (
                            <span className="bg-green-100 text-green-800 font-bold px-2.5 py-1 rounded-full border border-green-300">
                              DIPERAKUKAN
                            </span>
                          ) : (
                            <span className="bg-red-100 text-red-800 font-bold px-2.5 py-1 rounded-full border border-red-300">
                              TIDAK DIPERAKUKAN
                            </span>
                          )}
                        </td>
                        <td className="p-3 max-w-xs truncate text-slate-600">{r.ulasan_panel || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
