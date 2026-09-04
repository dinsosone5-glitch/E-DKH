import React, { useState } from 'react';
import { 
  FileText, Download, Trash2, Edit3, ExternalLink, Calendar, 
  FolderTree, Search, CheckCircle, Eye, Cloud
} from 'lucide-react';
import { ASNUser, DailyReport } from '../types';
import { generateReportPdf } from '../services/pdfGenerator';
import { deleteReport } from '../services/storage';

interface ReportArchiveProps {
  user: ASNUser;
  reports: DailyReport[];
  onRefresh: () => void;
  onEditReport: (report: DailyReport) => void;
}

export const ReportArchive: React.FC<ReportArchiveProps> = ({
  user,
  reports,
  onRefresh,
  onEditReport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBulan, setSelectedBulan] = useState('ALL');
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  const userReports = reports.filter(r => r.asnId === user.id || r.nip === user.nip);

  const filteredReports = userReports.filter((rep) => {
    const matchesSearch = 
      rep.dateKey.includes(searchTerm) ||
      rep.hari.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.bulanHuruf.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBulan = selectedBulan === 'ALL' || rep.bulanHuruf === selectedBulan;
    return matchesSearch && matchesBulan;
  });

  const handleDelete = (reportId: string, dateKey: string) => {
    const confirm = window.confirm(`Apakah Anda yakin ingin menghapus arsip laporan tanggal ${dateKey}?`);
    if (!confirm) return;

    deleteReport(reportId);
    onRefresh();
  };

  const handleDownloadPdf = async (report: DailyReport) => {
    try {
      const blob = await generateReportPdf(report);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `E-DKH_${report.dateKey}_${user.namaLengkap.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      alert("Gagal mengunduh file PDF.");
    }
  };

  const handlePreviewPdf = async (report: DailyReport) => {
    try {
      const blob = await generateReportPdf(report);
      const url = URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
    } catch (e) {
      alert("Gagal membuka pratinjau PDF.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Search Bar */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari tanggal atau hari laporan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:bg-white text-gray-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-gray-500 font-bold uppercase">Bulan:</span>
          <select
            value={selectedBulan}
            onChange={(e) => setSelectedBulan(e.target.value)}
            className="text-xs py-2 px-3 bg-gray-50 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 font-medium text-gray-800"
          >
            <option value="ALL">Semua Bulan</option>
            <option value="Januari">Januari</option>
            <option value="Februari">Februari</option>
            <option value="Maret">Maret</option>
            <option value="April">April</option>
            <option value="Mei">Mei</option>
            <option value="Juni">Juni</option>
            <option value="Juli">Juli</option>
            <option value="Agustus">Agustus</option>
            <option value="September">September</option>
            <option value="Oktober">Oktober</option>
            <option value="November">November</option>
            <option value="Desember">Desember</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200 shadow-sm">
          <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <h4 className="text-base font-bold text-gray-700">Belum Ada Arsip Laporan</h4>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Laporan kegiatan harian yang telah difinalisasi akan otomatis tercatat di sini dan tersimpan di folder Google Drive dinas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((report) => {
            const hasDrive = !!report.pdfDriveViewLink;
            return (
              <div
                key={report.id}
                className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100">
                        {report.tanggalAngka}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">
                          {report.hari}, {report.tanggalAngka} {report.bulanHuruf} {report.tahun}
                        </h4>
                        <span className="text-[11px] text-gray-500 font-mono">
                          {report.images.length} Dokumen Foto Terlampir
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                      Finalized
                    </span>
                  </div>

                  {/* Drive Folder Path information */}
                  <div className="bg-gray-50 p-2.5 rounded border border-gray-200 mb-3 text-[11px] text-gray-600">
                    <div className="flex items-center gap-1.5 text-gray-700 font-bold mb-0.5">
                      <FolderTree className="w-3.5 h-3.5 text-blue-600" />
                      <span>Target Drive:</span>
                    </div>
                    <p className="font-mono text-[10px] text-gray-500 truncate">
                      {report.driveFolderPath || `E-KIN / E-KIN TH 26 / ${user.instansi} / ${user.unitKerja} / ${user.namaLengkap}`}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePreviewPdf(report)}
                      className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors"
                      title="Lihat Pratinjau PDF"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(report)}
                      className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors"
                      title="Unduh PDF Lokal"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {hasDrive && (
                      <a
                        href={report.pdfDriveViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center gap-1 text-xs font-bold"
                        title="Buka di Google Drive"
                      >
                        <Cloud className="w-4 h-4 text-blue-600" />
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEditReport(report)}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(report.id, report.dateKey)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Hapus Laporan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PDF Modal */}
      {previewPdfUrl && (
        <div className="bg-slate-900/90 fixed inset-0 z-50 p-4 sm:p-8 flex flex-col items-center justify-center">
          <div className="bg-white w-full max-w-4xl h-[90vh] rounded-xl overflow-hidden shadow-2xl flex flex-col border border-gray-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h4 className="font-bold text-sm">Dokumen Arsip Laporan Kegiatan Harian</h4>
              <button
                type="button"
                onClick={() => setPreviewPdfUrl(null)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-bold transition-colors"
              >
                Tutup
              </button>
            </div>
            <div className="flex-1 bg-gray-100 p-2 overflow-hidden">
              <iframe
                src={previewPdfUrl}
                title="Arsip PDF"
                className="w-full h-full rounded border border-gray-300"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
