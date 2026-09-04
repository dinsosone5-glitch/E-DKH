import React, { useState, useEffect } from 'react';
import { 
  LogOut, PlusCircle, Archive, Cloud, CheckCircle, 
  FolderTree, Building, ShieldCheck, RefreshCw, ExternalLink,
  LayoutDashboard, FileText, Database, ChevronRight, User as UserIcon
} from 'lucide-react';
import { ASNUser, DailyReport } from '../types';
import { DailyReportForm } from './DailyReportForm';
import { ReportArchive } from './ReportArchive';
import { LogoMalut } from './LogoMalut';
import { getStoredReports } from '../services/storage';
import { initAuth, googleSignIn, logoutGoogle, getAccessToken } from '../services/auth';

interface DashboardProps {
  user: ASNUser;
  onLogout: () => void;
}

export const DashboardScreen: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'form' | 'archive'>('form');
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [driveEmail, setDriveEmail] = useState<string | null>(null);

  const loadReports = () => {
    const list = getStoredReports();
    setReports(list);
  };

  useEffect(() => {
    loadReports();

    // Check Google Auth state
    const unsubscribe = initAuth(
      (googleUser, token) => {
        if (token) {
          setIsDriveConnected(true);
          setDriveEmail(googleUser.email || 'dinsosone5@gmail.com');
        } else {
          getAccessToken().then(tok => {
            if (tok) {
              setIsDriveConnected(true);
              setDriveEmail(googleUser.email || 'dinsosone5@gmail.com');
            }
          });
        }
      },
      () => {
        setIsDriveConnected(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleConnectDrive = async () => {
    setIsConnectingDrive(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setIsDriveConnected(true);
        setDriveEmail(result.user.email || 'dinsosone5@gmail.com');
      }
    } catch (e: any) {
      console.error(e);
      alert(`Gagal menghubungkan Google Drive: ${e.message || e}`);
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const handleFinalizedSuccess = (report: DailyReport) => {
    loadReports();
  };

  const handleEditReport = (report: DailyReport) => {
    setActiveTab('form');
  };

  const userReports = reports.filter(r => r.asnId === user.id || r.nip === user.nip);

  // Indonesian current date for header
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const formattedToday = today.toLocaleDateString('id-ID', options);

  return (
    <div className="flex h-screen w-full bg-gray-100 font-sans overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
      {/* Sidebar: Clean Minimalism Slate 900 */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 z-30 shadow-xl">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-md shadow-blue-500/20">
            E
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base leading-tight tracking-tight">E-DKH</span>
            <span className="text-[11px] text-slate-400">Dokumentasi Harian ASN</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
            Menu Utama
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'form'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full ${activeTab === 'form' ? 'bg-white' : 'bg-slate-600'}`} />
              <span>Entri Laporan (PDF)</span>
            </div>
            <PlusCircle className="w-3.5 h-3.5 opacity-70" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('archive')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'archive'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full ${activeTab === 'archive' ? 'bg-white' : 'bg-slate-600'}`} />
              <span>Arsip PDF Dokumen</span>
            </div>
            {userReports.length > 0 && (
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-md font-bold">
                {userReports.length}
              </span>
            )}
          </button>

          {/* Storage Information box */}
          <div className="pt-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
            Penyimpanan Terpusat
          </div>
          <div className="px-3 py-3 bg-slate-800/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Database className="w-3 h-3 text-blue-400" />
              <span>Google Drive Dinas:</span>
            </div>
            <p className="font-mono text-[10px] text-blue-300 truncate">dinsosone5@gmail.com</p>
            <p className="font-mono text-[10px] text-slate-400 pt-0.5">Folder: /E-KIN/E-KIN TH 26</p>
          </div>

          <div className="pt-4 px-2">
            {!isDriveConnected ? (
              <button
                type="button"
                onClick={handleConnectDrive}
                disabled={isConnectingDrive}
                className="w-full py-2 px-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                {isConnectingDrive ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Cloud className="w-3 h-3" />
                )}
                <span>Koneksikan Drive</span>
              </button>
            ) : (
              <div className="px-2 py-1.5 bg-emerald-950/40 border border-emerald-800/40 rounded-lg flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                <span className="truncate">Drive Terverifikasi</span>
              </div>
            )}
          </div>
        </nav>

        {/* User Card & Logout Bottom */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-2.5 bg-slate-800 rounded-xl border border-slate-700/60">
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0 overflow-hidden">
              {user.faceSnapshot ? (
                <img src={user.faceSnapshot} alt="Face" className="w-full h-full object-cover" />
              ) : (
                user.namaLengkap.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-semibold text-white truncate">{user.namaLengkap}</span>
              <span className="text-[10px] text-slate-400 font-mono">NIP. {user.nip}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="w-full mt-3 py-2 text-xs text-red-400 border border-red-900/40 hover:bg-red-900/20 rounded-lg transition-colors font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3 h-3" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main App Workspace */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header matching Clean Minimalism */}
        <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between flex-shrink-0 z-20">
          <div className="flex flex-col">
            <h1 className="text-base sm:text-lg font-bold text-gray-800">
              {activeTab === 'form' ? 'Dashboard Kinerja Aparatur' : 'Arsip Dokumen PDF'}
            </h1>
            <p className="text-xs text-gray-500">{formattedToday}</p>
          </div>

          <div className="flex items-center gap-4">
            {isDriveConnected ? (
              <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Koneksi Drive Aktif</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectDrive}
                className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                Drive Belum Terhubung
              </button>
            )}

            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 shadow-sm">
              {user.namaLengkap.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Dynamic Scrollable Content Workspace */}
        <section className="flex-1 p-6 sm:p-8 overflow-y-auto bg-gray-50/50">
          {activeTab === 'form' ? (
            <DailyReportForm
              user={user}
              onFinalizedSuccess={handleFinalizedSuccess}
              isDriveConnected={isDriveConnected}
              onConnectDrive={handleConnectDrive}
            />
          ) : (
            <ReportArchive
              user={user}
              reports={reports}
              onRefresh={loadReports}
              onEditReport={handleEditReport}
            />
          )}
        </section>
      </main>
    </div>
  );
};
