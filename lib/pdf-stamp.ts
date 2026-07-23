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

export async function applyStamp(
  pdfPath: string,
  stampType: 'visa' | 'approved',
  approverName?: string,
  timestamp?: Date
): Promise<Buffer> {
  const config = STAMP_CONFIGS[stampType];
  console.log(`Applying ${stampType} stamp to ${pdfPath}`);
  if (approverName) console.log(`Approver: ${approverName}`);
  if (timestamp) console.log(`Timestamp: ${timestamp.toISOString()}`);
  console.log(`Config:`, config);
  return Buffer.from('');
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
