# Room 13: Delqhi Network - MCP Integration

## Available Tools

| Tool | Description |
|------|-------------|
| create_post | Create a new post |
| get_timeline | Fetch user timeline |
| search_posts | Search posts by query |
| get_user_profile | Get user profile info |
| follow_user | Follow a user |
| unfollow_user | Unfollow a user |
| like_post | Like a post |
| unlike_post | Remove like |
| send_message | Send direct message |
| get_trending | Get trending topics |

## Resources

- `delqhi://user/me` - Current user profile
- `delqhi://trending` - Trending topics

## Integration

```json
{
  "mcpServers": {
    "delqhi": {
      "url": "https://social-mcp.delqhi.com"
    }
  }
}
```

## Authentication

Include bearer token in requests:
```
Authorization: Bearer <jwt-token>
```
