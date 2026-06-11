/**
 * Full PocketBase setup script — run this whenever PocketBase starts fresh.
 * Creates all collections, fields, rules, and the admin user.
 */
const PocketBase = require('pocketbase').default;

const PB_URL = 'http://127.0.0.1:8090';
const SUPERUSER_EMAIL = 'begobegonet1@gmail.com';
const SUPERUSER_PASSWORD = 'hgm3001Admin!';

function ok(msg)   { console.log('  \x1b[32m[OK]\x1b[0m   ' + msg); }
function info(msg) { console.log('  \x1b[36m[INFO]\x1b[0m ' + msg); }
function err(msg)  { console.log('  \x1b[31m[ERR]\x1b[0m  ' + msg); }

async function upsertCollection(headers, body) {
  // Try create first, then patch if already exists
  const createRes = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST', headers, body: JSON.stringify(body)
  });
  if (createRes.status === 200 || createRes.status === 201) {
    ok(`Collection '${body.name}' created`);
    return await createRes.json();
  }
  // Already exists — patch it
  const patchRes = await fetch(`${PB_URL}/api/collections/${body.name}`, {
    method: 'PATCH', headers, body: JSON.stringify(body)
  });
  if (patchRes.status === 200) {
    ok(`Collection '${body.name}' updated`);
    return await patchRes.json();
  }
  const j = await patchRes.json();
  err(`Collection '${body.name}' failed: ${JSON.stringify(j.data || j.message)}`);
  return null;
}

async function main() {
  console.log('\n\x1b[1m=== POCKETBASE FULL SETUP ===\x1b[0m\n');

  // ── Auth ──────────────────────────────────────────────────────────────────
  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);
  await pb.collection('_superusers').authWithPassword(SUPERUSER_EMAIL, SUPERUSER_PASSWORD);
  ok('Superuser authenticated');
  const headers = { Authorization: 'Bearer ' + pb.authStore.token, 'Content-Type': 'application/json' };

  const authRule = '@request.auth.id != ""';

  // ── registrants collection ────────────────────────────────────────────────
  await upsertCollection(headers, {
    name: 'registrants',
    type: 'base',
    listRule: authRule,
    viewRule: authRule,
    createRule: '',           // public
    updateRule: authRule,
    deleteRule: authRule,
    fields: [
      { name: 'firstName',    type: 'text',     required: true  },
      { name: 'lastName',     type: 'text',     required: true  },
      { name: 'email',        type: 'email',    required: true  },
      { name: 'phone',        type: 'text',     required: false },
      { name: 'organization', type: 'text',     required: true  },
      { name: 'notes',        type: 'text',     required: false },
      { name: 'status',       type: 'select',   required: false, values: ['pending','confirmed','rejected'], maxSelect: 1 },
      { name: 'paymentFile',  type: 'file',     required: false, mimeTypes: ['image/jpeg','image/png','image/webp','application/pdf'], maxSize: 3145728, maxSelect: 1 },
      { name: 'scannedEntry', type: 'date',     required: false },
      { name: 'scannedLunch', type: 'date',     required: false },
      { name: 'registeredAt', type: 'date',     required: false },
      { name: 'qrCode',       type: 'text',     required: false },
      { name: 'created',      type: 'autodate', required: false, onCreate: true,  onUpdate: false },
      { name: 'updated',      type: 'autodate', required: false, onCreate: true,  onUpdate: true  },
    ]
  });

  // ── scanLogs collection ───────────────────────────────────────────────────
  await upsertCollection(headers, {
    name: 'scanLogs',
    type: 'base',
    listRule: authRule,
    viewRule: authRule,
    createRule: authRule,
    updateRule: authRule,
    deleteRule: authRule,
    fields: [
      { name: 'registrantId', type: 'relation', required: false, collectionId: 'registrants', cascadeDelete: false },
      { name: 'checkpoint',   type: 'text',     required: false },
      { name: 'scannedAt',    type: 'date',     required: false },
      { name: 'scannedBy',    type: 'text',     required: false },
      { name: 'created',      type: 'autodate', required: false, onCreate: true, onUpdate: false },
      { name: 'updated',      type: 'autodate', required: false, onCreate: true, onUpdate: true  },
    ]
  });

  // ── admins auth collection ────────────────────────────────────────────────
  await upsertCollection(headers, {
    name: 'admins',
    type: 'auth',
    listRule: authRule,
    viewRule: authRule,
    createRule: null,
    updateRule: authRule,
    deleteRule: null,
    fields: [
      { name: 'name', type: 'text', required: false },
    ]
  });

  // ── Create admin user ─────────────────────────────────────────────────────
  // Try to get existing, create or update
  let adminCreated = false;
  try {
    const existing = await pb.collection('admins').getFirstListItem(`email = "${SUPERUSER_EMAIL}"`).catch(() => null);
    if (existing) {
      await pb.collection('admins').update(existing.id, {
        password: SUPERUSER_PASSWORD, passwordConfirm: SUPERUSER_PASSWORD, verified: true, name: 'Admin'
      });
      ok('Admin user updated: ' + SUPERUSER_EMAIL);
    } else {
      await pb.collection('admins').create({
        email: SUPERUSER_EMAIL, password: SUPERUSER_PASSWORD, passwordConfirm: SUPERUSER_PASSWORD,
        name: 'Admin', emailVisibility: true, verified: true
      });
      ok('Admin user created: ' + SUPERUSER_EMAIL);
    }
    adminCreated = true;
  } catch (e) {
    err('Admin user setup failed: ' + e.message);
  }

  // ── Verify everything ─────────────────────────────────────────────────────
  console.log('\n\x1b[1m--- Verification ---\x1b[0m');

  // Auth as admin
  const pb2 = new PocketBase(PB_URL);
  pb2.autoCancellation(false);
  try {
    await pb2.collection('admins').authWithPassword(SUPERUSER_EMAIL, SUPERUSER_PASSWORD);
    ok('Admin login works');

    // Fetch registrants
    const list = await pb2.collection('registrants').getFullList({ sort: '-created' });
    ok('Admin can fetch registrants: ' + list.length + ' records');

    // Public create
    const pb3 = new PocketBase(PB_URL);
    pb3.autoCancellation(false);
    const rec = await pb3.collection('registrants').create({
      firstName: 'SetupTest', lastName: 'User', email: 'setup@test.com',
      organization: 'Test Org', status: 'pending',
      qrCode: 'EIDS-2025-SETUP1', registeredAt: new Date().toISOString()
    });
    ok('Public CREATE works (id=' + rec.id + ')');

    // Confirm it
    await pb2.collection('registrants').update(rec.id, { status: 'confirmed' });
    ok('Admin UPDATE works (confirm)');

    // Delete it
    await pb2.collection('registrants').delete(rec.id);
    ok('Admin DELETE works (cleanup)');

  } catch (e) {
    err('Verification failed: ' + e.message);
  }

  console.log('\n\x1b[1m=== SETUP COMPLETE ===\x1b[0m');
  console.log('\nCredentials:');
  console.log('  Admin login: ' + SUPERUSER_EMAIL + ' / ' + SUPERUSER_PASSWORD);
  console.log('  Frontend:    http://localhost:3001/admin/login\n');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
