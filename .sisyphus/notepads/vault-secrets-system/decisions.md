# Vault Secrets Management - Decisions

## Date: 2026-01-28

### Architecture Decisions

1. **KV v2 Engine Mount Path: `sin-solver/`**
   - **Decision:** Use dedicated mount path instead of default `secret/`
   - **Rationale:** Namespace isolation, clearer path structure
   - **Trade-off:** Requires explicit mount enable vs. using default

2. **API Wrapper Approach: FastAPI**
   - **Decision:** Create a dedicated FastAPI service instead of using Vault directly
   - **Rationale:** 
     - Simplified REST interface for all services
     - Built-in sync endpoints
     - Language-agnostic (any service can call REST)
     - Abstracts Vault complexity
   - **Trade-off:** Additional container overhead, but worth it for ease of use

3. **Dev Mode for Vault**
   - **Decision:** Run Vault in dev mode with auto-unseal
   - **Rationale:** 
     - Development/staging environment
     - Simplified operations
     - No manual unseal required
   - **Trade-off:** Not production-ready, documented in README

4. **Sync Strategy: Push-Based**
   - **Decision:** Push secrets to Vercel/n8n on demand (not continuous)
   - **Rationale:**
     - Secrets change infrequently
     - Explicit sync is safer
     - Easier to audit
   - **Alternative considered:** Vault Agent for continuous sync

5. **Secret Path Structure**
   - **Decision:** Flat hierarchy under `sin-solver/`
   ```
   sin-solver/
   ├── postgres
   ├── redis
   ├── n8n
   ├── opencode
   ├── vercel
   ├── github
   └── codeserver
   ```
   - **Rationale:** Simple, easy to understand, matches service names
   - **Alternative considered:** Nested paths like `sin-solver/databases/postgres`

### Security Decisions

1. **Root Token in .env**
   - **Decision:** Store VAULT_TOKEN in .env file
   - **Rationale:** Dev environment, token needed for API wrapper
   - **Production note:** Should use AppRole auth instead

2. **No TLS in Internal Network**
   - **Decision:** HTTP for internal Docker network communication
   - **Rationale:** All services on same network, TLS overhead not needed
   - **Production note:** Enable TLS for production deployment

3. **API Wrapper No Auth**
   - **Decision:** API wrapper doesn't require additional auth
   - **Rationale:** Only accessible within Docker network
   - **Production note:** Add API key or token auth for production
