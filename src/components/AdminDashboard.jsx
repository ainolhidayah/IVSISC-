import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { UserPlus, UserCheck, FileText, Download, CheckCircle, XCircle, Search, Trash2 } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('calon');
  const [calonList, setCalonList] = useState([]);
  const [newCalon, setNewCalon] = useState({
    no_kp: '',
    nama_penuh: '',
    zon_temuduga: 'Zon Tengah',
    bilik_temuduga: 'Bilik 1',
    sme_subjek: ''
  });

  const [panelList, setPanelList] = useState([]);
  const [newPanel, setNewPanel] = useState({ email: '', password: '', nama_panel: '' });
  const [resultsList, setResultsList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchCalon();
    fetchPanel();
    fetchKeputusan();
  }, []);

  const fetchCalon = async () => {
    const { data } = await supabase.from('calon').select('*').order('created_at', { ascending: false });
    if (data) setCalonList(data);
  };

  const handleAddCalon = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    const { error } = await supabase.from('calon').insert([newCalon]);

    if (error) {
      setMessage({ type: 'error', text: 'Gagal: ' + error.message });
    } else {
      setMessage({ type: 'success', text: 'Calon berjaya didaftarkan!' });
      setNewCalon({ no_kp: '', nama_penuh: '', zon_temuduga: 'Zon Tengah', bilik_temuduga: 'Bilik 1', sme_subjek: '' });
      fetchCalon();
    }
    setLoading(false);
  };

  const handleDeleteCalon = async (no_kp) => {
    if (window.confirm(`Padam calon No. KP: ${no_kp}?`)) {
      await supabase.from('calon').delete().eq('no_kp', no_kp);
      fetchCalon();
    }
  };

  const fetchPanel = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'panel');
    if (data) setPanelList(data);
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
      setMessage({ type: 'error', text: 'Gagal: ' + authError.message });
      setLoading(false);
      return;
    }

    if (authData?.user) {
      await supabase.from('profiles').insert([{
        id: authData.user.id,
        nama_panel: newPanel.nama_panel,
        email: newPanel.email,
        role: 'panel'
      }]);
      setMessage({ type: 'success', text: 'Panel berjaya didaftarkan!' });
      setNewPanel({ email: '', password: '', nama_panel: '' });
      fetchPanel();
    }
    setLoading(false);
  };

  const fetchKeputusan = async () => {
    const { data } = await supabase
      .from('penilaian_skor')
      .select(`*, calon (nama_penuh, sme_subjek), profiles (nama_panel)`)
      .order('created_at', { ascending: false });
    if (data) setResultsList(data);
  };

  const exportToCSV = () => {
    if (resultsList.length === 0) return alert('Tiada data untuk dieksport.');
    const headers = ["No KP", "Nama Calon", "Zon", "Bilik", "SME", "Panel", "Bimbingan", "Instruksional", "Pemikiran Strategik", "Analisis Data", "Interpersonal", "Evidens", "Jumlah (%)", "Status", "Ulasan"];
    const rows = resultsList.map(r => [
      `"${r.no_kp_calon}"`, `"${r.calon?.nama_penuh || ''}"`, `"${r.zon}"`, `"${r.bilik}"`, `"${r.calon?.sme_subjek || ''}"`, `"${r.profiles?.nama_panel || ''}"`,
      r.skor_bimbingan, r.skor_instruksional, r.skor_pemikiran_strategik, r.skor_analisis_data, r.skor_interpersonal, r.skor_evidens, r.jumlah_markah,
      r.status_lulus ? "DIPERAKUKAN" : "TIDAK DIPERAKUKAN", `"${r.ulasan_panel || ''}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_SISC_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredResults = resultsList.filter(r => 
    r.no_kp_calon.includes(searchTerm) || (r.calon?.nama_penuh && r.calon.nama_penuh.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-900 text-white p-6 rounded-lg shadow mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Papan Pemuka Pentadbir (Admin)</h1>
            <p className="text-slate-400 text-xs mt-1">Sistem Penilaian SISC+</p>
          </div>
          <span className="bg-blue-600 text-xs font-semibold px-3 py-1 rounded-full">ADMIN PORTAL</span>
        </div>

        {message.text && (
          <div className={`p-4 mb-6 rounded flex items-center gap-2 ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message.type === 'error' ? <XCircle size={20}/> : <CheckCircle size={20}/>}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        <div className="flex border-b mb-6 bg-white rounded-t px-4 pt-2">
          <button onClick={() => setActiveTab('calon')} className={`py-3 px-6 font-semibold border-b-2 text-sm ${activeTab === 'calon' ? 'border-blue-600 text-blue-600' : 'text-slate-500'}`}>
            <UserPlus size={16} className="inline mr-1"/> Pengurusan Calon
          </button>
          <button onClick={() => setActiveTab('panel')} className={`py-3 px-6 font-semibold border-b-2 text-sm ${activeTab === 'panel' ? 'border-blue-600 text-blue-600' : 'text-slate-500'}`}>
            <UserCheck size={16} className="inline mr-1"/> Pendaftaran Panel
          </button>
          <button onClick={() => setActiveTab('keputusan')} className={`py-3 px-6 font-semibold border-b-2 text-sm ${activeTab === 'keputusan' ? 'border-blue-600 text-blue-600' : 'text-slate-500'}`}>
            <FileText size={16} className="inline mr-1"/> Keputusan Live
          </button>
        </div>

        {activeTab === 'calon' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded border shadow-sm">
              <h2 className="font-bold border-b pb-2 mb-4">Daftar Calon Baru</h2>
              <form onSubmit={handleAddCalon} className="space-y-3">
                <input type="text" required placeholder="No. Kad Pengenalan" className="w-full p-2 border rounded text-xs" value={newCalon.no_kp} onChange={(e) => setNewCalon({ ...newCalon, no_kp: e.target.value })} />
                <input type="text" required placeholder="Nama Penuh Calon" className="w-full p-2 border rounded text-xs" value={newCalon.nama_penuh} onChange={(e) => setNewCalon({ ...newCalon, nama_penuh: e.target.value })} />
                <select className="w-full p-2 border rounded text-xs" value={newCalon.zon_temuduga} onChange={(e) => setNewCalon({ ...newCalon, zon_temuduga: e.target.value })}>
                  <option value="Zon Tengah">Zon Tengah</option>
                  <option value="Zon Utara">Zon Utara</option>
                  <option value="Zon Selatan">Zon Selatan</option>
                  <option value="Zon Sabah">Zon Sabah</option>
                  <option value="Zon Sarawak">Zon Sarawak</option>
                </select>
                <input type="text" required placeholder="Bilik Temuduga (Contoh: Bilik 1)" className="w-full p-2 border rounded text-xs" value={newCalon.bilik_temuduga} onChange={(e) => setNewCalon({ ...newCalon, bilik_temuduga: e.target.value })} />
                <input type="text" required placeholder="SME Subjek (Contoh: Bahasa Melayu)" className="w-full p-2 border rounded text-xs" value={newCalon.sme_subjek} onChange={(e) => setNewCalon({ ...newCalon, sme_subjek: e.target.value })} />
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-2 rounded text-xs">{loading ? 'Menyimpan...' : 'Simpan Calon'}</button>
              </form>
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded border shadow-sm">
              <h2 className="font-bold border-b pb-2 mb-4">Senarai Calon ({calonList.length})</h2>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b"><th className="p-2">No. KP</th><th className="p-2">Nama</th><th className="p-2">Zon/Bilik</th><th className="p-2">SME</th><th className="p-2 text-center">Tindakan</th></tr>
                </thead>
                <tbody>
                  {calonList.map((c) => (
                    <tr key={c.no_kp} className="border-b"><td className="p-2 font-mono">{c.no_kp}</td><td className="p-2 font-bold">{c.nama_penuh}</td><td className="p-2">{c.zon_temuduga} ({c.bilik_temuduga})</td><td className="p-2">{c.sme_subjek}</td><td className="p-2 text-center"><button onClick={() => handleDeleteCalon(c.no_kp)} className="text-red-600"><Trash2 size={14}/></button></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'panel' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded border shadow-sm">
              <h2 className="font-bold border-b pb-2 mb-4">Daftar Panel Baru</h2>
              <form onSubmit={handleRegisterPanel} className="space-y-3">
                <input type="text" required placeholder="Nama Panel" className="w-full p-2 border rounded text-xs" value={newPanel.nama_panel} onChange={(e) => setNewPanel({ ...newPanel, nama_panel: e.target.value })} />
                <input type="email" required placeholder="Emel Panel" className="w-full p-2 border rounded text-xs" value={newPanel.email} onChange={(e) => setNewPanel({ ...newPanel, email: e.target.value })} />
                <input type="password" required placeholder="Kata Laluan" className="w-full p-2 border rounded text-xs" value={newPanel.password} onChange={(e) => setNewPanel({ ...newPanel, password: e.target.value })} />
                <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white font-bold py-2 rounded text-xs">{loading ? 'Mendaftar...' : 'Daftar Panel'}</button>
              </form>
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded border shadow-sm">
              <h2 className="font-bold border-b pb-2 mb-4">Senarai Panel ({panelList.length})</h2>
              <table className="w-full text-left text-xs border-collapse">
                <thead><tr className="bg-slate-100 border-b"><th className="p-2">Nama Panel</th><th className="p-2">Emel</th><th className="p-2">Peranan</th></tr></thead>
                <tbody>
                  {panelList.map((p) => (<tr key={p.id} className="border-b"><td className="p-2 font-bold">{p.nama_panel}</td><td className="p-2">{p.email}</td><td className="p-2"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs">{p.role}</span></td></tr>))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'keputusan' && (
          <div className="bg-white p-6 rounded border shadow-sm">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="font-bold">Keputusan Live</h2>
              <button onClick={exportToCSV} className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded flex items-center gap-1"><Download size={14}/> Eksport CSV</button>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead><tr className="bg-slate-800 text-white"><th className="p-2">No. KP</th><th className="p-2">Nama Calon</th><th className="p-2">Zon & Bilik</th><th className="p-2">Penemuduga</th><th className="p-2 text-center">Markah (%)</th><th className="p-2 text-center">Status</th></tr></thead>
              <tbody>
                {filteredResults.map((r) => (
                  <tr key={r.id} className="border-b"><td className="p-2 font-mono">{r.no_kp_calon}</td><td className="p-2 font-bold">{r.calon?.nama_penuh || 'N/A'}</td><td className="p-2">{r.zon} ({r.bilik})</td><td className="p-2">{r.profiles?.nama_panel || 'Panel'}</td><td className="p-2 text-center font-bold text-blue-600">{r.jumlah_markah}%</td><td className="p-2 text-center">{r.status_lulus ? <span className="bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded">DIPERAKUKAN</span> : <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">GAGAL</span>}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
