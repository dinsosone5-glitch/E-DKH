import { jsPDF } from 'jspdf';
import { DailyReport } from '../types';
import { getSavedLogoDataUrl } from './driveAssetService';

/**
 * Compresses an image dataUrl to a lightweight JPEG DataURL
 * with high quality but optimized file size.
 */
export async function compressImage(
  dataUrl: string,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Generates an A4 PDF document matching the reference layout
 * (Kop Dinas Sosial Maluku Utara, Header data ASN, 4-grid 1:1 image boxes per page)
 */
export async function generateReportPdf(report: DailyReport): Promise<Blob> {
  // A4 standard in mm: 210 x 297 mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;

  const totalImages = report.images.length;
  // 4 images per page in a 2x2 grid matching reference
  const imagesPerPage = 4;
  const totalPages = Math.max(1, Math.ceil(totalImages / imagesPerPage));

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      doc.addPage();
    }

    // Top Green decorative accent banner
    doc.setFillColor(21, 128, 61); // Green #15803d
    doc.rect(0, 0, pageWidth, 8, 'F');
    doc.setFillColor(234, 179, 8); // Gold trim #eab308
    doc.rect(0, 8, pageWidth, 1.5, 'F');

    // Render Custom Logo from Drive ASSET folder if available
    const savedLogo = getSavedLogoDataUrl();
    if (savedLogo) {
      try {
        doc.addImage(savedLogo, 'PNG', marginX, 12, 18, 22, undefined, 'FAST');
      } catch (e) {
        try {
          doc.addImage(savedLogo, 'JPEG', marginX, 12, 18, 22, undefined, 'FAST');
        } catch (err) {
          console.warn('Could not render logo image to PDF', err);
        }
      }
    }

    // Header KOP (shown on each page for official legal format)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text('PEMERINTAH PROVINSI MALUKU UTARA', marginX + 22, 16);

    doc.setFontSize(18);
    doc.setTextColor(20, 83, 45); // Deep green
    doc.text('DINAS SOSIAL', marginX + 22, 23);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text('Jl. Lintas Halmahera Gosale Puncak No. 1, Oba Utara, Kota Tidore Kepulauan', marginX + 22, 28);
    doc.text('Email: dinsos.prov.malukuutara@gmail.com / dinsosone5@gmail.com', marginX + 22, 32);

    // KOP Separator line
    doc.setDrawColor(21, 128, 61);
    doc.setLineWidth(0.8);
    doc.line(marginX, 35, pageWidth - marginX, 35);
    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.2);
    doc.line(marginX, 36, pageWidth - marginX, 36);

    // Metadata Block (Ref: Nama, NIP, Pangkat/Gol, Jabatan, Dokumentasi Kegiatan Harian, Bulan)
    let currentY = 43;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('DOKUMENTASI KEGIATAN HARIAN', marginX, currentY);

    currentY += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    // Metadata Left Column
    const col1 = marginX;
    const colColon = marginX + 32;
    const colVal = marginX + 35;

    doc.text('Hari / Tanggal', col1, currentY);
    doc.text(':', colColon, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${report.hari}, ${report.tanggalAngka} ${report.bulanHuruf} ${report.tahun}`, colVal, currentY);

    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.text('Nama Lengkap', col1, currentY);
    doc.text(':', colColon, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(report.asnName || '-', colVal, currentY);

    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.text('NIP', col1, currentY);
    doc.text(':', colColon, currentY);
    doc.text(report.nip || '-', colVal, currentY);

    currentY += 5;
    doc.text('Pangkat / Gol', col1, currentY);
    doc.text(':', colColon, currentY);
    doc.text(report.pangkatGol || '-', colVal, currentY);

    currentY += 5;
    doc.text('Jabatan / Bidang', col1, currentY);
    doc.text(':', colColon, currentY);
    doc.text(`${report.bidangBagian || report.unitKerja || '-'}`, colVal, currentY);

    currentY += 5;
    doc.text('Instansi / UPTD', col1, currentY);
    doc.text(':', colColon, currentY);
    doc.text(`${report.instansi} - ${report.unitKerja}`, colVal, currentY);

    currentY += 7;
    doc.setDrawColor(203, 213, 225);
    doc.line(marginX, currentY, pageWidth - marginX, currentY);

    currentY += 6;

    // 2x2 Grid of 1:1 image boxes (matching reference PDF and image upload template)
    // Usable width: pageWidth - 2*marginX = 210 - 28 = 182mm
    // 2 columns: each box ~86mm width and 86mm height (1:1 aspect ratio)
    const boxSize = 86;
    const gap = 10;
    const startX = marginX;
    const gridStartY = currentY;

    const pageImages = report.images.slice(page * imagesPerPage, (page + 1) * imagesPerPage);

    for (let i = 0; i < 4; i++) {
      const colIndex = i % 2;
      const rowIndex = Math.floor(i / 2);
      const boxX = startX + colIndex * (boxSize + gap);
      const boxY = gridStartY + rowIndex * (boxSize + 14);

      // Outer border box 1:1 with double line like official reference
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.6);
      doc.rect(boxX, boxY, boxSize, boxSize);
      doc.setLineWidth(0.2);
      doc.rect(boxX + 0.8, boxY + 0.8, boxSize - 1.6, boxSize - 1.6);

      const imgItem = pageImages[i];
      const imgIndexNumber = page * imagesPerPage + i + 1;

      if (imgItem && imgItem.dataUrl) {
        try {
          // Add image inside box
          doc.addImage(
            imgItem.dataUrl,
            'JPEG',
            boxX + 1.5,
            boxY + 1.5,
            boxSize - 3,
            boxSize - 3,
            undefined,
            'FAST'
          );
        } catch (e) {
          console.error("Error inserting image into PDF", e);
          doc.setFontSize(8);
          doc.text(`[Gagal memuat gambar ${imgIndexNumber}]`, boxX + 10, boxY + boxSize / 2);
        }
      } else {
        // Placeholder text if slot empty (e.g. "Image 1", "Image 2")
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        doc.text(`Image (${imgIndexNumber})`, boxX + boxSize / 2, boxY + boxSize / 2, {
          align: 'center',
        });
      }

      // Caption / Label underneath each box
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      const label = imgItem?.caption ? `Image ${imgIndexNumber}: ${imgItem.caption}` : `Image (${imgIndexNumber})`;
      doc.text(label, boxX + boxSize / 2, boxY + boxSize + 4.5, { align: 'center' });
    }

    // Page footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `E-DKH Dinas Sosial Prov. Maluku Utara | Bukti Dukung ${report.bulanHuruf} ${report.tahun} | Halaman ${page + 1} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}
