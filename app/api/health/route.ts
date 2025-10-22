// Simple health check endpoint for Docker/Cloud Run
export async function GET() {
  return new Response(
    JSON.stringify({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'faltauno-frontend'
    }),
    { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
}
