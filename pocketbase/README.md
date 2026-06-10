PocketBase download & run helpers

- `download_pb.sh` — shell script to download the latest Linux/macOS PocketBase zip into this folder and extract the `pocketbase` binary.
- `download_pb.ps1` — PowerShell script to download PocketBase on Windows and extract `pocketbase.exe`.

Usage:

1. Run the appropriate script for your OS in the `pocketbase/` folder to download the single-binary PocketBase.

Linux/macOS:
```bash
cd pocketbase
./download_pb.sh
```

Windows (PowerShell as Admin):
```powershell
cd pocketbase
.\download_pb.ps1
```

After the binary is in `pocketbase/` you can start PocketBase from the project root with:

```bash
npm run pb
```

This runs the helper `scripts/run-pb.js` which locates the binary in `./pocketbase` and launches it with `serve --dir ./pocketbase --http 8090`.

Once PocketBase is running, import `pb_schema.json` via the Admin Console (Settings → Import) or use the Admin UI to create collections.
