# Delqhi MCP Server

Model Context Protocol (MCP) server for Delqhi social platform integration.

## Features

- **Create Posts** - Publish content with visibility controls
- **Timeline Management** - Fetch and paginate home timeline
- **Search** - Search posts by content/keywords
- **User Profiles** - Retrieve user information and stats
- **Social Actions** - Follow/unfollow users, like posts
- **Messaging** - Send direct messages
- **Discovery** - Get trending topics and notifications
- **Resources** - Access current user profile and trending topics via resource URIs

## Setup

```bash
npm install
npm run build
npm start
```

## Development

```bash
npm run dev  # Watch mode with tsx
```

## Configuration

Create `.env` from `.env.example`:

```
API_BASE_URL=http://room-13-delqhi-api:3000
API_TOKEN=your-api-token-here
```

## Docker

```bash
docker build -t delqhi-mcp .
docker run -e API_TOKEN=xxx delqhi-mcp
```

## Tools

All tools communicate via tRPC protocol with the Delqhi API backend:

- `create_post` - Create new post
- `get_timeline` - Fetch home timeline with pagination
- `search_posts` - Search posts by query
- `get_user_profile` - Get user profile by username
- `follow_user` - Follow a user
- `unfollow_user` - Unfollow a user
- `like_post` - Like a post
- `send_message` - Send direct message
- `get_trending` - Get trending hashtags
- `get_notifications` - Get user notifications

## Resources

- `delqhi://user/me` - Current user profile (JSON)
- `delqhi://trending` - Trending topics (JSON)

## Architecture

- **Transport:** Stdio (standard input/output)
- **Serialization:** JSON-RPC 2.0
- **API Client:** node-fetch with Authorization header
- **Error Handling:** Comprehensive try-catch with user-friendly messages

## Integration

Register in OpenCode config:

```json
{
  "mcp": {
    "sin_delqhi": {
      "command": "node /path/to/dist/index.js"
    }
  }
}
```

Then use tools via MCP in any agent or application.
