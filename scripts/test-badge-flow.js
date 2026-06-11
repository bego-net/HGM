/**
 * End-to-end test for QR badge generation, confirmation API, and email flow.
 */
const PocketBase = require('pocketbase').default;

const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'begobegonet1@gmail.com';
const ADMIN_PASSWORD = 'hgm3001Admin!';

function pass(msg) { console.log('  \x1b[32m[PASS]\x1b[0m ' + msg); }
function fail(msg) { console.log('  \x1b[31m[FAIL]\x1b[0m ' + msg); process.exitCode = 1; }
function info(msg) { console.log('  \x1b[36m[INFO]\x1b[0m ' + msg); }

async function main() {
  console.log('\n\x1b[1m=== QR BADGE & CONFIRMATION FLOW E2E TEST ===\x1b[0m\n');

  // 1. Authenticate with PocketBase
  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);
  try {
    await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    pass('Superuser authenticated');
  } catch (e) {
    fail('Superuser authentication failed: ' + e.message);
    process.exit(1);
  }

  // 2. Create a fresh test registrant with pending status
  let testRecord;
  try {
    testRecord = await pb.collection('registrants').create({
      firstName: 'Abebe',
      lastName: 'Kebede',
      email: 'abebe.kebede.test@eids2025.et',
      organization: 'Ethiopian AI Center',
      status: 'pending',
      registeredAt: new Date().toISOString(),
    });
    pass(`Created pending test registrant: ${testRecord.id} (${testRecord.firstName} ${testRecord.lastName})`);
  } catch (e) {
    fail('Failed to create test registrant: ' + e.message);
    process.exit(1);
  }

  // 3. Trigger confirmation API (simulates the confirm button click)
  info('Calling API: POST /api/confirm-registration...');
  try {
    // Note: Since Next.js dev server is running on port 3001, we fetch from http://localhost:3001/api/confirm-registration
    const res = await fetch('http://localhost:3001/api/confirm-registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrantId: testRecord.id })
    });
    
    const body = await res.json();
    if (res.status === 200 && body.success) {
      pass('API confirm-registration returned success: true');
    } else {
      fail(`API returned status ${res.status} with message: ${body.message}`);
    }
  } catch (e) {
    fail('API fetch failed: ' + e.message);
  }

  // 4. Retrieve updated registrant from PocketBase to verify values
  try {
    const updated = await pb.collection('registrants').getOne(testRecord.id);
    
    // Status check
    if (updated.status === 'confirmed') {
      pass('Registrant status successfully updated to "confirmed"');
    } else {
      fail(`Registrant status expected "confirmed", got: "${updated.status}"`);
    }

    // QR format check: EIDS-2025-XXXX
    info(`Stored qrCode field value: "${updated.qrCode}"`);
    const formatRegex = /^EIDS-2025-\d{4}$/;
    if (formatRegex.test(updated.qrCode)) {
      pass('qrCode field matches exactly "EIDS-2025-XXXX" format (zero-padded 4 digits)');
    } else {
      fail(`qrCode format mismatch! Expected EIDS-2025-XXXX (4 digits), got: "${updated.qrCode}"`);
    }
  } catch (e) {
    fail('Failed to fetch updated registrant: ' + e.message);
  }

  // 5. Cleanup test record
  try {
    await pb.collection('registrants').delete(testRecord.id);
    pass('Test registrant record deleted successfully (cleanup)');
  } catch (e) {
    fail('Cleanup failed: ' + e.message);
  }

  console.log('\n\x1b[1m=== TEST COMPLETE ===\x1b[0m\n');
}

main().catch(e => {
  console.error('Test crashed:', e);
  process.exit(1);
});
