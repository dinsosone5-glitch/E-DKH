import React, { useState, useRef, useEffect } from 'react';
import { Camera, Check, ShieldCheck, ArrowLeft, Building, User, Lock, Briefcase } from 'lucide-react';
import { ASNUser } from '../types';
import { INSTANSI_DATA } from '../constants';
import { saveUser, setCurrentUser } from '../services/storage';
import { LogoMalut } from './LogoMalut';

interface RegisterProps {
  onRegisterSuccess: (user: ASNUser) => void;
  onNavigateLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterProps> = ({ onRegisterSuccess, onNavigateLogin }) => {
  const [namaLengkap, setNamaLengkap] = useState('');
  const [nip, setNip] = useState('');
  const [pangkatGol, setPangkatGol] = useState('Penata Muda (III/a)');
  const [instansi, setInstansi] = useState(INSTANSI_DATA[0].name);
  const [unitKerja, setUnitKerja] = useState(INSTANSI_DATA[0].units[0].name);
  const [bidangBagian, setBidangBagian] = useState(INSTANSI_DATA[0].units[0].subUnits?.[0] || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [faceSnapshot, setFaceSnapshot] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Available units for selected instansi
  const selectedInstansiObj = INSTANSI_DATA.find(i => i.name === instansi) || INSTANSI_DATA[0];
  const availableUnits = selectedInstansiObj.units;
  const selectedUnitObj = availableUnits.find(u => u.name === unitKerja) || availableUnits[0];
  const availableSubUnits = selectedUnitObj?.subUnits || [];

  const handleInstansiChange = (newInstansiName: string) => {
    setInstansi(newInstansiName);
    const instObj = INSTANSI_DATA.find(i => i.name === newInstansiName) || INSTANSI_DATA[0];
    const firstUnit = instObj.units[0]?.name || '';
    setUnitKerja(firstUnit);
    setBidangBagian(instObj.units[0]?.subUnits?.[0] || '');
  };

  const handleUnitChange = (newUnitName: string) => {
    setUnitKerja(newUnitName);
    const unitObj = availableUnits.find(u => u.name === newUnitName);
    setBidangBagian(unitObj?.subUnits?.[0] || '');
  };

  const startCamera = async () => {
    try {
      setCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 400, height: 400 }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (e) {
      alert("Kamera tidak dapat diakses.");
      setCameraOpen(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 300, 300);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setFaceSnapshot(dataUrl);
      }
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!namaLengkap.trim()) {
      setErrorMsg('Nama Lengkap harus diisi sesuai SK.');
      return;
    }
    if (!nip.trim() || nip.trim().length < 10) {
      setErrorMsg('NIP minimal 10 digit (standar 18 digit angka).');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }
    if (!agreeTerms) {
      setErrorMsg('Anda harus menyetujui validitas data kepegawaian.');
      return;
    }

    const newUser: ASNUser = {
      id: `asn_${Date.now()}`,
      namaLengkap: namaLengkap.trim(),
      nip: nip.trim(),
      pangkatGol,
      instansi,
      unitKerja,
      bidangBagian,
      password,
      faceSnapshot: faceSnapshot || undefined,
      createdAt: new Date().toISOString(),
    };

    saveUser(newUser);
    setCurrentUser(newUser);
    onRegisterSuccess(newUser);
  };

  return (
    <div className="min-h-screen w-full bg-slate-900/60 py-8 px-4 flex items-center justify-center relative">
      {/* Background Graphic resembling Maluku Utara Map */}
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-gradient-to-tr from-emerald-950 via-teal-900 to-sky-950" />

      {/* Main Registration Card - Exact format from user reference 'referensi registrasi.png' */}
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10 border border-slate-100">
        {/* Top App Header */}
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <LogoMalut className="w-10 h-12" />
            <div>
              <div className="text-xs font-black tracking-widest text-emerald-800 uppercase">
                DINSOS ONE
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                PROVINSI MALUKU UTARA
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateLogin}
            className="text-gray-400 hover:text-emerald-700 transition-colors p-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-black text-emerald-900 tracking-tight">
            Pendaftaran Akun
          </h2>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            Silakan lengkapi formulir di bawah ini untuk mengakses sistem E-KIN DINSOS ONE dan sinkronisasi otomatis Google Drive.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Biometric Face Capture option */}
          <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/60 flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
              {faceSnapshot ? (
                <img src={faceSnapshot} alt="Wajah ASN" className="w-full h-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-emerald-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-emerald-950">
                Perekaman Biometrik Wajah (Opsional)
              </div>
              <div className="text-[11px] text-emerald-700">
                Memudahkan login instan tanpa mengetik sandi
              </div>
            </div>
            <button
              type="button"
              onClick={startCamera}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1"
            >
              <Camera className="w-3.5 h-3.5" />
              {faceSnapshot ? 'Ubah' : 'Ambil'}
            </button>
          </div>

          {/* Camera Modal preview */}
          {cameraOpen && (
            <div className="p-3 bg-slate-900 rounded-2xl text-center space-y-2">
              <video ref={videoRef} autoPlay playsInline className="w-48 h-48 mx-auto rounded-full object-cover border-2 border-emerald-400" />
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold"
                >
                  Ambil Foto Wajah
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-xs"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Nama Lengkap & NIP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nama Lengkap
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  placeholder="Masukkan nama sesuai SK"
                  className="w-full text-xs py-2.5 px-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                NIP
              </label>
              <input
                type="text"
                required
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="18 digit angka"
                className="w-full text-xs py-2.5 px-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Pangkat / Golongan */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Pangkat / Golongan Ruang
            </label>
            <input
              type="text"
              value={pangkatGol}
              onChange={(e) => setPangkatGol(e.target.value)}
              placeholder="Contoh: Pembina (IV/a), Penata (III/c)"
              className="w-full text-xs py-2.5 px-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* INSTANSI / UPTD (Dropdown structure from prompt) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              INSTANSI / UPTD
            </label>
            <select
              value={instansi}
              onChange={(e) => handleInstansiChange(e.target.value)}
              className="w-full text-xs py-2.5 px-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium text-gray-800"
            >
              {INSTANSI_DATA.map((ins) => (
                <option key={ins.id} value={ins.name}>
                  {ins.name}
                </option>
              ))}
            </select>
          </div>

          {/* UNIT KERJA */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              UNIT KERJA
            </label>
            <select
              value={unitKerja}
              onChange={(e) => handleUnitChange(e.target.value)}
              className="w-full text-xs py-2.5 px-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium text-gray-800"
            >
              {availableUnits.map((u) => (
                <option key={u.name} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* PILIH BIDANG / BAGIAN */}
          {availableSubUnits.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                JABATAN / BIDANG (ESELON / FUNGSIONAL / PELAKSANA)
              </label>
              <select
                value={bidangBagian}
                onChange={(e) => setBidangBagian(e.target.value)}
                className="w-full text-xs py-2.5 px-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium text-gray-800"
              >
                {availableSubUnits.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Kata Sandi */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Kata Sandi
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full text-xs py-2.5 px-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600 font-medium"
              >
                {showPassword ? 'Sembunyi' : 'Lihat'}
              </button>
            </div>
          </div>

          {/* Checkbox agreement */}
          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-emerald-700 focus:ring-emerald-500"
            />
            <label htmlFor="terms" className="text-[11px] text-gray-600 leading-tight">
              Saya menyetujui bahwa data yang saya masukkan adalah benar dan valid sesuai dengan data kepegawaian Pemerintah Provinsi Maluku Utara.
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-2xl font-bold text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 mt-2"
          >
            <span>Daftar & Buat Akun</span>
            <ShieldCheck className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-gray-500">
          Sudah punya akun?{' '}
          <button
            type="button"
            onClick={onNavigateLogin}
            className="font-bold text-emerald-800 hover:underline"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};
