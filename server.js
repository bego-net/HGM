const express = require('express');
const cors = require('cors');
const multer = require('multer');
const PocketBase = require('pocketbase');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';

// Middlewares
app.use(cors());
app.use(express.json());

// Set up Multer in-memory storage for file uploads (max 3MB limit is enforced here and at the DB layer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 } // 3MB limit
});

/**
 * Creates a request-scoped PocketBase client.
 * This is crucial in Node.js backend environments to prevent auth state pollution 
 * across concurrent requests.
 */
function getPbClient(req) {
  const pb = new PocketBase(POCKETBASE_URL);
  
  // Set the token if provided in the Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    pb.authStore.save(token, null);
  }
  
  return pb;
}

/**
 * Middleware to check if the incoming request has a valid Admin session.
 */
async function requireAdmin(req, res, next) {
  try {
    const pb = getPbClient(req);
    
    if (!pb.authStore.isValid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
    }

    // Verify token validity by calling pocketbase auth refresh
    const authRecord = await pb.collection('admins').authRefresh();
    if (authRecord.record.collectionName !== 'admins') {
      return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }

    // Attach pb client and admin details to request
    req.pb = pb;
    req.admin = authRecord.record;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Failed to authenticate admin.', details: err.message });
  }
}

// ==========================================
// 1. PUBLIC REGISTRATION ENDPOINT
// ==========================================
app.post('/api/register', upload.single('paymentFile'), async (req, res) => {
  const pb = new PocketBase(POCKETBASE_URL); // Public action

  try {
    const { firstName, lastName, email, phone, organization, notes } = req.body;

    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({ error: 'firstName, lastName, email, and phone are required.' });
    }

    // Generate ticket credentials
    const qrCodeToken = uuidv4();
    const nowISO = new Date().toISOString();

    // Build Form Data to handle potential file uploads
    const formData = new FormData();
    formData.append('firstName', firstName);
    formData.append('lastName', lastName);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('organization', organization || '');
    formData.append('notes', notes || '');
    formData.append('status', 'pending'); // Defaults to pending approval
    formData.append('registeredAt', nowISO);
    formData.append('qrCode', qrCodeToken);

    // If file is supplied, append it
    if (req.file) {
      const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
      formData.append('paymentFile', blob, req.file.originalname);
    }

    // Call PocketBase API
    const registrant = await pb.collection('registrants').create(formData);

    res.status(201).json({
      message: 'Registration submitted successfully!',
      registrant: {
        id: registrant.id,
        firstName: registrant.firstName,
        lastName: registrant.lastName,
        email: registrant.email,
        qrCode: registrant.qrCode,
        status: registrant.status,
        registeredAt: registrant.registeredAt
      }
    });

  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ 
      error: 'Registration failed.', 
      details: err.data?.data ? Object.values(err.data.data).map(e => e.message).join(', ') : err.message 
    });
  }
});

// ==========================================
// 2. ADMIN AUTHENTICATION ENDPOINT
// ==========================================
app.post('/api/admin/login', async (req, res) => {
  const pb = new PocketBase(POCKETBASE_URL);

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Authenticate Admin against the admins auth collection
    const authData = await pb.collection('admins').authWithPassword(email, password);

    res.json({
      message: 'Login successful',
      token: authData.token,
      admin: {
        id: authData.record.id,
        email: authData.record.email,
        name: authData.record.name
      }
    });

  } catch (err) {
    console.error('Admin Login Error:', err);
    res.status(401).json({ error: 'Invalid email or password.' });
  }
});

// ==========================================
// 3. ADMIN CHECKPOINT SCANNING ENDPOINT
// ==========================================
app.post('/api/scan', requireAdmin, async (req, res) => {
  const pb = req.pb;
  const adminEmail = req.admin.email;

  try {
    const { qrCode, checkpoint } = req.body;

    if (!qrCode || !checkpoint) {
      return res.status(400).json({ error: 'qrCode and checkpoint are required.' });
    }

    if (checkpoint !== 'entry' && checkpoint !== 'lunch') {
      return res.status(400).json({ error: "checkpoint must be either 'entry' or 'lunch'." });
    }

    // 1. Fetch registrant matching the qrCode
    let registrant;
    try {
      registrant = await pb.collection('registrants').getFirstListItem(`qrCode="${qrCode}"`);
    } catch (err) {
      return res.status(404).json({ error: 'Attendee ticket/QR code not found.' });
    }

    // 2. Validate attendee registration status
    if (registrant.status !== 'confirmed') {
      return res.status(403).json({
        error: `Cannot scan. Attendee status is currently '${registrant.status}'. Only 'confirmed' status is allowed entry.`,
        attendeeName: `${registrant.firstName} ${registrant.lastName}`
      });
    }

    const nowISO = new Date().toISOString();
    let warning = null;

    // 3. Check for double scan warnings
    if (checkpoint === 'entry' && registrant.scannedEntry) {
      warning = `Ticket duplicate: already scanned for entry at ${new Date(registrant.scannedEntry).toLocaleTimeString()}`;
    } else if (checkpoint === 'lunch' && registrant.scannedLunch) {
      warning = `Ticket duplicate: already claimed lunch at ${new Date(registrant.scannedLunch).toLocaleTimeString()}`;
    }

    // 4. Update the scan timestamp on registrant record
    const updateData = {};
    if (checkpoint === 'entry') {
      updateData.scannedEntry = nowISO;
    } else {
      updateData.scannedLunch = nowISO;
    }
    const updatedRegistrant = await pb.collection('registrants').update(registrant.id, updateData);

    // 5. Create a record in scanLogs
    const logData = {
      registrantId: registrant.id,
      checkpoint: checkpoint,
      scannedAt: nowISO,
      scannedBy: adminEmail
    };
    await pb.collection('scanLogs').create(logData);

    res.json({
      message: warning ? 'Scan logged (with warnings)' : 'Scan logged successfully',
      warning: warning,
      success: true,
      attendee: {
        id: updatedRegistrant.id,
        name: `${updatedRegistrant.firstName} ${updatedRegistrant.lastName}`,
        organization: updatedRegistrant.organization,
        status: updatedRegistrant.status,
        scannedEntry: updatedRegistrant.scannedEntry,
        scannedLunch: updatedRegistrant.scannedLunch
      }
    });

  } catch (err) {
    console.error('Scan Error:', err);
    res.status(500).json({ error: 'Failed to process ticket scan.', details: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`EIDS 2025 Backend server running at http://127.0.0.1:${PORT}`);
  console.log(`Connected to PocketBase at: ${POCKETBASE_URL}`);
});
