import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CheckCircle, AlertCircle, Save, User, ShieldCheck } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const RUBRIK_DATA = [
  { id: 'skor_bimbingan', nama: '1. Bimbingan Profesional (25%)', wajaran: 25 },
  { id: 'skor_instruksional', nama: '2. Competency Instruksional (20%)', wajaran: 20 },
  { id: 'skor_pemikiran_strategik', nama: '3. Pemikiran Strategik (20%)', wajaran: 20 },
  { id: 'skor_analisis_data', nama: '4. Analisis Data (15%)', wajaran: 15 },
  { id: 'skor_interpersonal', nama: '5. Interpersonal (10%)', wajaran: 10 },
  { id: 'skor_evidens', nama: '6. Evidens Profesional (10%)', wajaran: 10 }
];

export default function PanelForm() {
  const [zon, setZon] = useState('');
  const [bilik, setBilik] = useState('');
  const [calonList, setCalonList] = useState([]);
  const [selectedKP, setSelectedKP] = useState('');
  const [selectedCalon, setSelectedCalon] = useState(null);

  const [scores, setScores] = useState({
    skor_bimbingan: 0, skor_instruksional: 0, skor_pemikiran_strategik: 0, skor_analisis_data: 0, skor_interpersonal: 0, skor_evidens: 0
  });

  const [ulasan, setUlasan] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (zon && bilik) fetchCalonByZonBilik();
  }, [zon, bilik]);

  const fetchCalonByZonBilik = async () => {
    const { data } = await supabase.from('calon').select('*').eq('zon_temuduga', zon).eq('bilik_temuduga', bilik);
    if (data) setCalonList(data);
  };

  const handleSelectKP = (kp) => {
    setSelectedKP(kp);
    const calonFound = calonList.find(c => c.no_kp === kp);
    setSelectedCalon(calonFound || null);
  };

  const calculateTotalScore = () => {
    let total = 0;
    RUBRIK_DATA.forEach(r => {
      total += ((scores[r.id] || 0) / 5) * r.wajaran;
    });
    return total.toFixed(2);
  };

  const checkPassStatus = (totalScore) => {
    if (totalScore < 75) return false;
    if (scores.skor_bimbingan < 3 || scores.skor_instruksional < 3 || scores.skor_pemikiran_strategik < 3 || scores.skor_analisis_data < 3) return false;
    return true;
  };

  const handleSubmitAssessment = async (e) => {
    e.preventDefault();
    if (!selectedCalon) return alert('Sila pilih calon.');
    if (Object.values(scores).some(val => val === 0)) return alert('Isi kesemua skor domain.');

    setLoading(true);
    const totalMarkah = calculateTotalScore();
    const statusLulus = checkPassStatus(totalMarkah);
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      no_kp_calon: selectedCalon.no_kp,
      id_panel: user?.id || null,
      zon, bilik, ...scores,
      jumlah_markah: parseFloat(totalMarkah),
      status_lulus: statusLulus,
      ulasan_panel: ulasan
    };

    const { error } = await supabase.from('penilaian_skor').insert([payload]);

    if (error) {
      setMessage({ type: 'error', text: 'Gagal: ' + error.message });
    } else {
      setMessage({ type: 'success', text: 'Penilaian berjaya disimpan!' });
      setScores({ skor_bimbingan: 0, skor_instruksional: 0, skor_pemikiran_strategik: 0, skor_analisis_data: 0, skor_interpersonal: 0, skor_evidens: 0 });
      setUlasan('');
      setSelectedCalon(null);
      setSelectedKP('');
    }
    setLoading(false);
  };

  const currentTotal = calculateTotalScore();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-blue-900 text-white p-6 rounded-lg shadow mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Borang Penilaian Panel Penemuduga</h1>
            <p className="text-blue-200 text-xs">Jawatan SISC+</p>
          </div>
          <ShieldCheck size={28}/>
        </div>

        {message.text && (
          <div className={`p-4 mb-6 rounded flex items-center gap-2 ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle size={20}/>}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        <div className="bg-white p-6 rounded border mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">1. Pilih Zon</label>
            <select className="w-full p-2 border rounded text-xs" value={zon} onChange={(e) => setZon(e.target.value)}>
              <option value="">-- Pilih Zon --</option>
              <option value="Zon Tengah">Zon Tengah</option>
              <option value="Zon Utara">Zon Utara</option>
              <option value="Zon Selatan">Zon Selatan</option>
              <option value="Zon Sabah">Zon Sabah</option>
              <option value="Zon Sarawak">Zon Sarawak</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">2. Pilih Bilik</label>
            <input type="text" placeholder="Contoh: Bilik 1" className="w-full p-2 border rounded text-xs" value={bilik} onChange={(e) => setBilik(e.target.value)} />
          </div>
        </div>

        {zon && bilik && (
          <div className="bg-white p-6 rounded border mb-6">
            <label className="block text-xs font-bold uppercase mb-1">3. Pilih No. KP Calon</label>
            <select className="w-full p-2 border rounded text-xs font-mono" value={selectedKP} onChange={(e) => handleSelectKP(e.target.value)}>
              <option value="">-- Pilih No. KP --</option>
              {calonList.map(c => <option key={c.no_kp} value={c.no_kp}>{c.no_kp} - {c.nama_penuh}</option>)}
            </select>
          </div>
        )}

        {selectedCalon && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-6 text-xs text-slate-800">
            <h3 className="font-bold text-blue-900 mb-2 border-b border-blue-200 pb-1 flex items-center gap-1"><User size={16}/> Maklumat Calon</h3>
            <p><strong>Nama:</strong> {selectedCalon.nama_penuh}</p>
            <p><strong>No. KP:</strong> {selectedCalon.no_kp}</p>
            <p><strong>Zon & Bilik:</strong> {selectedCalon.zon_temuduga} ({selectedCalon.bilik_temuduga})</p>
            <p><strong>SME Subjek:</strong> <span className="bg-blue-200 px-2 py-0.5 rounded font-bold">{selectedCalon.sme_subjek}</span></p>
          </div>
        )}

        {selectedCalon && (
          <form onSubmit={handleSubmitAssessment} className="space-y-4">
            {RUBRIK_DATA.map((domain) => (
              <div key={domain.id} className="bg-white p-4 rounded border">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-xs">{domain.nama}</h4>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((skorVal) => (
                    <button
                      type="button" key={skorVal} onClick={() => setScores({ ...scores, [domain.id]: skorVal })}
                      className={`flex-1 py-2 rounded text-xs font-bold border ${scores[domain.id] === skorVal ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700'}`}
                    >
                      Skor {skorVal}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-white p-4 rounded border">
              <label className="block text-xs font-bold uppercase mb-1">Ulasan Panel</label>
              <textarea rows="2" className="w-full p-2 border rounded text-xs" value={ulasan} onChange={(e) => setUlasan(e.target.value)}></textarea>
            </div>

            <div className="bg-slate-900 text-white p-4 rounded flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400 font-bold">Jumlah Markah</p>
                <div className="text-2xl font-extrabold text-blue-400">{currentTotal}%</div>
              </div>
              <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded text-xs flex items-center gap-1">
                <Save size={16}/> {loading ? 'Menyimpan...' : 'Hantar Markah'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
