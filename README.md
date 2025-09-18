# Falta Uno - Football Match Platform

A Next.js application for organizing and joining football matches, designed to work with a Spring Boot backend.

## Features

- User authentication and identity verification
- Match creation and management with real-time listings
- Interactive Google Maps integration with clickable location pins
- Advanced filtering system (quick filters + comprehensive advanced filters)
- Player review and rating system
- Mobile-first responsive design with touch-optimized interactions

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Backend Integration**: Spring Boot REST API with JWT authentication
- **Maps**: Google Maps Embed API with interactive pins
- **State Management**: React hooks with API integration

## Environment Variables

Create a `.env.local` file with:

\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
\`\`\`

## Google Maps Setup

1. Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the "Maps Embed API" for your project
3. Restrict the API key to your domain for security
4. Add the key to your environment variables

## Spring Boot Backend Requirements

The frontend expects these API endpoints with proper CORS configuration:

### Authentication Endpoints
- `POST /api/auth/login` - User login with email/password
- `POST /api/auth/register` - User registration with identity verification
- `POST /api/auth/verify-identity` - Identity verification via cedula

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
5. Start development server: `npm run dev`
6. Ensure Spring Boot backend is running on port 8080

## Deployment

Ready for deployment on Vercel with automatic Spring Boot backend integration via configured API URL.
