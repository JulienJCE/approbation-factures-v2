export interface StampConfig {
  type: 'visa' | 'approved';
  color: { r: number; g: number; b: number };
  text: string;
  fontSize: number;
  rotation: number;
  opacity: number;
  border: boolean;
}

const STAMP_CONFIGS: Record<string, StampConfig> = {
  visa: {
    type: 'visa',
    color: { r: 30, g: 144, b: 255 },
    text: 'VISA',
    fontSize: 72,
    rotation: -45,
    opacity: 0.25,
    border: true,
  },
  approved: {
    type: 'approved',
    color: { r: 197, g: 80, b: 79 },
    text: 'APPROUVÉ POUR PAIEMENT',
    fontSize: 32,
    rotation: -30,
    opacity: 0.35,
    border: false,
  },
};

import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

export async function applyStamp(
  pdfBytes: Uint8Array | ArrayBuffer,
  stampType: 'visa' | 'approved',
  approverName?: string,
  timestamp?: Date,
  offsetY: number = 0
): Promise<Uint8Array> {
  const config = STAMP_CONFIGS[stampType];
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const smallFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  const lines = config.text.split('\n');
  const color = rgb(config.color.r / 255, config.color.g / 255, config.color.b / 255);

  // Tampon uniquement sur la première page
  const firstPage = pages[0];
  if (firstPage) {
    const page = firstPage;
    const { width, height } = page.getSize();
    const centerX = width / 2;
    const centerY = height / 2 + offsetY;

    // pdf-lib pivote autour du point (x, y) fourni (coin/ancre), pas du centre.
    // Pour centrer un élément pivoté sur (cx, cy), on recule l'ancre de la
    // demi-taille locale, projetée par la rotation.
    const rad = (config.rotation * Math.PI) / 180;
    const cosT = Math.cos(rad);
    const sinT = Math.sin(rad);
    const anchorFor = (cx: number, cy: number, halfW: number, halfH: number) => ({
      x: cx - halfW * cosT + halfH * sinT,
      y: cy - halfW * sinT - halfH * cosT,
    });
    // Décale un point de (du, dv) dans le repère local pivoté
    const localShift = (du: number, dv: number) => ({
      dx: du * cosT - dv * sinT,
      dy: du * sinT + dv * cosT,
    });

    const line = config.text;
    const textWidth = font.widthOfTextAtSize(line, config.fontSize);

    // Cadre allongé proportionnel au texte (si configuré)
    if (config.border) {
      const bw = textWidth + 120;
      const bh = config.fontSize + 30;
      const a = anchorFor(centerX, centerY, bw / 2, bh / 2);
      page.drawRectangle({
        x: a.x,
        y: a.y,
        width: bw,
        height: bh,
        borderColor: color,
        borderWidth: 3,
        borderOpacity: config.opacity,
        rotate: degrees(config.rotation),
      });
    }

    // Texte principal centré (ancre = baseline gauche → demi-hauteur ≈ 0.35 × taille)
    {
      const a = anchorFor(centerX, centerY, textWidth / 2, config.fontSize * 0.35);
      page.drawText(line, {
        x: a.x,
        y: a.y,
        size: config.fontSize,
        font,
        color,
        opacity: config.opacity,
        rotate: degrees(config.rotation),
      });
    }

    // Détails (approbateur + date) — sous le texte principal, même inclinaison
    if (stampType === 'approved' && approverName && timestamp) {
      const detailText = `${approverName} · ${timestamp.toLocaleDateString('fr-CA')}`;
      const detailWidth = smallFont.widthOfTextAtSize(detailText, 12);
      const shift = localShift(0, -(config.fontSize * 0.35 + 20));
      const a = anchorFor(centerX + shift.dx, centerY + shift.dy, detailWidth / 2, 12 * 0.35);
      page.drawText(detailText, {
        x: a.x,
        y: a.y,
        size: 12,
        font: smallFont,
        color,
        opacity: Math.min(config.opacity + 0.2, 1),
        rotate: degrees(config.rotation),
      });
    }
  }

  return await pdfDoc.save();
}

export function getStampsToApply(
  type: 'invoice' | 'visa',
  volet: 1 | 2,
  status: 'pending' | 'approved' | 'rejected'
): ('visa' | 'approved')[] {
  const stamps: ('visa' | 'approved')[] = [];

  if (volet === 2 && type === 'visa') {
    stamps.push('visa');
  }

  if (status === 'approved') {
    stamps.push('approved');
  }

  return stamps;
}

export function generateStampSVG(
  stampType: 'visa' | 'approved',
  approverName?: string,
  timestamp?: Date
): string {
  const config = STAMP_CONFIGS[stampType];
  const width = 600;
  const height = 600;

  let additionalText = '';
  if (stampType === 'approved' && approverName && timestamp) {
    additionalText = `
      <text x="300" y="250" text-anchor="middle" font-size="16" fill="rgba(${config.color.r}, ${config.color.g}, ${config.color.b}, 0.8)">
        Approuvé par: ${approverName}
      </text>
      <text x="300" y="275" text-anchor="middle" font-size="14" fill="rgba(${config.color.r}, ${config.color.g}, ${config.color.b}, 0.7)">
        ${timestamp.toLocaleDateString('fr-CA')} ${timestamp.toLocaleTimeString('fr-CA')}
      </text>
    `;
  }

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .stamp-text {
            font-family: Arial, sans-serif;
            font-weight: bold;
            text-anchor: middle;
            opacity: ${config.opacity};
          }
          .stamp-border {
            fill: none;
            stroke: rgba(${config.color.r}, ${config.color.g}, ${config.color.b}, ${config.opacity});
            stroke-width: 3;
          }
        </style>
      </defs>
      
      <g transform="translate(${width / 2}, ${height / 2}) rotate(${config.rotation})">
        ${config.border ? `<circle cx="0" cy="0" r="120" class="stamp-border" />` : ''}
        
        <text x="0" y="0" class="stamp-text" font-size="${config.fontSize}" fill="rgba(${config.color.r}, ${config.color.g}, ${config.color.b}, ${config.opacity})">
          ${config.text}
        </text>
        
        ${additionalText}
      </g>
    </svg>
  `;

  return svg;
}
