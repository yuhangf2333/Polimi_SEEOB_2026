export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NominatimAddress = Record<string, string | undefined>;

type NominatimResponse = {
  display_name?: string;
  name?: string;
  category?: string;
  type?: string;
  address?: NominatimAddress;
  osm_type?: string;
  osm_id?: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return Response.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const upstreamUrl = new URL("https://nominatim.openstreetmap.org/reverse");
  upstreamUrl.searchParams.set("format", "jsonv2");
  upstreamUrl.searchParams.set("lat", lat.toFixed(6));
  upstreamUrl.searchParams.set("lon", lon.toFixed(6));
  upstreamUrl.searchParams.set("zoom", "18");
  upstreamUrl.searchParams.set("addressdetails", "1");
  upstreamUrl.searchParams.set("accept-language", "en");

  try {
    const response = await fetch(upstreamUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Milan GIS Layer Platform/1.0",
      },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return Response.json(
        { error: "Reverse geocode unavailable" },
        { status: response.status },
      );
    }

    const payload = (await response.json()) as NominatimResponse;

    return Response.json(
      {
        displayName: payload.display_name ?? null,
        name: payload.name ?? null,
        category: payload.category ?? null,
        type: payload.type ?? null,
        address: payload.address ?? null,
        osmType: payload.osm_type ?? null,
        osmId: payload.osm_id ?? null,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "Reverse geocode request failed" },
      { status: 502 },
    );
  }
}
