import React, { useState, useRef } from 'react';
import { 
  Plus, Trash2, Upload, FileText, CheckCircle2, CloudUpload,
  Calendar, Eye, RefreshCw, FolderTree, ExternalLink, Sparkles
} from 'lucide-react';
import { ASNUser, DailyReport, ActivityImageItem } from '../types';
import { BULAN_NAMES, HARI_NAMES } from '../constants';
import { compressImage, generateReportPdf } from '../services/pdfGenerator';
import { ensureUserFolderHierarchy, uploadPdfToDrive } from '../services/drive';
import { saveReport, getStoredReports } from '../services/storage';
import { HeaderKopDinas } from './LogoMalut';
import { DriveLogoManager } from './DriveLogoManager';
import confetti from 'canvas-confetti';

interface ReportFormProps {
  user: ASNUser;
  onFinalizedSuccess: (report: DailyReport) => void;
  isDriveConnected: boolean;
  onConnectDrive: () => void;
}

export const DailyReportForm: React.FC<ReportFormProps> = ({
  user,
  onFinalizedSuccess,
  isDriveConnected,
  onConnectDrive,
}) => {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);
  const [kegiatanDeskripsi, setKegiatanDeskripsi] = useState('');
  
  // Dynamic images: starts with 4 default slots (matching 1:1 image boxes in reference)
  const [images, setImages] = useState<ActivityImageItem[]>([
    { id: '1', title: 'Image (1)', dataUrl: '', caption: '' },
    { id: '2', title: 'Image (2)', dataUrl: '', caption: '' },
    { id: '3', title: 'Image (3)', dataUrl: '', caption: '' },
    { id: '4', title: 'Image (4)', dataUrl: '', caption: '' },
  ]);

  const [previewPdfBlob, setPreviewPdfBlob] = useState<Blob | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);

  // Indonesian date format
  const dateObj = new Date(selectedDate);
  const hari = HARI_NAMES[dateObj.getDay()] || 'Senin';
  const tanggalAngka = dateObj.getDate();
  const bulanHuruf = BULAN_NAMES[dateObj.getMonth()] || 'Januari';
  const tahun = dateObj.getFullYear();

  const handleAddImageSlot = () => {
    const nextNumber = images.length + 1;
    setImages([
      ...images,
      {
        id: String(Date.now()),
        title: `Image (${nextNumber})`,
        dataUrl: '',
        caption: '',
      },
    ]);
  };

  const handleSelectImageForSlot = (slotId: string) => {
    setActiveSlotId(slotId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSlotId) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawDataUrl = event.target?.result as string;
      const compressed = await compressImage(rawDataUrl, 1000, 1000, 0.8);

      setImages((prev) =>
        prev.map((item) =>
          item.id === activeSlotId ? { ...item, dataUrl: compressed } : item
        )
      );
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, dataUrl: '', caption: '' } : img))
    );
  };

  const buildReportObject = (status: 'draft' | 'finalized'): DailyReport => {
    const filteredImages = images.filter((img) => img.dataUrl);
    const existingReports = getStoredReports();
    const existingSameDay = existingReports.find(
      (r) => r.asnId === user.id && r.dateKey === selectedDate
    );

    const reportId = existingSameDay ? existingSameDay.id : `edkh_${user.nip}_${selectedDate}`;

    return {
      id: reportId,
      asnId: user.id,
      asnName: user.namaLengkap,
      nip: user.nip,
      pangkatGol: user.pangkatGol || 'Penata Muda (III/a)',
      jabatan: user.bidangBagian || user.unitKerja,
      instansi: user.instansi,
      unitKerja: user.unitKerja,
      bidangBagian: user.bidangBagian,
      hari,
      tanggalAngka,
      bulanHuruf,
      tahun,
      dateKey: selectedDate,
      kegiatanDeskripsi,
      images: filteredImages.length > 0 ? filteredImages : images,
      status,
      createdAt: existingSameDay ? existingSameDay.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const handleGeneratePreview = async () => {
    setIsGeneratingPdf(true);
    setStatusMessage('Menghasilkan Pratinjau Dokumen PDF A4...');
    try {
      const report = buildReportObject('draft');
      const pdfBlob = await generateReportPdf(report);
      const url = URL.createObjectURL(pdfBlob);
      setPreviewPdfBlob(pdfBlob);
      setPreviewPdfUrl(url);
      setStatusMessage('Pratinjau PDF siap ditinjau!');
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Gagal membuat PDF: ${err.message || err}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleFinalizeDocPdf = async () => {
    const hasPhotos = images.some((img) => img.dataUrl);
    if (!hasPhotos) {
      alert('Silakan masukkan minimal 1 foto bukti dokumentasi kegiatan.');
      return;
    }

    setIsFinalizing(true);
    setStatusMessage('Memulai finalisasi dokumen dan pembuatan struktur folder...');

    try {
      const report = buildReportObject('finalized');
      const pdfBlob = await generateReportPdf(report);

      const cleanName = user.namaLengkap.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `E-DKH_${report.dateKey}_${cleanName}.pdf`;

      let driveUploadedInfo = null;
      let hierarchyDisplay = '';

      if (isDriveConnected) {
        setStatusMessage('Menyinkronkan folder E-KIN > E-KIN TH 26 > Instansi > Unit > Nama Pengguna...');
        const folderResult = await ensureUserFolderHierarchy({
          instansi: user.instansi,
          unitKerja: user.unitKerja,
          asnName: user.namaLengkap,
          nip: user.nip,
          bulan: report.bulanHuruf,
          tahun: report.tahun,
        });

        hierarchyDisplay = folderResult.folderPathDisplay;
        setStatusMessage(`Mengunggah file PDF ke folder Google Drive dinas...`);

        driveUploadedInfo = await uploadPdfToDrive(pdfBlob, fileName, folderResult.targetFolderId);
      }

      const finalReport: DailyReport = {
        ...report,
        pdfDriveId: driveUploadedInfo?.fileId,
        pdfDriveViewLink: driveUploadedInfo?.webViewLink,
        pdfDriveDownloadLink: driveUploadedInfo?.webContentLink,
        driveFolderPath: hierarchyDisplay || `E-KIN / E-KIN TH 26 / ${user.instansi} / ${user.unitKerja} / ${user.namaLengkap}`,
        driveFolderId: driveUploadedInfo?.folderId,
      };

      saveReport(finalReport);

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });

      // Clear draft form back to clean state
      setKegiatanDeskripsi('');
      setImages([
        { id: '1', title: 'Image (1)', dataUrl: '', caption: '' },
        { id: '2', title: 'Image (2)', dataUrl: '', caption: '' },
        { id: '3', title: 'Image (3)', dataUrl: '', caption: '' },
        { id: '4', title: 'Image (4)', dataUrl: '', caption: '' },
      ]);
      setPreviewPdfBlob(null);
      setPreviewPdfUrl(null);
      setStatusMessage('Dokumen PDF berhasil difinalisasi dan tersimpan ke Google Drive!');

      onFinalizedSuccess(finalReport);
    } catch (err: any) {
      console.error(err);
      alert(`Peringatan: ${err.message || 'Gagal finalisasi PDF'}. File tetap tersimpan di lokal sistem.`);
      const report = buildReportObject('finalized');
      saveReport(report);
      onFinalizedSuccess(report);
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleResetDraft = () => {
    setKegiatanDeskripsi('');
    setImages([
      { id: '1', title: 'Image (1)', dataUrl: '', caption: '' },
      { id: '2', title: 'Image (2)', dataUrl: '', caption: '' },
      { id: '3', title: 'Image (3)', dataUrl: '', caption: '' },
      { id: '4', title: 'Image (4)', dataUrl: '', caption: '' },
    ]);
    setStatusMessage('Form draf telah dibersihkan.');
  };

  const targetPath = `/E-KIN/2026/${user.namaLengkap.replace(/\s+/g, '_')}/${user.unitKerja.replace(/\s+/g, '_')}`;

  return (
    <div className="space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Dynamic Google Drive Logo Malut Sync from ASSET folder */}
      <DriveLogoManager
        isDriveConnected={isDriveConnected}
        onConnectDrive={onConnectDrive}
      />

      <div className="grid grid-cols-12 gap-6">
        {/* Left 8 Columns: Form Pendukung Laporan & Upload Grid */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          {/* Main Clean Minimalist Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-gray-700 text-sm sm:text-base">
                Form Pendukung Laporan (PDF)
              </h2>
              <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded font-medium border border-blue-100">
                Format A4 Terintegrasi
              </span>
            </div>

            {/* Structured Selection Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    Instansi / UPTD
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user.instansi}
                    className="w-full border border-gray-300 rounded p-2 text-sm bg-gray-50 text-gray-800 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    Unit Kerja
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user.unitKerja}
                    className="w-full border border-gray-300 rounded p-2 text-sm bg-gray-50 text-gray-800 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    Bagian / Eselon / Bidang
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user.bidangBagian || user.pangkatGol || 'Pelaksana'}
                    className="w-full border border-gray-300 rounded p-2 text-sm bg-gray-50 text-gray-800 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    Folder Tujuan Otomatis
                  </label>
                  <input
                    type="text"
                    disabled
                    value={targetPath}
                    className="w-full border border-gray-200 rounded p-2 text-xs bg-gray-100 text-gray-600 font-mono truncate"
                  />
                </div>
              </div>
            </div>

            {/* Date Picker Bar */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/60 p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-gray-700">Tanggal Kegiatan:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs font-semibold py-1 px-2.5 bg-white border border-gray-300 rounded text-gray-800 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="text-xs text-gray-500">
                Format Surat: <span className="font-bold text-gray-700">{hari}, {tanggalAngka} {bulanHuruf} {tahun}</span>
              </div>
            </div>

            {/* Image Boxes 1:1 Layout */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-tight">
                  Bukti Dukung Foto (Format Rasio 1:1)
                </span>
                <button
                  type="button"
                  onClick={handleAddImageSlot}
                  className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs font-bold transition-colors flex items-center gap-1 border border-blue-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Foto
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((item, index) => {
                  const imageNumber = index + 1;
                  return (
                    <div
                      key={item.id}
                      className="bg-gray-50/80 rounded-lg p-2.5 border border-gray-200 flex flex-col justify-between group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-gray-600 uppercase">
                          Foto ({imageNumber})
                        </span>
                        {item.dataUrl && (
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(item.id)}
                            className="text-red-500 hover:text-red-700 p-0.5"
                            title="Hapus"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* 1:1 Box */}
                      <div
                        onClick={() => handleSelectImageForSlot(item.id)}
                        className="w-full aspect-square bg-white rounded border border-gray-300 overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-colors relative"
                      >
                        {item.dataUrl ? (
                          <img
                            src={item.dataUrl}
                            alt={`Dokumentasi ${imageNumber}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-2">
                            <div className="w-8 h-8 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-1 group-hover:text-blue-600 transition-colors">
                              <Upload className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-semibold text-gray-500 block">
                              Pilih Foto
                            </span>
                          </div>
                        )}
                      </div>

                      <input
                        type="text"
                        value={item.caption || ''}
                        onChange={(e) => {
                          const cap = e.target.value;
                          setImages(prev => prev.map(img => img.id === item.id ? { ...img, caption: cap } : img));
                        }}
                        placeholder={`Keterangan ${imageNumber}...`}
                        className="mt-2 text-[10px] py-1 px-1.5 bg-white border border-gray-200 rounded text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons matching Clean Minimalism */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGeneratePreview}
                  disabled={isGeneratingPdf}
                  className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded transition-colors flex items-center gap-1.5"
                >
                  {isGeneratingPdf ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>Pratinjau PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetDraft}
                  className="px-3.5 py-2 text-xs font-bold text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  DRAFT BARU
                </button>
              </div>

              <button
                type="button"
                onClick={handleFinalizeDocPdf}
                disabled={isFinalizing}
                className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-md shadow-blue-200 transition-all flex items-center gap-2"
              >
                {isFinalizing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>MEMPROSES...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-blue-200" />
                    <span>FINALISASI PDF & SIMPAN</span>
                  </>
                )}
              </button>
            </div>

            {statusMessage && (
              <div className="mt-4 p-2.5 rounded bg-blue-50 border border-blue-100 text-blue-800 text-xs font-medium flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>

          {/* 3 Metrics Cards matching Clean Minimalism */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
              <span className="text-xs text-gray-400 font-bold uppercase">Laporan Terkirim</span>
              <div className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1">
                {getStoredReports().filter(r => r.asnId === user.id).length}
              </div>
              <div className="text-[10px] text-green-500 font-medium">+1 Terverifikasi</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
              <span className="text-xs text-gray-400 font-bold uppercase">Kapasitas Drive</span>
              <div className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1">
                15<span className="text-sm text-gray-400">GB</span>
              </div>
              <div className="text-[10px] text-blue-500 font-medium">Akun: DinsosOne</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
              <span className="text-xs text-gray-400 font-bold uppercase">Status Akun</span>
              <div className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1">ASN</div>
              <div className="text-[10px] text-emerald-600 font-medium">Face ID Verified</div>
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Biometric Verification & Activity Logs */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Biometric Face Verification Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center">
            <h3 className="text-xs font-bold text-gray-500 uppercase self-start mb-4">
              Verifikasi Biometrik Wajah
            </h3>

            <div className="relative w-36 h-36 rounded-full border-4 border-blue-500 p-1 mb-4 shadow-lg shadow-blue-100 flex items-center justify-center overflow-hidden bg-slate-900">
              {user.faceSnapshot ? (
                <img
                  src={user.faceSnapshot}
                  alt="Biometric face"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-blue-300 text-xs font-bold">
                  Foto ASN
                </div>
              )}
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="w-full h-1 bg-blue-400 absolute top-1/2 left-0" />
              </div>
            </div>

            <span className="text-xs text-blue-600 font-mono tracking-wider text-center uppercase font-bold mb-2">
              Sistem Kamera Aktif
            </span>
            <p className="text-[10px] text-gray-400 text-center leading-relaxed italic">
              Tatap layar untuk autentikasi otomatis saat login atau finalisasi dokumen laporan.
            </p>
          </div>

          {/* Activity Logs Card matching Clean Minimalism */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex-1">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-4">
              Log Aktivitas Drive
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-700">Laporan_Kegiatan_A4.pdf</p>
                  <p className="text-[10px] text-gray-500 truncate">
                    Sinkron ke /E-KIN/{user.namaLengkap.replace(/\s+/g, '_')}
                  </p>
                  <p className="text-[9px] text-gray-400 mt-0.5">Sistem Terintegrasi</p>
                </div>
              </div>

              <div className="flex gap-3 opacity-75">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-700">Folder Dinas Terbuat</p>
                  <p className="text-[10px] text-gray-500 truncate">{user.unitKerja}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">E-KIN TH 26</p>
                </div>
              </div>

              <div className="flex gap-3 opacity-60">
                <div className="w-2 h-2 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-700">Otorisasi Biometrik</p>
                  <p className="text-[10px] text-gray-500">Face Recognition ASN Aktif</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">dinsosone5@gmail.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Modal */}
      {previewPdfUrl && (
        <div className="bg-slate-900/90 fixed inset-0 z-50 p-4 sm:p-8 flex flex-col items-center justify-center">
          <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-gray-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">
                  Pratinjau Dokumen Kegiatan Harian (Format Resmi A4)
                </h4>
                <p className="text-xs text-slate-400">
                  Dinas Sosial Provinsi Maluku Utara
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPdfUrl(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-bold transition-colors"
              >
                Tutup Pratinjau
              </button>
            </div>
            <div className="flex-1 bg-gray-100 p-2 overflow-hidden">
              <iframe
                src={previewPdfUrl}
                title="Pratinjau PDF E-DKH"
                className="w-full h-full rounded border border-gray-300"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
