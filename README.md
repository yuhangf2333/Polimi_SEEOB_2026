# Milan Map Viewer

Next.js GIS viewer for the Milan TP-IPT layers. The app serves the UI and streams local GeoJSON assets from `data/` through API routes, so production deployment needs a Node.js server rather than a static export.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production Build

```bash
npm run build
npm run start
```

## Docker

Build and run the production image:

```bash
docker build -t milan-map-viewer .
docker run --rm -p 3000:3000 milan-map-viewer
```

Or use Compose:

```bash
docker compose up --build
```

The image uses Next.js standalone output and includes:

- `.next/standalone`
- `.next/static`
- `public/`
- `data/`

If you use the Google Maps embedded basemap, pass the public key at build time because `NEXT_PUBLIC_*` values are bundled by Next.js during `next build`:

PowerShell:

```powershell
$env:NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY="your-key"
docker compose up --build
```

Bash:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY="your-key" docker compose up --build
```

When `data/` changes, rebuild the image so the deployed container has the latest GIS assets.
