<p align="center">
  <img src="doc/image/limen-logo.svg" alt="LIMEN" width="360" />
</p>

<p align="center">
  AI-powered WebGIS for Milan transport poverty analysis.<br />
  Diagnose vulnerable areas, compare accessibility gaps, and rank intervention priorities.
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs" />
  <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="MapLibre" src="https://img.shields.io/badge/MapLibre-GL-396CB2?style=flat-square" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <img alt="GeoJSON" src="https://img.shields.io/badge/GeoJSON-local_data-35C68A?style=flat-square" />
</p>


## Features

- Interactive Milan WebGIS dashboard powered by MapLibre.
- Transport poverty analysis across social vulnerability, public transport deficit, essential services, and Earth Observation context.
- Hotspot score, intervention priority index, data confidence, and typology layers.
- Optional LLM assistant for evidence explanation and report-style interpretation.
- Docker-ready production deployment with local GeoJSON data served through Next.js API routes.

<p align="center">
  <img src="doc/image/readme_pic.png" alt="LIMEN dashboard preview" />
</p>

## AI Assistant

The AI assistant turns selected map data into readable planning guidance. It can explain why a hotspot is critical, summarize dominant drivers, data confidence, suggest validation needs, formula and explain how the score is calculated.

```mermaid
flowchart LR
  A["Question + selected area"] --> B["Dashboard context"]
  B --> C["RAG knowledge"]
  B --> D["Scores + City2Graph evidence"]
  C --> E["Grounded prompt"]
  D --> E
  E --> F["LLM response stream"]

  classDef ui fill:#EAFBF2,stroke:#16A34A,color:#0F172A;
  classDef rag fill:#EEF2FF,stroke:#4F46E5,color:#111827;
  classDef llm fill:#FFF7ED,stroke:#F97316,color:#111827;

  class A,B ui;
  class C,D rag;
  class E,F llm;
```

<p align="center">
  <img src="doc/image/ai-feature-demo.gif" alt="LIMEN AI assistant demo" />
</p>

## Quick Start

```bash
npm install
npm run dev
```

Or start the Docker stack:

```bash
docker compose up --build
```

## Environment

Create a local development env file:

```bash
cp .env.example .env.local
```

Example values:

```env
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY=your-google-maps-embed-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=your-server-side-llm-api-key
LLM_MODEL=gpt-5-mini
LLM_TEMPERATURE=0.2
LLM_MAX_TOKENS=1200
```

For Docker Compose, create `.env` in the project root:

```bash
cp .env.example .env
```
Then fill in the same values and rebuild:

```bash
docker compose up --build
```
Notes:

- Leave the Google Maps key empty if you do not need the embedded basemap.
- Leave `LLM_API_KEY` empty if you do not need the server-backed `Default` AI assistant.
- After changing `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY`, rebuild because `NEXT_PUBLIC_*` values are build-time browser variables.
- After changing only `LLM_*`, restarting the container is enough because those values are runtime server variables.

| Variable | Used for | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` | Google Maps embedded basemap. This value is public and bundled during build. | Optional |
| `LLM_BASE_URL` | Server-side API base URL for the built-in `Default` AI provider. | Optional unless overriding the default endpoint |
| `LLM_API_KEY` | Server-side API key used by the built-in `Default` AI provider. Keep this private. | Required for server-side Default AI |
| `LLM_MODEL` | Server-side model used by the built-in `Default` AI provider. | Optional unless overriding the default model |
| `LLM_TEMPERATURE` | Server-side answer stability for the AI assistant. Lower values keep responses stable. | Optional |
| `LLM_MAX_TOKENS` | Maximum response length from the server-side LLM call. | Optional |

The `LLM_*` values configure the server-backed `Default` AI provider. In the dashboard UI, `Default` is locked and cannot be edited there. Users can still choose another provider in the UI and enter a browser-side base URL, model, and API key for their local session.
## Structure

```text
data/       GIS layers and analysis context
doc/image/  README images
public/     static images and public assets
scripts/    data and standalone build helpers
src/        Next.js app, components, APIs, and utilities
tests/      regression checks
```
