export interface ASNUser {
  id: string;
  namaLengkap: string;
  nip: string;
  pangkatGol?: string;
  instansi: string;
  unitKerja: string;
  bidangBagian: string;
  password?: string;
  faceDescriptor?: number[]; // Feature vector / biometric snapshot
  faceSnapshot?: string; // Data URL of face photo
  email?: string;
  createdAt: string;
}

export interface ActivityImageItem {
  id: string;
  title: string; // e.g. "Image 1", "Image 2", "Image 3"
  dataUrl: string;
  caption?: string;
  timestamp?: string;
}

export interface DailyReport {
  id: string;
  asnId: string;
  asnName: string;
  nip: string;
  pangkatGol: string;
  jabatan: string;
  instansi: string;
  unitKerja: string;
  bidangBagian: string;
  hari: string;
  tanggalAngka: number;
  bulanHuruf: string;
  tahun: number;
  dateKey: string; // YYYY-MM-DD
  kegiatanDeskripsi?: string;
  images: ActivityImageItem[];
  status: 'draft' | 'finalized';
  pdfUrl?: string;
  pdfDriveId?: string;
  pdfDriveViewLink?: string;
  pdfDriveDownloadLink?: string;
  driveFolderPath?: string;
  driveFolderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstansiStructure {
  id: string;
  name: string;
  units: {
    name: string;
    subUnits?: string[];
  }[];
}
