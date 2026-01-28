# Room 13: Delqhi Network - Configuration

## Environment Variables

### API Service
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://sin_admin:password@room-03-postgres-master:5432/sin_solver
REDIS_URL=redis://room-04-redis-cache:6379/0
JWT_SECRET=<32+ char secret>
API_DOMAIN=social-api.delqhi.com
FRONTEND_URL=https://delqhi.delqhi.com
```

### Frontend Service
```
NEXT_PUBLIC_API_URL=http://room-13-delqhi-api:3000
NEXT_PUBLIC_API_EXTERNAL_URL=https://social-api.delqhi.com
NEXT_PUBLIC_SITE_URL=https://delqhi.delqhi.com
```

### MCP Service
```
API_BASE_URL=http://room-13-delqhi-api:3000
MCP_API_KEY=<api-key>
MEILISEARCH_URL=http://room-13-delqhi-search:7700
```

### Search Service
```
MEILI_MASTER_KEY=<master-key>
MEILI_ENV=production
```

## Network Configuration

Network: haus-netzwerk (172.20.0.0/16)
IP Range: 172.20.0.130-139
