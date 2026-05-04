# Analysis data bundle

This directory contains the small report-context bundle needed by the dashboard
on Vercel:

- `summary.json`: citywide TP-IPT summary and class distributions.
- `tables/ai_hotspot_cards.json`: sanitized top hotspot cards used for report
  context and priority tables.

Large interactive map layers live in `data/geojson/analysis` with precompressed
`.br` and `.gz` files for the `/api/layers/[id]` route. Static report figures
live in `public/analysis/images`.
