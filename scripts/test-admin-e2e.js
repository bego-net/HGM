/**
 * End-to-end test for admin panel functionality.
 * Tests: login, data fetch, confirm/reject/restore, receipt URL, real-time, counts.
 */
const PocketBase = require('pocketbase').default;

const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'begobegonet1@gmail.com';
const ADMIN_PASSWORD = 'hgm3001Admin!';

function pass(msg) { console.log('  \x1b[32m[PASS]\x1b[0m ' + msg); }
function fail(msg) { console.log('  \x1b[31m[FAIL]\x1b[0m ' + msg); process.exitCode = 1; }
function info(msg) { console.log('  \x1b[36m[INFO]\x1b[0m ' + msg); }

async function main() {
  console.log('\n\x1b[1m=== ADMIN PANEL E2E TEST ===\x1b[0m\n');

  // ── 1. Login ─────────────────────────────────────────────────────────────
  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);

  try {
    await pb.collection('admins').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    pass('Admin login via collection("admins").authWithPassword()');
  } catch (e) {
    fail('Admin login FAILED: ' + e.message);
    process.exit(1);
  }

  // Verify session is valid
  pb.authStore.isValid ? pass('authStore.isValid = true') : fail('authStore.isValid = false');

  // ── 2. Auth refresh ──────────────────────────────────────────────────────
  try {
    await pb.collection('admins').authRefresh();
    pass('authRefresh() works');
  } catch (e) {
    fail('authRefresh FAILED: ' + e.message);
  }

  // ── 3. Fetch registrants with sort ────────────────────────────────────────
  let registrants;
  try {
    registrants = await pb.collection('registrants').getFullList({ sort: '-created' });
    pass('getFullList with sort=-created: ' + registrants.length + ' records');
  } catch (e) {
    fail('getFullList FAILED: ' + e.message);
    process.exit(1);
  }

  // ── 4. Create test registrant ─────────────────────────────────────────────
  const pbPublic = new PocketBase(PB_URL);
  pbPublic.autoCancellation(false);
  let testId;
  try {
    const rec = await pbPublic.collection('registrants').create({
      firstName: 'AdminTest',
      lastName: 'User',
      email: 'admintest@e2e.com',
      organization: 'E2E Testing',
      status: 'pending',
      qrCode: 'EIDS-2025-AAAA01',
      registeredAt: new Date().toISOString(),
    });
    testId = rec.id;
    pass('Created test registrant: ' + testId);
  } catch (e) {
    fail('Create test registrant FAILED: ' + e.message);
    process.exit(1);
  }

  // ── 5. Stats counts ──────────────────────────────────────────────────────
  const list = await pb.collection('registrants').getFullList({ sort: '-created' });
  const counts = {
    total: list.length,
    pending: list.filter(r => r.status === 'pending').length,
    confirmed: list.filter(r => r.status === 'confirmed').length,
    rejected: list.filter(r => r.status === 'rejected').length,
  };
  info('Counts: total=' + counts.total + ' pending=' + counts.pending + ' confirmed=' + counts.confirmed + ' rejected=' + counts.rejected);
  counts.pending > 0 ? pass('Pending count > 0 (includes our test record)') : fail('No pending records');

  // ── 6. Confirm action ────────────────────────────────────────────────────
  try {
    await pb.collection('registrants').update(testId, { status: 'confirmed' });
    const updated = await pb.collection('registrants').getOne(testId);
    updated.status === 'confirmed' ? pass('Confirm → status=confirmed') : fail('Status not confirmed: ' + updated.status);
  } catch (e) {
    fail('Confirm FAILED: ' + e.message);
  }

  // ── 7. Reject action ─────────────────────────────────────────────────────
  try {
    await pb.collection('registrants').update(testId, { status: 'rejected' });
    const updated = await pb.collection('registrants').getOne(testId);
    updated.status === 'rejected' ? pass('Reject → status=rejected') : fail('Status not rejected: ' + updated.status);
  } catch (e) {
    fail('Reject FAILED: ' + e.message);
  }

  // ── 8. Restore action ────────────────────────────────────────────────────
  try {
    await pb.collection('registrants').update(testId, { status: 'pending' });
    const updated = await pb.collection('registrants').getOne(testId);
    updated.status === 'pending' ? pass('Restore → status=pending') : fail('Status not pending: ' + updated.status);
  } catch (e) {
    fail('Restore FAILED: ' + e.message);
  }

  // ── 9. File URL generation ────────────────────────────────────────────────
  // Test with a record that has a paymentFile
  const withFile = list.find(r => r.paymentFile);
  if (withFile) {
    const fileName = Array.isArray(withFile.paymentFile) ? withFile.paymentFile[0] : withFile.paymentFile;
    const url = pb.files.getURL(withFile, fileName);
    info('File URL: ' + url);
    try {
      const res = await fetch(url);
      res.ok ? pass('Receipt file accessible (HTTP ' + res.status + ')') : fail('File URL returned ' + res.status);
    } catch (e) {
      fail('File URL fetch error: ' + e.message);
    }
  } else {
    info('No records with paymentFile to test receipt modal URL');
  }

  // ── 10. Real-time subscription (browser-only — skip in Node) ──────────────
  if (typeof globalThis.EventSource !== 'undefined') {
    try {
      const unsub = await pb.collection('registrants').subscribe('*', (e) => {});
      pass('Real-time subscribe() returned unsubscribe function: ' + (typeof unsub));
      unsub();
      pass('Unsubscribe called without error');
    } catch (e) {
      fail('Real-time subscription FAILED: ' + e.message);
    }
  } else {
    info('Skipping real-time test (EventSource not available in Node.js — works in browser)');
  }

  // ── 11. Filter/search logic ───────────────────────────────────────────────
  const q = 'admintest';
  const searchResult = list.filter(r => {
    const name = `${r.firstName || ''} ${r.lastName || ''}`.toLowerCase();
    return name.includes(q) || (r.email || '').toLowerCase().includes(q);
  });
  searchResult.length > 0 ? pass('Search filter finds test record') : fail('Search filter returned 0 results');

  // ── Cleanup ───────────────────────────────────────────────────────────────
  await pb.collection('registrants').delete(testId);
  pass('Test record cleaned up');

  console.log('\n\x1b[1m=== ADMIN PANEL E2E COMPLETE ===\x1b[0m\n');
}

main().catch(e => { console.error('SCRIPT ERROR:', e.message); process.exit(1); });
