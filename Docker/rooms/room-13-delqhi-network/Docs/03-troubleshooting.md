# Room 13: Delqhi Network - Troubleshooting

## Common Issues

### API Won't Start
```bash
docker compose logs room-13-delqhi-api
docker compose exec room-13-delqhi-api env | grep DATABASE
```

### Database Connection Failed
```bash
docker exec room-03-postgres-master pg_isready -U sin_admin
```

### Frontend 500 Errors
Check API is accessible:
```bash
curl http://localhost:8130/health
```

### Search Not Working
Check Meilisearch health:
```bash
curl http://localhost:7700/health
```

## Reference Tickets

- Infrastructure issues: /Users/jeremy/dev/sin-code/troubleshooting/
- Project issues: ./troubleshooting/
