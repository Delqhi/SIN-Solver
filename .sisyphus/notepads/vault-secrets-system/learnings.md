# Vault Secrets Management - Learnings

## Date: 2026-01-28

### Successful Approaches

1. **HashiCorp Vault Image Migration**
   - The `vault:latest` image is DEPRECATED
   - Must use `hashicorp/vault:latest` instead
   - Healthcheck should use `wget` instead of `curl` (curl not available in new image)

2. **KV v2 Secrets Engine**
   - Dev mode auto-enables the `secret/` path but NOT custom mounts
   - Must explicitly enable: `vault secrets enable -path=delqhi-platform -version=2 kv`
   - KV v2 API path: `/v1/{mount}/data/{path}` (note: `/data/` required)

3. **FastAPI Vault Client Design**
   - Use `httpx` for async HTTP calls to Vault
   - KV v2 read returns nested structure: `response["data"]["data"]`
   - KV v2 metadata at: `response["data"]["metadata"]`

4. **Vercel Environment Sync**
   - Vercel API v10 is the correct endpoint
   - Create with POST, update with PATCH (need env ID)
   - Use `encrypted` type for sensitive values

### Code Patterns Used

```python
# Async Vault client pattern
async def read_secret(self, path: str) -> Dict[str, Any]:
    url = f"{self.addr}/v1/{self.mount_path}/data/{path}"
    response = await client.get(url, headers=self.headers)
    return response.json()["data"]["data"]
```

```bash
# Vault health check for docker-compose
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8200/v1/sys/health"]
```

### Files Created

- `docker-compose.yml` - Updated with correct image and API wrapper service
- `vault-api-wrapper/main.py` - FastAPI REST wrapper (590+ lines)
- `vault-api-wrapper/Dockerfile` - Python 3.11-slim based
- `vault-api-wrapper/requirements.txt` - FastAPI, httpx, uvicorn
- `vault-to-vercel.sh` - Vercel sync script (200+ lines)
- `vault-to-n8n.sh` - n8n sync script (200+ lines)
- `init-vault.sh` - Vault initialization script (150+ lines)
- `README.md` - Complete documentation (300+ lines)
