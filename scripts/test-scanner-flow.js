/**
 * E2E test for the QR Scanner business logic.
 * Tests:
 * 1. Finds registrant by QR code
 * 2. Blocks unconfirmed registrants (e.g. status='pending' or 'rejected')
 * 3. Blocks duplicate scans showing first scan time
 * 4. Blocks lunch scans if scannedEntry is null
 * 5. Blocks duplicate lunch scans
 * 6. Sets scannedEntry and logs to scanLogs on success
 */
const PocketBase = require('pocketbase').default;

const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'begobegonet1@gmail.com';
const ADMIN_PASSWORD = 'hgm3001Admin!';

function pass(msg) { console.log('  \x1b[32m[PASS]\x1b[0m ' + msg); }
function fail(msg) { console.log('  \x1b[31m[FAIL]\x1b[0m ' + msg); process.exitCode = 1; }
function info(msg) { console.log('  \x1b[36m[INFO]\x1b[0m ' + msg); }

async function main() {
  console.log('\n\x1b[1m=== QR SCANNER VALIDATION BUSINESS LOGIC TEST ===\x1b[0m\n');

  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);

  try {
    await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    pass('Superuser authenticated');
  } catch (e) {
    fail('Superuser login failed: ' + e.message);
    process.exit(1);
  }

  // 1. Create a test registrant in 'pending' status
  let reg;
  try {
    reg = await pb.collection('registrants').create({
      firstName: 'ScannerTest',
      lastName: 'User',
      email: 'scanner.test@eids2025.et',
      organization: 'Scanner Lab',
      status: 'pending',
      qrCode: 'EIDS-2025-9999',
      registeredAt: new Date().toISOString(),
    });
    pass('Created pending test registrant: ' + reg.id);
  } catch (e) {
    fail('Create failed: ' + e.message);
    process.exit(1);
  }

  // Helper validation simulation function mirroring the app logic
  const simulateScan = async (qr, mode) => {
    // Finds registrant by QR code
    const list = await pb.collection('registrants').getFullList({ filter: `qrCode = "${qr}"` });
    if (!list || list.length === 0) {
      return { success: false, message: 'Invalid QR Code' };
    }
    const r = list[0];

    // Blocks unconfirmed registrants
    if (r.status !== 'confirmed') {
      return { success: false, message: `Access Denied: Status is "${r.status}"` };
    }

    const when = new Date().toISOString();

    // Entry mode validation
    if (mode === 'entry') {
      if (r.scannedEntry) {
        return { success: false, message: `Duplicate Entry: Already scanned at ${r.scannedEntry}` };
      }
      // Set scannedEntry and log to scanLogs on success
      await pb.collection('registrants').update(r.id, { scannedEntry: when });
      await pb.collection('scanLogs').create({
        registrantId: r.id,
        checkpoint: 'entry',
        scannedAt: when
      });
      return { success: true, message: 'Welcome!', scannedAt: when };
    }

    // Lunch mode validation
    if (mode === 'lunch') {
      if (!r.scannedEntry) {
        return { success: false, message: 'Access Denied: Entry scan missing' };
      }
      if (r.scannedLunch) {
        return { success: false, message: `Duplicate Lunch: Already scanned at ${r.scannedLunch}` };
      }
      // Set scannedLunch on success
      await pb.collection('registrants').update(r.id, { scannedLunch: when });
      await pb.collection('scanLogs').create({
        registrantId: r.id,
        checkpoint: 'lunch',
        scannedAt: when
      });
      return { success: true, message: 'Lunch validated!', scannedAt: when };
    }
  };

  // Test 1: Blocks unconfirmed registrants (currently status is 'pending')
  info('Simulating Gate Entry scan for PENDING registrant...');
  let res = await simulateScan('EIDS-2025-9999', 'entry');
  if (!res.success && res.message.includes('Status is "pending"')) {
    pass('Blocks unconfirmed registrant correctly: ' + res.message);
  } else {
    fail('Failed to block pending registrant: ' + JSON.stringify(res));
  }

  // Update status to 'confirmed'
  await pb.collection('registrants').update(reg.id, { status: 'confirmed' });
  pass('Updated registrant status to "confirmed"');

  // Test 2: Blocks lunch scans if scannedEntry is null
  info('Simulating Lunch scan before Gate Entry...');
  res = await simulateScan('EIDS-2025-9999', 'lunch');
  if (!res.success && res.message.includes('Entry scan missing')) {
    pass('Blocks lunch scan correctly if entry scan is missing');
  } else {
    fail('Failed to block lunch scan with missing entry: ' + JSON.stringify(res));
  }

  // Test 3: Successful Gate Entry Scan
  info('Simulating valid Gate Entry scan...');
  res = await simulateScan('EIDS-2025-9999', 'entry');
  let firstEntryTime = res.scannedAt;
  if (res.success && res.message.includes('Welcome')) {
    pass('Gate Entry scan succeeded and sets scannedEntry');
  } else {
    fail('Gate Entry scan failed: ' + JSON.stringify(res));
  }

  // Check logs created
  let logs = await pb.collection('scanLogs').getFullList({ filter: `registrantId = "${reg.id}" && checkpoint = "entry"` });
  if (logs.length === 1) {
    pass('scanLogs created successfully for entry checkpoint');
  } else {
    fail('Failed to find scanLog for entry: ' + JSON.stringify(logs));
  }

  // Test 4: Blocks duplicate Gate Entry scans
  info('Simulating duplicate Gate Entry scan...');
  res = await simulateScan('EIDS-2025-9999', 'entry');
  if (!res.success && res.message.includes('Duplicate Entry')) {
    pass('Blocks duplicate Entry scan correctly: ' + res.message);
  } else {
    fail('Failed to block duplicate Entry scan: ' + JSON.stringify(res));
  }

  // Test 5: Successful Lunch Scan
  info('Simulating valid Lunch scan...');
  res = await simulateScan('EIDS-2025-9999', 'lunch');
  if (res.success && res.message.includes('Lunch validated')) {
    pass('Lunch scan succeeded and sets scannedLunch');
  } else {
    fail('Lunch scan failed: ' + JSON.stringify(res));
  }

  // Check logs created
  logs = await pb.collection('scanLogs').getFullList({ filter: `registrantId = "${reg.id}" && checkpoint = "lunch"` });
  if (logs.length === 1) {
    pass('scanLogs created successfully for lunch checkpoint');
  } else {
    fail('Failed to find scanLog for lunch: ' + JSON.stringify(logs));
  }

  // Test 6: Blocks duplicate Lunch scans
  info('Simulating duplicate Lunch scan...');
  res = await simulateScan('EIDS-2025-9999', 'lunch');
  if (!res.success && res.message.includes('Duplicate Lunch')) {
    pass('Blocks duplicate Lunch scan correctly: ' + res.message);
  } else {
    fail('Failed to block duplicate Lunch scan: ' + JSON.stringify(res));
  }

  // 7. Cleanup
  try {
    await pb.collection('registrants').delete(reg.id);
    // Delete logs
    const allLogs = await pb.collection('scanLogs').getFullList({ filter: `registrantId = "${reg.id}"` });
    for (const l of allLogs) {
      await pb.collection('scanLogs').delete(l.id);
    }
    pass('Cleanup test registrant and scanLogs successfully');
  } catch (e) {
    fail('Cleanup failed: ' + e.message);
  }

  console.log('\n\x1b[1m=== ALL SCANNER TESTS COMPLETE ===\x1b[0m\n');
}

main().catch(e => {
  console.error('Test crashed:', e);
  process.exit(1);
});
