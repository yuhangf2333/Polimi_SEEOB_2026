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
    const requestUrl = new URL(request.url);
    const prefersDisplayAsset = requestUrl.searchParams.get("mode") === "display";
    const baseLayerPath =
      prefersDisplayAsset && layer.displayFilePath
        ? layer.displayFilePath
        : layer.filePath;
    const acceptEncoding = request.headers.get("accept-encoding") ?? "";
    let responseAsset = await selectLayerAsset(
      baseLayerPath,
      acceptEncoding,
    );

    if (!responseAsset && baseLayerPath !== layer.filePath) {
      responseAsset = await selectLayerAsset(layer.filePath, acceptEncoding);
    }

    if (!responseAsset) {
      return Response.json(
        { error: "GeoJSON file is not available", id: layer.id },
        { status: 404 },
      );
    }

    const { encoding, fileStat, responsePath } = responseAsset;
    const headers: Record<string, string> = {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(fileStat.size),
      "Content-Type": "application/geo+json; charset=utf-8",
      "Vary": "Accept-Encoding",
      "X-Content-Type-Options": "nosniff",
      "X-Layer-Name": encodeURIComponent(layer.name),
    };

    if (encoding) {
      headers["Content-Encoding"] = encoding;
    }

    if (prefersDisplayAsset && baseLayerPath !== layer.filePath) {
      headers["X-Layer-Representation"] = "display";
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
  const candidates = [
    ...(acceptsBrotli ? [{ responsePath: brotliPath, encoding: "br" }] : []),
    ...(acceptsGzip ? [{ responsePath: gzipPath, encoding: "gzip" }] : []),
    { responsePath: filePath, encoding: null },
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
