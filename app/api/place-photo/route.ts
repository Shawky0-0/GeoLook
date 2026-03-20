import { NextRequest, NextResponse } from "next/server";

// Proxies Google Street View Static image to avoid CORS issues in canvas
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  if (!lat || !lng || !key) {
    return new NextResponse(null, { status: 400 });
  }

  const svUrl =
    `https://maps.googleapis.com/maps/api/streetview` +
    `?size=1080x1350&location=${lat},${lng}&fov=90&pitch=5&key=${key}`;

  try {
    const res = await fetch(svUrl);
    if (!res.ok) return new NextResponse(null, { status: 502 });

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("Content-Type") ?? "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
