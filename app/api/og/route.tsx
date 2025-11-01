import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title') || 'Falta Uno'
    const description = searchParams.get('description') || 'Encuentra tu partido de fútbol'

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#4caf50',
            backgroundImage: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 80px',
            }}
          >
            {/* Logo/Icono */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '40px',
              }}
            >
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '60px',
                }}
              >
                ⚽
              </div>
            </div>

            {/* Título */}
            <div
              style={{
                fontSize: '64px',
                fontWeight: 'bold',
                color: 'white',
                textAlign: 'center',
                marginBottom: '20px',
                textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                maxWidth: '1000px',
              }}
            >
              {title}
            </div>

            {/* Descripción */}
            <div
              style={{
                fontSize: '32px',
                color: 'rgba(255,255,255,0.95)',
                textAlign: 'center',
                maxWidth: '900px',
                textShadow: '0 1px 5px rgba(0,0,0,0.2)',
              }}
            >
              {description}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              display: 'flex',
              alignItems: 'center',
              fontSize: '24px',
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            faltauno.app
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('Error generating OG image:', error)
    return new Response('Failed to generate image', { status: 500 })
  }
}
