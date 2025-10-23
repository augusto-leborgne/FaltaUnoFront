# Falta Uno - Football Match Platform

A Next.js application for organizing and joining football matches, designed to work with a Spring Boot backend.

<!-- Build: Google Maps API Key Integration -->

## Features

- User authentication and identity verification
- Match creation and management with real-time listings
- Interactive Google Maps integration with clickable location pins
- Advanced filtering system (quick filters + comprehensive advanced filters)
- Player review and rating system
- Mobile-first responsive design with touch-optimized interactions
- Google OAuth login for seamless authentication

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Backend Integration**: Spring Boot REST API with JWT authentication
- **Maps**: Google Maps Embed API with interactive pins
- **State Management**: React hooks with API integration
- **Authentication**: Google OAuth
  

## Google Maps Setup

1. ✅ **API Key Configured**: The Google Maps API key is already set up
2. Make sure both "Maps JavaScript API" and "Places API" are enabled in Google Cloud Console
3. For production, restrict the API key to your domain for security
4. **Note**: The `NEXT_PUBLIC_` prefix is required for Google Maps to work in the browser - this is the official, secure implementation pattern

## Google OAuth Setup

### 1. Google Cloud Console Configuration
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable "Google+ API" and "OAuth2 API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:8080/login/oauth2/code/google` (development)
   - `https://yourdomain.com/login/oauth2/code/google` (production)
7. Copy Client ID and Client Secret to your environment variables

### 2. Spring Boot OAuth Configuration
Add to your `application.yml`:

\`\`\`yaml
spring:
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID}
            client-secret: ${GOOGLE_CLIENT_SECRET}
            scope:
              - email
              - profile
        provider:
          google:
            authorization-uri: https://accounts.google.com/o/oauth2/auth
            token-uri: https://oauth2.googleapis.com/token
            user-info-uri: https://www.googleapis.com/oauth2/v2/userinfo
\`\`\`

### 3. Frontend OAuth Flow
The frontend already includes Google OAuth buttons that redirect to:
- `${NEXT_PUBLIC_API_URL}/oauth2/authorization/google`

Your Spring Boot backend should handle the OAuth flow and redirect back to the frontend with authentication tokens.

## Spring Boot Backend Requirements

The frontend expects these API endpoints with proper CORS configuration:

### Authentication Endpoints
- `POST /api/auth/login` - User login with email/password
- `POST /api/auth/register` - User registration with identity verification
- `POST /api/auth/verify-identity` - Identity verification via cedula
- `GET /oauth2/authorization/google` - Google OAuth login redirect
- `GET /login/oauth2/code/google` - Google OAuth callback (handled by Spring Security)

### User Management
- `GET /api/users/profile` - Get authenticated user profile
- `PUT /api/users/profile` - Update user profile and preferences

### Match Management
- `GET /api/matches` - Get matches with filtering (type, level, date, location)
- `GET /api/matches/{id}` - Get specific match details
- `POST /api/matches` - Create new match (requires authentication)
- `POST /api/matches/{id}/join` - Join a match
- `POST /api/matches/{id}/leave` - Leave a match
- `GET /api/matches/user` - Get user's created and joined matches

### Review System
- `POST /api/reviews` - Submit player review after match
- `GET /api/reviews/pending` - Get matches pending review

## Data Models

Key TypeScript interfaces matching Spring Boot entities:

\`\`\`typescript
interface Match {
  id: string
  type: "FUTBOL_5" | "FUTBOL_7" | "FUTBOL_8" | "FUTBOL_9" | "FUTBOL_11"
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
  date: string
  time: string
  location: {
    name: string
    address: string
    latitude: number
    longitude: number
  }
  price: number
  maxPlayers: number
  currentPlayers: number
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "FINISHED"
  captain: { id: string, name: string, rating: number }
  players: User[]
}
\`\`\`

## Key Features Implementation

### Interactive Map
- Compressed map view with fictional representation
- Expandable full-screen Google Maps with real location pins
- Clickable pins that navigate to individual match pages
- No text or numbers on pins - clean green pin design

### Advanced Filtering
- Quick filters: Popular options in single line (Hoy, Fútbol 5, Cerca)
- Advanced filters: Comprehensive options by category (match type, level, date, gender, price, time, location)
- Real-time filtering with Spring Boot API integration

### Match Ordering
- Matches sorted by date proximity and location relevance
- Prioritizes upcoming matches and nearby locations

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (copy `.env.example` to `.env.local`)
4. Configure Google Maps API key
5. Configure Google OAuth Client ID and Client Secret
6. Start development server: `npm run dev`
7. Ensure Spring Boot backend is running on port 8080

## Deployment

Ready for deployment on Vercel with automatic Spring Boot backend integration via configured API URL.

## Free Deployment Options

### Frontend (Netlify - Recommended for Organizations)
1. Connect your GitHub organization repository to Netlify
2. Build settings: `npm run build`, publish directory: `.next`
3. Add environment variables in Netlify dashboard
4. Automatic deployments on every push

### Backend (Render Free Tier)
1. Connect your Spring Boot repository to Render
2. Build command: `./mvnw clean package`
3. Start command: `java -jar target/falta-uno-backend.jar`
4. Add database and other environment variables

### Database (Supabase Free Tier)
- 500MB storage, 2GB bandwidth/month
- Built-in authentication and real-time features
- Perfect for MVP and small-scale applications
