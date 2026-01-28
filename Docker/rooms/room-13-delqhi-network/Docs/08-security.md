# Room 13: Delqhi Network - Security

## Authentication

- JWT tokens with 24h expiry
- Bcrypt password hashing (cost factor 12)
- Refresh token rotation

## API Security

- CORS restricted to frontend domain
- Rate limiting via Redis
- Input validation with Zod schemas

## Database Security

- Parameterized queries (no SQL injection)
- Row-level security for user data
- Soft deletes preserve audit trail

## Network Security

- Internal communication only via Docker network
- Cloudflare Tunnel for public access
- No exposed database ports

## Content Security

- XSS prevention via output encoding
- CSRF protection with SameSite cookies
- Content moderation system with reports
