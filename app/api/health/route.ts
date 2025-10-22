// Simple health check endpoint for Docker/Cloud Run
export async function GET() {
  return Response.json(
    { 
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'faltauno-frontend'
    },
    { status: 200 }
  )
}
