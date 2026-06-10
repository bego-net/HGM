# EIDS 2025 Backend (Ethiopia Innovation & Development Summit)

This project contains the backend database configuration and Node.js REST API wrapper for the EIDS 2025 registration and ticket check-in system. 

It is designed to handle **3,000+ attendees** using a fast, single-binary database backend (PocketBase) wrapped in an Express server.

---

## Workspace Structure
- `pb_schema.json`: The database collections, schemas, and rule configurations.
- `server.js`: The Express API server wrapping PocketBase JS SDK for client registrations and admin check-in scanning.
- `package.json`: NPM package configuration.
- `.env.example`: Template for environment variables.

---

## 1. Installing & Configuring PocketBase on Linux

PocketBase runs as a self-contained single binary, which makes hosting on Linux extremely fast and efficient.

### Step 1: Download & Unzip PocketBase
SSH into your Linux server and execute the following:

```bash
# Update server packages
sudo apt update && sudo apt upgrade -y

# Create a dedicated directory for pocketbase
mkdir -p /var/www/pocketbase
cd /var/www/pocketbase

# Download the latest PocketBase release (v0.22.x or latest)
# Adjust the download link version if a newer one is available
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.14/pocketbase_0.22.14_linux_amd64.zip

# Install unzip if not present
sudo apt install unzip -y

# Extract the archive
unzip pocketbase_0.22.14_linux_amd64.zip
rm pocketbase_0.22.14_linux_amd64.zip
```

### Step 2: Configure Systemd Service (For Background Persistence)
To ensure PocketBase runs 24/7, boots on server restart, and auto-restarts on crashes, configure a systemd service.

1. Create a service file:
   ```bash
   sudo nano /etc/systemd/system/pocketbase.service
   ```

2. Paste the following configuration:
   ```ini
   [Unit]
   Description=PocketBase Service for EIDS 2025
   After=network.target

   [Service]
   Type=simple
   User=root
   Group=root
   WorkingDirectory=/var/www/pocketbase
   ExecStart=/var/www/pocketbase/pocketbase serve --http="127.0.0.1:8090"
   Restart=always
   RestartSec=5
   StandardOutput=syslog
   StandardError=syslog
   SyslogIdentifier=pocketbase

   [Install]
   WantedBy=multi-user.target
   ```

3. Enable and start the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable pocketbase.service
   sudo systemctl start pocketbase.service
   ```

4. Verify it is running:
   ```bash
   sudo systemctl status pocketbase.service
   ```

---

## 2. Secure SSL Configuration (Reverse Proxy)

It is highly recommended to front PocketBase with a reverse proxy like **Caddy** (highly recommended for auto-SSL) or **Nginx**.

### Option A: Using Caddy (Recommended)
Caddy automatically provisions and renews Let's Encrypt SSL certificates.

1. Install Caddy:
   ```bash
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update
   sudo apt install caddy -y
   ```

2. Configure Caddy:
   ```bash
   sudo nano /etc/caddy/Caddyfile
   ```

3. Set up reverse proxy routing:
   ```caddy
   pb.eids2025.org {
       reverse_proxy 127.0.0.1:8090
   }
   ```

4. Restart Caddy:
   ```bash
   sudo systemctl restart caddy
   ```

### Option B: Using Nginx
If using Nginx, configure the block below and use Certbot for SSL.

```nginx
server {
    listen 80;
    server_name pb.eids2025.org;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Support WebSockets (needed for PocketBase real-time subscriptions)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 3. Database Schema Import

Once PocketBase is running, set up the database schema instantly:

1. Open your browser and navigate to the Admin Dashboard (e.g., `https://pb.eids2025.org/_/` or `http://your-server-ip:8090/_/` if running locally/via port forwarding).
2. Create your initial admin account when prompted.
3. Go to **Settings > Export/Import collections**.
4. Click on **Import JSON** or paste the content of `pb_schema.json`.
5. Click **Import** to apply the configuration.

Your 3 collections (`admins`, `registrants`, `scanLogs`) will be created instantly with the correct relationships, validation rules, file limits, and access controls.

---

## Local Start (PocketBase + Next.js)

From the project root you can start PocketBase and the existing Next.js frontend:

1. Download the PocketBase binary into `./pocketbase` (see `pocketbase/README.md`) or run the included helper:

```bash
cd pocketbase
./download_pb.sh    # Linux / macOS
# or
./download_pb.ps1   # Windows PowerShell
```

2. From project root start PocketBase (runs on port 8090):

```bash
npm run pb
```

3. In a separate terminal start the Next.js frontend (inside `frontend`):

```bash
cd frontend
npm install
npm run dev
```

Notes:
- Ensure `frontend/.env.local` contains `NEXT_PUBLIC_PB_URL=http://127.0.0.1:8090`.
- Import `pb_schema.json` via the PocketBase Admin Console after creating an admin account.


## 4. Running the Node.js API Wrapper

### Installation
Make sure you have Node.js (v18+) installed on your environment.

```bash
# Install dependencies
npm install
```

### Configuration
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Update `.env` with your PocketBase URL (e.g., `https://pb.eids2025.org` or `http://localhost:8090`).

### Execution
Run the server in development mode (with auto-reload):
```bash
npm run dev
```

Run in production mode:
```bash
npm start
```

---

## 5. API Usage Reference

### 1. Register Attendee
- **Endpoint**: `POST /api/register`
- **Request Type**: `multipart/form-data`
- **Fields**:
  - `firstName` (Text, Required)
  - `lastName` (Text, Required)
  - `email` (Text, Required)
  - `phone` (Text, Required)
  - `organization` (Text, Optional)
  - `notes` (Text, Optional)
  - `paymentFile` (File, Optional) - Receipt file up to 3MB (Images/PDFs).
- **Response**: Returns a JSON representation of the new registrant, including their unique `qrCode` token and status `pending`.

### 2. Admin Check-In / Ticket Scan
- **Endpoint**: `POST /api/scan`
- **Authentication**: Requires a `Bearer <token>` token in the `Authorization` header (retrieved from the Admin Login endpoint).
- **Request Type**: `application/json`
- **Fields**:
  - `qrCode` (Text, Required) - The token decoded from the attendee's QR code.
  - `checkpoint` (Text, Required) - Value must be `"entry"` or `"lunch"`.
- **Response**: Logs the scan event, flags duplicate scan warnings (if the attendee has scanned before), and updates the registrant's checkpoint timestamp. Returns confirmation details of the attendee.

### 3. Admin Login
- **Endpoint**: `POST /api/admin/login`
- **Request Type**: `application/json`
- **Fields**:
  - `email` (Text, Required)
  - `password` (Text, Required)
- **Response**: Returns the authentication token (`token`) to be used in scan requests, along with the admin account info.
