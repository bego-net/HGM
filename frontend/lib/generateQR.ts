import QRCode from 'qrcode';
import { pb } from '@/lib/pocketbase';

/**
 * Generate a base64 PNG QR code for a registrant and save it to PocketBase.
 * Accepts either a numeric id or a PocketBase record id string.
 * Returns the Base64 data URL (PNG).
 */
export async function generateQR(registrantId: number | string): Promise<string> {
  // Format token as EIDS-2025-XXXX where XXXX is zero-padded when a number is provided
  let token: string;
  if (typeof registrantId === 'number') {
    token = `EIDS-2025-${String(registrantId).padStart(4, '0')}`;
  } else {
    // if a string id is provided, use last 4 chars for human id fallback
    const suffix = registrantId.slice(-4).toUpperCase();
    token = `EIDS-2025-${suffix}`;
  }

  const dataUrl = await QRCode.toDataURL(token, { type: 'image/png', margin: 1, width: 250 });

  try {
    // Try to update a registrant record whose id matches registrantId (if string)
    if (typeof registrantId === 'string') {
      await pb.collection('registrants').update(registrantId, { qrCode: token });
    } else {
      // numeric id: attempt to find a registrant by their qrCode matching token (if exists), else skip update
      const list = await pb.collection('registrants').getFullList({ filter: `qrCode = "${token}"`, perPage: 1 });
      if (list && list.length > 0) {
        await pb.collection('registrants').update(list[0].id, { qrCode: token });
      }
    }
  } catch (err) {
    // ignore update errors here; caller may have different auth context
    console.error('generateQR: failed to save qrCode to PocketBase:', err);
  }

  return dataUrl;
}

export default generateQR;
