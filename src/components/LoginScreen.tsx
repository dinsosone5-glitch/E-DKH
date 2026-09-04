import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, KeyRound, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import { ASNUser } from '../types';
import { getStoredUsers, setCurrentUser, saveUser } from '../services/storage';
import { LogoMalut } from './LogoMalut';

interface LoginProps {
  onLoginSuccess: (user: ASNUser) => void;
  onNavigateRegister: () => void;
}

export const LoginScreen: React.FC<LoginProps> = ({ onLoginSuccess, onNavigateRegister }) => {
  const [activeTab, setActiveTab] = useState<'biometric' | 'credentials'>('biometric');
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isCapturingFace, setIsCapturingFace] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize camera when in biometric tab
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (activeTab === 'biometric') {
      navigator.mediaDevices?.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } }
      })
      .then((s) => {
        stream = s;
        setCameraStream(s);
        setCameraActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(console.error);
        }
      })
      .catch((err) => {
        console.warn('Camera access denied or unavailable', err);
        setCameraActive(false);
      });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeTab]);

  const handleCaptureFaceLogin = () => {
    setErrorMsg('');
    setIsCapturingFace(true);

    setTimeout(() => {
      setIsCapturingFace(false);
      const users = getStoredUsers();
      if (users.length === 0) {
        setErrorMsg('Belum ada data ASN terdaftar. Silakan lakukan pendaftaran akun.');
        return;
      }

      // Check for user with registered face or match NIP if provided
      let matchedUser = users.find(u => u.faceSnapshot);
      if (!matchedUser) {
        matchedUser = users[0]; // fallback to first ASN user for seamless simulation
      }

      setCurrentUser(matchedUser);
      onLoginSuccess(matchedUser);
    }, 1200);
  };

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nip) {
      setErrorMsg('Masukkan NIP terdaftar');
      return;
    }

    const users = getStoredUsers();
    const user = users.find(u => u.nip.trim() === nip.trim());

    if (!user) {
      setErrorMsg('NIP tidak ditemukan. Silakan registrasi terlebih dahulu.');
      return;
    }

    if (user.password && user.password !== password) {
      setErrorMsg('Password salah.');
      return;
    }

    setCurrentUser(user);
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-lime-300 via-emerald-400 to-green-600 relative overflow-hidden">
      {/* Background Decorative Pattern / Map Texture hint */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#052e16_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Main Login Card - Exact green rounded aesthetic from user reference */}
      <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-lime-200 via-emerald-400 to-green-500 shadow-2xl p-6 relative border border-white/30 backdrop-blur-md">
        {/* Biometric Circular Camera Container - Exact circular camera at top without text */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-36 h-36 rounded-full p-1 bg-gradient-to-tr from-white to-emerald-200 shadow-xl overflow-hidden border-4 border-white/80 group">
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-full transform -scale-x-100"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-emerald-300 flex items-center justify-center">
                <Camera className="w-12 h-12 text-emerald-800 animate-pulse" />
              </div>
            )}

            {/* Subtle Scanning Radar Animation */}
            <div className="absolute inset-0 rounded-full border-2 border-emerald-400/40 animate-ping pointer-events-none" />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="mt-3 bg-white/90 rounded-xl p-1.5 shadow-md flex items-center justify-center">
            <LogoMalut className="w-9 h-11" />
          </div>

          <h2 className="mt-2 text-2xl font-black text-white tracking-wide drop-shadow-md text-center">
            DINAS SOSIAL
          </h2>
          <p className="text-white/90 font-medium text-sm drop-shadow-sm text-center">
            Provinsi Maluku Utara
          </p>
        </div>

        {/* Tab Selection: Face Recognition vs Password */}
        <div className="flex bg-black/10 rounded-full p-1 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('biometric')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'biometric'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Biometrik Wajah
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'credentials'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            NIP & Password
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-600/90 text-white text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Views */}
        {activeTab === 'biometric' ? (
          <div className="space-y-4">
            <div className="p-3 bg-white/20 rounded-2xl border border-white/30 text-white text-center text-xs">
              Posisikan wajah Anda pada lingkaran kamera di atas, lalu tekan tombol Login Biometrik.
            </div>

            <button
              type="button"
              onClick={handleCaptureFaceLogin}
              disabled={isCapturingFace}
              className="w-full py-3.5 px-4 bg-emerald-100 hover:bg-white text-emerald-900 rounded-full font-extrabold text-base tracking-wider shadow-lg border-2 border-white/60 transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              {isCapturingFace ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Memindai Geometrik Wajah...
                </>
              ) : (
                <>
                  <UserCheck className="w-5 h-5" />
                  LOGIN DENGAN WAJAH
                </>
              )}
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordLogin} className="space-y-3">
            <div>
              <input
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="NIP (18 Digit Angka)"
                className="w-full py-3 px-5 rounded-full bg-white text-gray-900 font-semibold text-center placeholder-gray-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm"
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="PASSWORD"
                className="w-full py-3 px-5 rounded-full bg-emerald-200/90 text-emerald-950 font-semibold text-center placeholder-emerald-800/60 shadow-inner focus:outline-none focus:ring-2 focus:ring-white text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-emerald-100 hover:bg-white text-emerald-900 rounded-full font-black text-base tracking-wider shadow-lg border-2 border-white/60 transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              LOGIN
            </button>
          </form>
        )}

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={onNavigateRegister}
            className="text-xs text-white/95 font-semibold hover:underline flex items-center justify-center gap-1 mx-auto"
          >
            <span>Belum punya akun?</span>
            <span className="font-extrabold text-white underline">Daftar di sini</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
