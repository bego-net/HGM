import QRCode from 'qrcode';
import { pb } from '@/lib/pocketbase';

/**
 * Generate a base64 PNG QR code for a registrant and save it to PocketBase.
 * Accepts either a numeric id or a PocketBase record id string.
 * Returns the Base64 data URL (PNG).
 */
export async function generateQR(registrantId: number | string): Promise<string> {
  let token: string;
  if (typeof registrantId === 'number') {
    token = `EIDS-2025-${String(registrantId).padStart(4, '0')}`;
  } else {
    try {
      const record = await pb.collection('registrants').getOne(registrantId);
      if (record.qrCode && /^EIDS-2025-\d{4}$/.test(record.qrCode)) {
        token = record.qrCode;
      } else {
        const all = await pb.collection('registrants').getFullList({ sort: 'created' });
        const index = all.findIndex(r => r.id === registrantId);
        const num = index !== -1 ? index + 1 : all.length + 1;
        token = `EIDS-2025-${String(num).padStart(4, '0')}`;
      }
    } catch (err) {
      console.warn('generateQR: failed to fetch record, using random 4-digit suffix as fallback', err);
      const randomNum = Math.floor(Math.random() * 9000) + 1000;
      token = `EIDS-2025-${randomNum}`;
    }
  }

  const dataUrl = await QRCode.toDataURL(token, { type: 'image/png', margin: 1, width: 250 });

  try {
    if (typeof registrantId === 'string') {
      await pb.collection('registrants').update(registrantId, { qrCode: token });
    }
  } catch (err) {
    console.error('generateQR: failed to save qrCode to PocketBase:', err);
  }

  return dataUrl;
}

export default generateQR;
