# Room 13: Delqhi Network - API Reference

## Base URL

- Internal: http://room-13-delqhi-api:3000
- External: https://social-api.delqhi.com

## Authentication

POST /trpc/auth.register - Create account
POST /trpc/auth.login - Get JWT token
POST /trpc/auth.refresh - Refresh token

Headers: `Authorization: Bearer <token>`

## Posts

GET /trpc/posts.timeline - Get home timeline
GET /trpc/posts.byId - Get single post
POST /trpc/posts.create - Create post
POST /trpc/posts.like - Like a post
DELETE /trpc/posts.delete - Delete post

## Users

GET /trpc/users.profile - Get user profile
GET /trpc/users.followers - Get followers
POST /trpc/users.follow - Follow user
POST /trpc/users.unfollow - Unfollow user

## Search

GET /trpc/search.posts - Search posts
GET /trpc/search.users - Search users
GET /trpc/search.hashtags - Search hashtags

## Health

GET /health - Service health check
