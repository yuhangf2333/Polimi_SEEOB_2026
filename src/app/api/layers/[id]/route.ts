import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { getLayerById } from "@/lib/layer-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: RouteContext<"/api/layers/[id]">,
) {
  const { id } = await context.params;
  const layer = getLayerById(id);

  if (!layer) {
    return Response.json({ error: "Layer not found" }, { status: 404 });
  }

  try {
    const responseAsset = await selectLayerAsset(
      layer.filePath,
      request.headers.get("accept-encoding") ?? "",
    );

    if (!responseAsset) {
      return Response.json(
        { error: "GeoJSON file is not available", id: layer.id },
        { status: 404 },
      );
    }

    const { encoding, fileStat, responsePath } = responseAsset;
    const headers: Record<string, string> = {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "Content-Length": String(fileStat.size),
      "Content-Type": "application/geo+json; charset=utf-8",
      "Vary": "Accept-Encoding",
      "X-Layer-Name": encodeURIComponent(layer.name),
    };

    if (encoding) {
      headers["Content-Encoding"] = encoding;
    }

    const stream = Readable.toWeb(createReadStream(responsePath));

    return new Response(stream as ReadableStream<Uint8Array>, {
      headers,
    });
  } catch {
    return Response.json(
      { error: "GeoJSON file is not available", id: layer.id },
      { status: 404 },
    );
  }
}

async function selectLayerAsset(filePath: string, acceptEncoding: string) {
  const brotliPath = `${filePath}.br`;
  const gzipPath = `${filePath}.gz`;
  const acceptsBrotli = acceptEncoding.includes("br");
  const acceptsGzip = acceptEncoding.includes("gzip");
  const candidates = acceptsBrotli
    ? [
        { responsePath: brotliPath, encoding: "br" },
        { responsePath: gzipPath, encoding: "gzip" },
        { responsePath: filePath, encoding: null },
      ]
    : acceptsGzip
      ? [
          { responsePath: gzipPath, encoding: "gzip" },
          { responsePath: brotliPath, encoding: "br" },
          { responsePath: filePath, encoding: null },
        ]
      : [
          { responsePath: filePath, encoding: null },
          { responsePath: brotliPath, encoding: "br" },
          { responsePath: gzipPath, encoding: "gzip" },
        ];

  for (const candidate of candidates) {
    try {
      return {
        ...candidate,
        fileStat: await stat(candidate.responsePath),
      };
    } catch {
      // Try the next available representation.
    }
  }

  return null;
}
