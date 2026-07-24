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
    text: 'APPROUVÉ\nPOUR\nPAIEMENT',
    fontSize: 48,
    rotation: -45,
    opacity: 0.3,
    border: true,
  },
};

import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

export async function applyStamp(
  pdfBytes: Uint8Array | ArrayBuffer,
  stampType: 'visa' | 'approved',
  approverName?: string,
  timestamp?: Date
): Promise<Uint8Array> {
  const config = STAMP_CONFIGS[stampType];
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const smallFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  const lines = config.text.split('\n');
  const color = rgb(config.color.r / 255, config.color.g / 255, config.color.b / 255);

  for (const page of pages) {
    const { width, height } = page.getSize();
    const centerX = width / 2;
    const centerY = height / 2;

    // Bordure (cercle approximé par un carré tourné, simple et fiable)
    if (config.border) {
      page.drawRectangle({
        x: centerX - 130,
        y: centerY - 90,
        width: 260,
        height: 180,
        borderColor: color,
        borderWidth: 3,
        borderOpacity: config.opacity,
        rotate: degrees(config.rotation),
      });
    }

    // Texte principal (multi-lignes)
    lines.forEach((line, i) => {
      const textWidth = font.widthOfTextAtSize(line, config.fontSize);
      page.drawText(line, {
        x: centerX - textWidth / 2,
        y: centerY + (lines.length / 2 - i - 0.5) * (config.fontSize * 0.9),
        size: config.fontSize,
        font,
        color,
        opacity: config.opacity,
        rotate: degrees(config.rotation),
      });
    });

    // Détails (approbateur + date) pour le tampon "approved"
    if (stampType === 'approved' && approverName && timestamp) {
      const detailText = `${approverName} - ${timestamp.toLocaleDateString('fr-CA')} ${timestamp.toLocaleTimeString('fr-CA')}`;
      const detailWidth = smallFont.widthOfTextAtSize(detailText, 10);
      page.drawText(detailText, {
        x: centerX - detailWidth / 2,
        y: centerY - 70,
        size: 10,
        font: smallFont,
        color,
        opacity: config.opacity + 0.2,
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
