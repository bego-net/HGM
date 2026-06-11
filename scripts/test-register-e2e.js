/**
 * Live end-to-end test: simulates exactly what the register form does.
 * Submits all fields + a real PNG file to PocketBase, verifies the record, then cleans up.
 */
const PocketBase = require('pocketbase').default;
// Node.js 22 has built-in FormData, Blob, and fetch globals — no extra imports needed

const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'begobegonet1@gmail.com';
const ADMIN_PASSWORD = 'hgm3001Admin!';

// 1x1 white PNG (minimal valid image)
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg==';

function generateQrToken() {
  const arr = new Uint8Array(3);
  for (let i = 0; i < 3; i++) arr[i] = Math.floor(Math.random() * 256);
  return 'EIDS-2025-' + Buffer.from(arr).toString('hex').toUpperCase();
}

function pass(msg) { console.log('  \x1b[32m[PASS]\x1b[0m ' + msg); }
function fail(msg) { console.log('  \x1b[31m[FAIL]\x1b[0m ' + msg); }
function info(msg) { console.log('  \x1b[36m[INFO]\x1b[0m ' + msg); }

async function runTest() {
  console.log('\n\x1b[1m=== REGISTER FORM END-TO-END TEST ===\x1b[0m\n');

  // ── Auth as superuser (for cleanup/verify) ──────────────────────────────
  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);
  await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
  pass('Superuser authenticated');

  // ── Public submit (no auth — exactly like the form) ─────────────────────
  const pbPublic = new PocketBase(PB_URL);
  pbPublic.autoCancellation(false);

  const qrToken = generateQrToken();
  info(`Generated QR token: ${qrToken}`);

  const formData = new FormData();
  formData.append('firstName', 'Selam');
  formData.append('lastName', 'Haile');
  formData.append('email', 'selam.haile.e2e@test.com');
  formData.append('phone', '+251 911 222 333');
  formData.append('organization', 'Ethiopian Innovation Agency');
  formData.append('notes', 'E2E audit test - automated');
  formData.append('status', 'pending');
  formData.append('qrCode', qrToken);
  formData.append('registeredAt', new Date().toISOString());

  // Attach a real PNG file (simulates paymentFile upload)
  const pngBuffer = Buffer.from(PNG_BASE64, 'base64');
  const pngBlob = new Blob([pngBuffer], { type: 'image/png' });
  formData.append('paymentFile', pngBlob, 'receipt_test.png');

  let record;
  try {
    record = await pbPublic.collection('registrants').create(formData);
    pass('Public CREATE succeeded');
  } catch (err) {
    fail(`Public CREATE failed: ${err.message}`);
    if (err?.data?.data) console.log('    PB validation errors:', JSON.stringify(err.data.data, null, 2));
    process.exit(1);
  }

  // ── Verify all fields stored correctly ───────────────────────────────────
  console.log('\n  \x1b[1mRecord fields stored in PocketBase:\x1b[0m');
  info(`id           = ${record.id}`);
  info(`firstName    = ${record.firstName}`);
  info(`lastName     = ${record.lastName}`);
  info(`email        = ${record.email}`);
  info(`phone        = ${record.phone}`);
  info(`organization = ${record.organization}`);
  info(`notes        = ${record.notes}`);
  info(`status       = ${record.status}`);
  info(`qrCode       = ${record.qrCode}`);
  info(`registeredAt = ${record.registeredAt}`);
  info(`paymentFile  = ${record.paymentFile}`);
  console.log('');

  // Field checks
  record.firstName === 'Selam'                     ? pass('firstName correct')    : fail(`firstName wrong: ${record.firstName}`);
  record.lastName === 'Haile'                      ? pass('lastName correct')     : fail(`lastName wrong: ${record.lastName}`);
  record.email === 'selam.haile.e2e@test.com'      ? pass('email correct')        : fail(`email wrong: ${record.email}`);
  record.organization === 'Ethiopian Innovation Agency' ? pass('organization correct') : fail(`org wrong`);
  record.status === 'pending'                      ? pass('status = pending')     : fail(`status wrong: ${record.status}`);
  record.qrCode === qrToken                        ? pass('qrCode matches token') : fail(`qrCode wrong: ${record.qrCode}`);
  record.qrCode.startsWith('EIDS-2025-')           ? pass('qrCode format EIDS-2025-XXXXXX ✓') : fail(`qrCode bad format`);
  record.paymentFile                               ? pass('paymentFile uploaded and stored') : fail('paymentFile MISSING from record');
  record.registeredAt                              ? pass('registeredAt recorded') : fail('registeredAt missing');

  // ── Verify file URL is reachable ─────────────────────────────────────────
  if (record.paymentFile) {
    const fileUrl = `${PB_URL}/api/files/registrants/${record.id}/${record.paymentFile}`;
    try {
      const res = await fetch(fileUrl);
      res.ok ? pass(`File URL accessible (HTTP ${res.status})`) : fail(`File URL returned HTTP ${res.status}`);
    } catch {
      fail('File URL not reachable');
    }
  }

  // ── Clean up ─────────────────────────────────────────────────────────────
  await pb.collection('registrants').delete(record.id);
  pass('Test record deleted (cleanup OK)');

  console.log('\n\x1b[1m=== ALL TESTS COMPLETE ===\x1b[0m\n');
}

runTest().catch(err => {
  console.error('\nTest crashed:', err.message);
  process.exit(1);
});
