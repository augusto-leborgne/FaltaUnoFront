import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const center = searchParams.get("center") || "-34.9011,-56.1645"
  const zoom = searchParams.get("zoom") || "12"

  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: "Google Maps API key not configured" }, { status: 500 })
  }

  const embedUrl = `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${center}&zoom=${zoom}`

  return NextResponse.json({ embedUrl })
}
