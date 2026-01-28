# Delqhi API Specification

## Overview

This document describes the complete tRPC API interface for Delqhi Social Platform.

## Base Information

- **Protocol**: tRPC over HTTP/WebSocket
- **Base URL**: `http://localhost:3000/trpc`
- **Authentication**: Bearer token in `Authorization` header
- **Response Format**: JSON
- **Error Format**: tRPC error codes

## Authentication

### Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Token Structure

```typescript
{
  userId: string;    // UUID
  username: string;  // unique username
  iat: number;      // issued at
  exp: number;      // expiration
}
```

### Token Lifecycle

- **Access Token**: 15 minutes expiry
- **Refresh Token**: 7 days expiry
- **Refresh Endpoint**: `auth.refresh` mutation

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Authenticated but not permitted |
| `NOT_FOUND` | 404 | Resource not found |
| `BAD_REQUEST` | 400 | Invalid input data |
| `CONFLICT` | 409 | Resource already exists |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

## Procedures

### auth Router

#### `auth.register` [POST]

Create new user account.

**Input:**
```typescript
{
  username: string;      // 3-50 chars, alphanumeric + underscore
  email: string;         // valid email address
  password: string;      // min 8 chars
  displayName?: string;  // optional, defaults to username
}
```

**Output:**
```typescript
{
  user: {
    id: string;         // UUID
    username: string;
    email: string;
  };
  accessToken: string;
  refreshToken: string;
}
```

**Errors:**
- `BAD_REQUEST`: Invalid input
- `CONFLICT`: Username or email already exists

---

#### `auth.login` [POST]

Authenticate user with credentials.

**Input:**
```typescript
{
  email: string;
  password: string;
}
```

**Output:**
```typescript
{
  user: {
    id: string;
    username: string;
    email: string;
  };
  accessToken: string;
  refreshToken: string;
}
```

**Errors:**
- `UNAUTHORIZED`: Invalid credentials

---

#### `auth.refresh` [POST]

Get new access token using refresh token.

**Input:**
```typescript
{
  refreshToken: string;
}
```

**Output:**
```typescript
{
  accessToken: string;
}
```

**Errors:**
- `UNAUTHORIZED`: Invalid or expired refresh token

---

### posts Router

#### `posts.create` [POST] - Protected

Create new post.

**Input:**
```typescript
{
  content: string;                    // 1-10000 chars
  mediaUrls?: Array<{
    type: 'image' | 'video' | 'gif';
    url: string;                      // valid URL
    thumbnail?: string;               // optional thumbnail URL
  }>;
  visibility?: 'public' | 'followers' | 'private';  // default: 'public'
  replyToId?: string;                 // UUID of post to reply to
}
```

**Output:**
```typescript
{
  id: string;           // UUID
  createdAt: string;    // ISO 8601 timestamp
}
```

**Errors:**
- `BAD_REQUEST`: Content empty or too long
- `NOT_FOUND`: replyToId doesn't exist

---

#### `posts.timeline` [GET] - Protected

Get authenticated user's timeline (posts from self + following).

**Input:**
```typescript
{
  cursor?: string;      // ISO timestamp for pagination
  limit?: number;       // 1-50, default: 20
}
```

**Output:**
```typescript
{
  items: Array<{
    id: string;
    content: string;
    mediaUrls: unknown[];
    likes_count: number;
    comments_count: number;
    created_at: Date;
    username: string;
    display_name: string;
    avatar_url: string | null;
  }>;
  nextCursor: string | null;  // null if no more items
}
```

---

#### `posts.get` [GET]

Get single post by ID.

**Input:**
```typescript
{
  postId: string;  // UUID
}
```

**Output:**
```typescript
{
  id: string;
  content: string;
  mediaUrls: unknown[];
  likes_count: number;
  comments_count: number;
  created_at: Date;
  username: string;
  display_name: string;
  avatar_url: string | null;
}
```

**Errors:**
- `NOT_FOUND`: Post not found

---

#### `posts.like` [POST] - Protected

Like a post.

