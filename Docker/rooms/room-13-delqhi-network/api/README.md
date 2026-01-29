# Delqhi API

TypeScript/Node.js social networking API built with tRPC, Express, and WebSocket support.

## Features

- **tRPC Router**: Type-safe RPC framework with full TypeScript support
- **Express Server**: Lightweight HTTP server with middleware stack
- **WebSocket Support**: Real-time bidirectional communication
- **PostgreSQL Client**: Connection pooling and query utilities
- **JWT Authentication**: Secure token-based access control
- **Zod Validation**: Runtime schema validation for all inputs
- **Docker Ready**: Production-grade Dockerfile with health checks
- **Strict TypeScript**: Full strict mode compilation

## Tech Stack

- **Framework**: Express 4.18
- **RPC**: tRPC 11.0
- **Database**: PostgreSQL (pg 8.11)
- **Cache**: Redis (redis 4.6)
- **Auth**: JWT + bcryptjs
- **Validation**: Zod 3.22
- **WebSocket**: ws 8.16
- **Language**: TypeScript 5.3

## Project Structure

```
api/
├── src/
│   ├── index.ts          # Main server entry point
│   ├── config.ts         # Configuration management
│   ├── db/
│   │   └── client.ts     # PostgreSQL connection pool
│   ├── auth/
│   │   └── jwt.ts        # JWT token utilities
│   └── trpc/
│       ├── context.ts    # Request context creator
│       └── router.ts     # tRPC procedure definitions
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── Dockerfile            # Container definition
└── .env.example          # Environment variables template
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### tRPC
- `POST /trpc/*` - All tRPC procedures

### WebSocket
- `WS /ws` - Real-time connections

## tRPC Procedures

### Authentication
- `auth.register` - Create new user account
- `auth.login` - Authenticate with email/password
- `auth.refresh` - Refresh access token

### Posts
- `posts.create` - Create new post (protected)
- `posts.timeline` - Get user timeline (protected)
- `posts.get` - Get single post
- `posts.like` - Like a post (protected)
- `posts.unlike` - Remove post like (protected)
- `posts.delete` - Delete post (protected)

### Users
- `users.profile` - Get user profile by username
- `users.me` - Get authenticated user (protected)
- `users.update` - Update user profile (protected)
- `users.follow` - Follow user (protected)
- `users.unfollow` - Unfollow user (protected)
- `users.isFollowing` - Check follow status (protected)
- `users.followers` - List user followers
- `users.following` - List user's following

### Search
- `search.users` - Search users by username/display name
- `search.posts` - Search public posts by content

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Docker

```bash
# Build image
docker build -t room-13-delqhi-api .

# Run container
docker run -p 3000:3000 \
  -e DB_HOST=room-03-archiv-postgres \
  -e DB_USER=sin_admin \
  -e DB_PASSWORD=delqhi-platform-2026 \
  -e JWT_SECRET=your-secret-key \
  room-13-delqhi-api
```

## Environment Variables

See `.env.example` for all required configuration options.

**Critical Variables:**
- `JWT_SECRET` - Must be changed in production
- `DB_*` - Database connection details
- `CORS_ORIGINS` - Allowed frontend origins

## Database Schema

The API requires these tables:
- `users` - User accounts and profiles
- `posts` - User posts/content
- `likes` - Post interactions
- `follows` - User relationships
- `comments` - Post replies (for future use)

## Error Handling

All errors follow tRPC error codes:
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Action not permitted
- `NOT_FOUND` - Resource not found
- `BAD_REQUEST` - Invalid input
- `INTERNAL_SERVER_ERROR` - Server error

## Security

- Passwords hashed with bcryptjs (12 rounds)
- JWT tokens with 15m access / 7d refresh expiry
- CORS configured by environment variable
- Helmet for HTTP security headers
- Input validation with Zod

## Performance

- PostgreSQL connection pooling (max 20 connections)
- Morgan request logging
- Compression via gzip (helmet default)
- WebSocket for real-time features

## Testing

```bash
npm run test
npm run test:watch
npm run test:coverage
```

## Linting

```bash
npm run lint
npm run lint:fix
```

## Deployment Notes

- Run migrations before container startup
- Set strong JWT_SECRET in production
- Configure CORS_ORIGINS for your domain
- Use Redis for session caching (future)
- Monitor database connection pool usage
