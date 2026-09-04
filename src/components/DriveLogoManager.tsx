import React, { useState, useEffect } from 'react';
import { 
  Cloud, RefreshCw, CheckCircle, Image as ImageIcon, 
  FolderSearch, AlertCircle, Sparkles, Trash2, ArrowUpRight
} from 'lucide-react';
import { 
  findDriveAssetFolderAndLogos, 
  fetchDriveImageAsDataUrl, 
  getSavedLogoDataUrl, 
  saveLogoDataUrl, 
  DriveAssetFile 
} from '../services/driveAssetService';

interface DriveLogoManagerProps {
  isDriveConnected: boolean;
  onConnectDrive: () => void;
}

export const DriveLogoManager: React.FC<DriveLogoManagerProps> = ({
  isDriveConnected,
  onConnectDrive,
}) => {
  const [assetFiles, setAssetFiles] = useState<DriveAssetFile[]>([]);
  const [folderFound, setFolderFound] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [currentLogo, setCurrentLogo] = useState<string | null>(() => getSavedLogoDataUrl());
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadDriveAssets = async () => {
    if (!isDriveConnected) return;

    setIsSearching(true);
    setStatusMsg('Memindai folder ASSET di Google Drive dinsosone5@gmail.com...');
    try {
      const result = await findDriveAssetFolderAndLogos();
      setFolderFound(result.folderName || 'Folder ASSET / Root Drive');
      setAssetFiles(result.files);

      if (result.files.length > 0) {
        setStatusMsg(`Ditemukan ${result.files.length} file gambar di folder "${result.folderName || 'ASSET'}".`);

        // Automatically select the first logo file if none is saved yet
        if (!getSavedLogoDataUrl()) {
          const defaultLogo = result.files.find(f => 
            f.name.toLowerCase().includes('logo') || 
            f.name.toLowerCase().includes('malut') ||
            f.name.toLowerCase().includes('lambang')
          ) || result.files[0];

          if (defaultLogo) {
            handleApplyLogo(defaultLogo.id, defaultLogo.name);
          }
        }
      } else {
        setStatusMsg('Belum ditemukan file logo di folder ASSET. Anda dapat mengunggah file Logo Malut ke folder ASSET Google Drive.');
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg(`Gagal memindai Google Drive: ${err.message || err}`);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (isDriveConnected) {
      loadDriveAssets();
    }
  }, [isDriveConnected]);

  const handleApplyLogo = async (fileId: string, fileName: string) => {
    setIsDownloading(fileId);
    setStatusMsg(`Mengunduh dan menerapkan "${fileName}" sebagai logo resmi...`);
    try {
      const dataUrl = await fetchDriveImageAsDataUrl(fileId);
      setCurrentLogo(dataUrl);
      window.dispatchEvent(new Event('edkh_logo_updated'));
      setStatusMsg(`Logo resmi berhasil diperbarui dengan file "${fileName}" dari folder ASSET!`);
    } catch (err: any) {
      console.error(err);
      alert(`Gagal mengambil logo: ${err.message || err}`);
    } finally {
      setIsDownloading(null);
    }
  };

  const handleResetToDefault = () => {
    saveLogoDataUrl(null);
    setCurrentLogo(null);
    window.dispatchEvent(new Event('edkh_logo_updated'));
    setStatusMsg('Logo telah dikembalikan ke Lambang Vektor Resmi Provinsi Maluku Utara.');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-tight">
              Sinkronisasi Logo Malut dari Google Drive
            </h3>
            <p className="text-[11px] text-gray-500">
              Folder Target: <span className="font-mono text-blue-600 font-semibold">ASSET</span> di akun <span className="font-mono text-gray-700 font-semibold">dinsosone5@gmail.com</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isDriveConnected ? (
            <button
              type="button"
              onClick={onConnectDrive}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Hubungkan Drive Dinas</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={loadDriveAssets}
              disabled={isSearching}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-gray-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin text-blue-600' : ''}`} />
              <span>Pindai Ulang ASSET</span>
            </button>
          )}

          {currentLogo && (
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 border border-red-200"
              title="Kembalikan ke lambang vektor default"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Vektor</span>
            </button>
          )}
        </div>
      </div>

      {/* Current Active Logo Status */}
      <div className="mt-4 flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="w-14 h-16 bg-white rounded-lg border border-gray-200 p-1 flex items-center justify-center flex-shrink-0 shadow-xs">
          {currentLogo ? (
            <img src={currentLogo} alt="Logo Terpilih" className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="text-[10px] text-gray-400 font-bold text-center">Vektor Malut</div>
          )}
        </div>
        <div className="flex-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-gray-800">Status Logo Saat Ini:</span>
            {currentLogo ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px] flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                Kustom dari Folder ASSET Drive
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 font-semibold text-[10px]">
                Lambang Resmi Provinsi Maluku Utara (Bawaan)
              </span>
            )}
          </div>
          <p className="text-gray-500 mt-0.5 text-[11px]">
            Logo ini langsung diterapkan di Kop Surat aplikasi dan dicetak otomatis pada dokumen PDF A4 bukti dukung kepegawaian.
          </p>
        </div>
      </div>

      {/* Asset Files Found in Drive */}
      {isDriveConnected && assetFiles.length > 0 && (
        <div className="mt-4">
          <span className="text-xs font-bold text-gray-600 block mb-2">
            Pilih File Gambar dari Folder {folderFound || 'ASSET'}:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {assetFiles.map((file) => {
              const isSelected = isDownloading === file.id;
              return (
                <div
                  key={file.id}
                  onClick={() => handleApplyLogo(file.id, file.name)}
                  className="p-2.5 rounded-lg border border-gray-200 hover:border-blue-500 bg-white hover:bg-blue-50/50 cursor-pointer transition-all flex flex-col justify-between group shadow-2xs"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span className="text-[11px] font-bold text-gray-800 truncate block">
                      {file.name}
                    </span>
                  </div>

                  <div className="w-full h-16 bg-gray-50 rounded border border-gray-100 overflow-hidden flex items-center justify-center relative">
                    {file.thumbnailLink ? (
                      <img
                        src={file.thumbnailLink}
                        alt={file.name}
                        className="max-h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-[10px] text-gray-400 font-mono">ASSET</span>
                    )}

                    {isSelected && (
                      <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 text-blue-700 animate-spin" />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="mt-2 w-full py-1 bg-blue-50 group-hover:bg-blue-600 text-blue-700 group-hover:text-white rounded text-[10px] font-bold transition-colors text-center"
                  >
                    Gunakan Logo Ini
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {statusMsg && (
        <div className="mt-3 text-xs text-blue-800 bg-blue-50/70 p-2.5 rounded-lg border border-blue-100 flex items-center gap-2 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}
    </div>
  );
};
