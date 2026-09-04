import { getAccessToken } from './auth';

export interface DriveAssetFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
}

const LOGO_STORAGE_KEY = 'edkh_custom_logo_malut';

/**
 * Searches Google Drive for folder named "ASSET" or "Asset" or "assets"
 * and locates image files inside it (such as logo malut, lambang maluku utara, etc.)
 */
export async function findDriveAssetFolderAndLogos(): Promise<{
  folderId?: string;
  folderName?: string;
  files: DriveAssetFile[];
}> {
  const token = await getAccessToken();
  if (!token) {
    return { files: [] };
  }

  try {
    // 1. Search for folder "ASSET" or "Asset" or "Assets"
    const folderQuery = `(name = 'ASSET' or name = 'Asset' or name = 'assets' or name = 'Assets') and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const folderRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(folderQuery)}&fields=files(id,name)&pageSize=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    let targetFolderId: string | undefined;
    let targetFolderName: string | undefined;

    if (folderRes.ok) {
      const folderData = await folderRes.json();
      if (folderData.files && folderData.files.length > 0) {
        targetFolderId = folderData.files[0].id;
        targetFolderName = folderData.files[0].name;
      }
    }

    // 2. Query images inside the asset folder or images named logo/malut in Drive
    let fileQuery = `mimeType contains 'image/' and trashed = false`;
    if (targetFolderId) {
      fileQuery += ` and '${targetFolderId}' in parents`;
    } else {
      // If no asset folder exists yet, search for logo/malut images directly in Drive
      fileQuery += ` and (name contains 'logo' or name contains 'Logo' or name contains 'malut' or name contains 'Malut' or name contains 'dinsos' or name contains 'lambang')`;
    }

    const filesRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(fileQuery)}&fields=files(id,name,mimeType,thumbnailLink,webViewLink,webContentLink)&pageSize=20`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!filesRes.ok) {
      return { folderId: targetFolderId, folderName: targetFolderName, files: [] };
    }

    const filesData = await filesRes.json();
    return {
      folderId: targetFolderId,
      folderName: targetFolderName,
      files: filesData.files || [],
    };
  } catch (err) {
    console.warn('Error fetching logo from Drive asset folder:', err);
    return { files: [] };
  }
}

/**
 * Downloads the binary image content of a Drive file using the access token
 * and converts it to a base64 data URL so it can be safely rendered across
 * <img> and in jsPDF documents.
 */
export async function fetchDriveImageAsDataUrl(fileId: string): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('Token Google Drive belum tersedia.');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal mengunduh gambar logo dari Google Drive: ${err}`);
  }

  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Persist in localStorage so it persists across views and reloads
      localStorage.setItem(LOGO_STORAGE_KEY, dataUrl);
      resolve(dataUrl);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Retrieves the cached logo data URL from localStorage if already downloaded
 */
export function getSavedLogoDataUrl(): string | null {
  return localStorage.getItem(LOGO_STORAGE_KEY);
}

/**
 * Saves or updates custom logo data URL
 */
export function saveLogoDataUrl(dataUrl: string | null): void {
  if (dataUrl) {
    localStorage.setItem(LOGO_STORAGE_KEY, dataUrl);
  } else {
    localStorage.removeItem(LOGO_STORAGE_KEY);
  }
}