**Input:**
```typescript
{
  postId: string;  // UUID
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

---

#### `posts.unlike` [POST] - Protected

Remove like from post.

**Input:**
```typescript
{
  postId: string;  // UUID
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

---

#### `posts.delete` [POST] - Protected

Delete own post (soft delete).

**Input:**
```typescript
{
  postId: string;  // UUID
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

**Errors:**
- `FORBIDDEN`: User doesn't own post
- `NOT_FOUND`: Post not found

---

### users Router

#### `users.profile` [GET]

Get user profile by username.

**Input:**
```typescript
{
  username: string;
}
```

**Output:**
```typescript
{
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  banner_url: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_verified: boolean;
  created_at: Date;
}
```

**Errors:**
- `NOT_FOUND`: User not found

---

#### `users.me` [GET] - Protected

Get authenticated user's profile.

**Output:**
```typescript
{
  id: string;
  username: string;
  email: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  banner_url: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
}
```

---

#### `users.update` [POST] - Protected

Update authenticated user's profile.

**Input:**
```typescript
{
  displayName?: string;
  bio?: string;         // max 500 chars
  avatarUrl?: string;   // valid URL
  bannerUrl?: string;   // valid URL
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

---

#### `users.follow` [POST] - Protected

Follow a user.

**Input:**
```typescript
{
  userId: string;  // UUID
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

**Errors:**
- `BAD_REQUEST`: Attempting to follow self

---

#### `users.unfollow` [POST] - Protected

Unfollow a user.

**Input:**
```typescript
{
  userId: string;  // UUID
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

---

#### `users.isFollowing` [GET] - Protected

Check if authenticated user follows another user.

**Input:**
```typescript
{
  userId: string;  // UUID
}
```

**Output:**
```typescript
{
  isFollowing: boolean;
}
```

---

#### `users.followers` [GET]

List followers of a user.

**Input:**
```typescript
{
  username: string;
  limit?: number;  // 1-50, default: 20
}
```

**Output:**
```typescript
{
  followers: Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  }>;
}
```

---

#### `users.following` [GET]

List users that a user follows.

**Input:**
```typescript
{
  username: string;
  limit?: number;  // 1-50, default: 20
}
```

**Output:**
```typescript
{
  following: Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  }>;
}
```

---

### search Router

#### `search.users` [GET]

Search users by username or display name.

**Input:**
```typescript
{
  query: string;   // 1-100 chars
  limit?: number;  // 1-50, default: 20
}
```

**Output:**
```typescript
{
  users: Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  }>;
}
```

---

#### `search.posts` [GET]

Search public posts by content.

**Input:**
```typescript
{
  query: string;   // 1-100 chars
  limit?: number;  // 1-50, default: 20
}
```

**Output:**
```typescript
{
  posts: Array<{
    id: string;
    content: string;
    username: string;
    created_at: Date;
  }>;
}
```

---

## WebSocket API

### Endpoints

- **Path**: `/ws`
- **Protocol**: WebSocket
- **Port**: 3000

### Message Format

```typescript
{
  type: string;
  payload?: unknown;
  timestamp: number;
}
```

### Example: Subscribe to Updates

```typescript
ws.send(JSON.stringify({
  type: 'subscribe',
  payload: {
    channel: 'posts',
  },
}));
```

### Example: Real-Time Notifications

Received messages:
```typescript
{
  type: 'post:new',
  payload: {
    postId: string;
    authorId: string;
    content: string;
  },
}
```

---

## Rate Limiting (Future)

Currently unlimited. Will implement:
- 100 requests/minute for public endpoints
- 300 requests/minute for authenticated endpoints
- 10 requests/second for WebSocket

---

## Pagination

All list endpoints support cursor-based pagination:

```typescript
{
  items: T[];
  nextCursor: string | null;
}
```

**Usage:**
```typescript
let cursor: string | undefined;
while (true) {
  const response = await trpc.posts.timeline.query({
    cursor,
    limit: 20,
  });
  
  // process response.items
  
  if (!response.nextCursor) break;
  cursor = response.nextCursor;
}
```

---

## Type Definitions

### User

```typescript
interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
```

### Post

```typescript
interface Post {
  id: string;
  userId: string;
  content: string;
  mediaUrls: MediaUrl[];
  visibility: 'public' | 'followers' | 'private';
  likesCount: number;
  commentsCount: number;
  replyToId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface MediaUrl {
  type: 'image' | 'video' | 'gif';
  url: string;
  thumbnail?: string;
}
```

---

## Examples

### Register & Login

```typescript
const client = createTRPCProxyClient<AppRouter>({
  links: [httpBatchLink({ url: 'http://localhost:3000/trpc' })],
});

// Register
const registerResult = await client.auth.register.mutate({
  username: 'alice',
  email: 'alice@example.com',
  password: 'SecurePass123!',
  displayName: 'Alice',
});

const accessToken = registerResult.accessToken;

// Create authenticated client
const authedClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
      headers: () => ({
        authorization: `Bearer ${accessToken}`,
      }),
    }),
  ],
});

// Create post
const post = await authedClient.posts.create.mutate({
  content: 'Hello Delqhi! 🎉',
  visibility: 'public',
});

// Get timeline
const timeline = await authedClient.posts.timeline.query({
  limit: 10,
});

// Follow user
await authedClient.users.follow.mutate({
  userId: 'bob-user-id',
});
```

### Search

```typescript
// Find users
const users = await client.search.users.query({
  query: 'alice',
  limit: 20,
});

// Find posts
const posts = await client.search.posts.query({
  query: 'delqhi',
  limit: 20,
});
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-27 | Initial API specification |

---

## Support

For API questions or issues:
1. Check this specification
2. Review examples in `/Users/jeremy/dev/sin-code/Docker/rooms/room-13-delqhi-network/api/README.md`
3. Check docker logs: `docker logs room-13-delqhi-api`
