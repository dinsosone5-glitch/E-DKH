import { getAccessToken } from './auth';

export interface DriveFolderInfo {
  id: string;
  name: string;
  webViewLink?: string;
}

export interface UploadResult {
  fileId: string;
  webViewLink: string;
  webContentLink: string;
  folderId: string;
}

/**
 * Ensures a directory hierarchy exists in Google Drive:
 * E-KIN -> E-KIN TH 26 (or dynamic year) -> INSTANSI -> UNIT_KERJA -> [NAMA_ASN] -> BUKTI DUKUNG [BULAN] [TAHUN]
 */
export async function getOrCreateFolder(
  folderName: string,
  parentId?: string
): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error("Google Drive authorization required. Silakan hubungkan Google Drive.");

  // Query if folder already exists in parent
  let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Gagal mencari folder "${folderName}": ${errText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // If not found, create it
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Gagal membuat folder "${folderName}": ${errText}`);
  }

  const createdData = await createRes.json();
  return createdData.id;
}

/**
 * Resolves the full folder tree for user:
 * 1. "E-KIN"
 * 2. "E-KIN TH 26" (or TH + 2 digits of current year)
 * 3. "[INSTANSI]"
 * 4. "[UNIT KERJA]"
 * 5. "[NAMA LENGKAP ASN - NIP]"
 * 6. "BUKTI DUKUNG [BULAN] [TAHUN]"
 */
export async function ensureUserFolderHierarchy(params: {
  instansi: string;
  unitKerja: string;
  asnName: string;
  nip: string;
  bulan: string;
  tahun: number;
}): Promise<{ targetFolderId: string; folderPathDisplay: string }> {
  // 1. Root folder E-KIN
  const rootFolderId = await getOrCreateFolder("E-KIN");

  // 2. Year folder: "E-KIN TH 26" (matches prompt request)
  const yrShort = String(params.tahun).slice(-2);
  const yearFolderName = `E-KIN TH ${yrShort}`;
  const yearFolderId = await getOrCreateFolder(yearFolderName, rootFolderId);

  // 3. Instansi / UPTD
  const instansiFolderId = await getOrCreateFolder(params.instansi, yearFolderId);

  // 4. Unit Kerja
  const unitFolderId = await getOrCreateFolder(params.unitKerja, instansiFolderId);

  // 5. User Name folder (without collision)
  const userFolderName = `${params.asnName} (${params.nip || 'ASN'})`;
  const userFolderId = await getOrCreateFolder(userFolderName, unitFolderId);

  // 6. Subfolder: BUKTI DUKUNG [BULAN] [TAHUN]
  const buktiFolderName = `BUKTI DUKUNG ${params.bulan.toUpperCase()} ${params.tahun}`;
  const buktiFolderId = await getOrCreateFolder(buktiFolderName, userFolderId);

  const folderPathDisplay = `E-KIN / ${yearFolderName} / ${params.instansi} / ${params.unitKerja} / ${userFolderName} / ${buktiFolderName}`;

  return {
    targetFolderId: buktiFolderId,
    folderPathDisplay
  };
}

/**
 * Uploads a PDF Blob to the designated folder.
 * If a file with the same name exists in the folder, it replaces / updates or re-uploads.
 */
export async function uploadPdfToDrive(
  pdfBlob: Blob,
  fileName: string,
  folderId: string
): Promise<UploadResult> {
  const token = await getAccessToken();
  if (!token) throw new Error("Google Drive token tidak tersedia. Hubungkan akun.");

  // Check if file already exists in target folder (e.g. updating same day's report)
  const checkQuery = `name = '${fileName}' and '${folderId}' in parents and trashed = false`;
  const checkRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(checkQuery)}&fields=files(id,webViewLink,webContentLink)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  let existingFileId: string | null = null;
  if (checkRes.ok) {
    const data = await checkRes.json();
    if (data.files && data.files.length > 0) {
      existingFileId = data.files[0].id;
    }
  }

  // Upload or update using multipart upload
  const metadata = {
    name: fileName,
    mimeType: 'application/pdf',
    ...(existingFileId ? {} : { parents: [folderId] }),
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', pdfBlob, fileName);

  const endpoint = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name,webViewLink,webContentLink`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink`;

  const method = existingFileId ? 'PATCH' : 'POST';

  const res = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal mengunggah PDF ke Google Drive: ${errText}`);
  }

  const uploaded = await res.json();

  // Make readable link accessible
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${uploaded.id}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  } catch (e) {
    // Non fatal if domain permissions restrict public share
    console.warn("Could not set anyone permission on file", e);
  }

  return {
    fileId: uploaded.id,
    webViewLink: uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`,
    webContentLink: uploaded.webContentLink || `https://drive.google.com/uc?id=${uploaded.id}&export=download`,
    folderId,
  };
}
