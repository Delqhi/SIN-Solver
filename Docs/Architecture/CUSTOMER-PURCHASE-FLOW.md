# 🛒 Customer Purchase Flow Architecture

**Version:** 1.0.0  
**Status:** Design Phase  
**Last Updated:** 2026-01-27  
**License:** Delqhi Proprietary

---

## 📋 Overview

Complete automated flow from customer purchase to live website delivery.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DELQHI CUSTOMER PURCHASE FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. CUSTOMER                                                               │
│      ├── template.delqhi.com/webshop                                       │
│      ├── Browse templates (Next.js, Vue, etc.)                             │
│      └── Purchase template (Stripe/PayPal)                                 │
│           ↓                                                                 │
│   2. DATA COLLECTION                                                        │
│      ├── Business name                                                     │
│      ├── Contact info (email, phone)                                       │
│      ├── Logo upload                                                       │
│      ├── Color scheme selection                                            │
│      ├── Content (about, services, etc.)                                   │
│      └── Domain name                                                       │
│           ↓                                                                 │
│   3. SIN-WEBSITE-WORKER (Zimmer-20)                                        │
│      ├── Clone template from private repo                                  │
│      ├── Customize with customer data                                      │
│      ├── Build project                                                     │
│      └── Deploy to Vercel staging                                          │
│           ↓                                                                 │
│   4. CRASH TEST (SIN-Chrome-DevTools-MCP)                                  │
│      ├── Load test (performance)                                           │
│      ├── Visual regression                                                 │
│      ├── Console error detection                                           │
│      ├── Accessibility check                                               │
│      └── Score: 0-100                                                      │
│           ↓                                                                 │
│   5. QUALITY GATE                                                          │
│      ├── IF score < 100: Coder agent repairs                               │
│      ├── Re-test until 100/100                                             │
│      └── MAX 3 iterations                                                  │
│           ↓                                                                 │
│   6. BLACKBOX PACKAGING                                                    │
│      ├── Obfuscate source code                                             │
│      ├── Compile to production build                                       │
│      ├── Apply Delqhi License watermark                                    │
│      └── Create customer-specific Docker image                             │
│           ↓                                                                 │
│   7. CUSTOMER DNS SETUP                                                    │
│      ├── Customer changes nameservers to Cloudflare                        │
│      ├── System creates cloudflared tunnel                                 │
│      └── Route domain → Docker container                                   │
│           ↓                                                                 │
│   8. DELIVERY                                                              │
│      ├── Send access credentials                                           │
│      ├── Control panel URL                                                 │
│      └── Support contact                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ System Components

### 1. Webshop Frontend (template.delqhi.com)

| Component | Technology |
|-----------|------------|
| **Framework** | Next.js 14 |
| **Styling** | Tailwind CSS |
| **Payment** | Stripe + PayPal |
| **Database** | Supabase |
| **Hosting** | Vercel |

**Key Features:**
- Template gallery with live previews
- Real-time customization preview
- Secure payment processing
- Customer account management

### 2. Order Processing API

**Endpoint:** `POST /api/orders/create`

```json
{
  "template_id": "tmpl_nextjs_business_01",
  "customer": {
    "email": "kunde@example.com",
    "name": "Max Mustermann",
    "phone": "+49 123 456789"
  },
  "customization": {
    "business_name": "Mustermann GmbH",
    "logo_url": "https://storage.../logo.png",
    "primary_color": "#3B82F6",
    "secondary_color": "#1E40AF",
    "content": {
      "about": "Wir sind ein...",
      "services": ["Service 1", "Service 2"],
      "contact": { ... }
    }
  },
  "domain": "mustermann-gmbh.de",
  "payment": {
    "method": "stripe",
    "transaction_id": "pi_..."
  }
}
```

### 3. SIN-Website-Worker (Zimmer-20)

**Location:** `/Users/jeremy/dev/SIN-Solver/services/zimmer-20-sin-website-worker/`

**Workflow:**
```python
async def process_order(order: Order):
    # 1. Clone template
    repo = await clone_template(order.template_id)
    
    # 2. Customize
    await customize_template(repo, order.customization)
    
    # 3. Build
    build_result = await build_project(repo)
    
    # 4. Deploy to staging
    staging_url = await deploy_to_vercel(repo, staging=True)
    
    # 5. Crash test
    test_result = await crash_test(staging_url)
    
    # 6. Quality gate
    if test_result.score < 100:
        await auto_repair(repo, test_result.errors)
        return await process_order(order)  # Retry (max 3x)
    
    # 7. Blackbox packaging
    docker_image = await create_blackbox(repo, order.customer_id)
    
    # 8. DNS setup
    tunnel = await setup_cloudflare_tunnel(order.domain, docker_image)
    
    # 9. Notify customer
    await send_delivery_email(order.customer, tunnel.access_url)
```

### 4. Crash Test System

**Components:**
- Chrome DevTools MCP
- Lighthouse integration
- Console error detection
- Visual regression (Playwright)

**Scoring:**
| Check | Weight | Pass Criteria |
|-------|--------|---------------|
| Performance | 25% | LCP < 2.5s |
| Accessibility | 25% | Score > 90 |
| Best Practices | 20% | Score > 90 |
| SEO | 15% | Score > 90 |
| Console Errors | 15% | 0 errors |

### 5. Blackbox Packaging

**Protection Layers:**
1. **Code Obfuscation** - javascript-obfuscator, terser
2. **License Watermark** - Embedded Delqhi signature
3. **Docker Containerization** - No source code exposure
4. **Runtime Protection** - Environment-locked execution

**Dockerfile Template:**
```dockerfile
# Customer-specific image
FROM node:20-alpine AS production

# Copy ONLY production build (no source)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# License verification
ENV DELQHI_LICENSE_KEY=${CUSTOMER_LICENSE}
ENV DELQHI_CUSTOMER_ID=${CUSTOMER_ID}

# Lock to customer domain
ENV ALLOWED_DOMAINS=${CUSTOMER_DOMAIN}

EXPOSE 3000
CMD ["node", "server.js"]
```

### 6. Cloudflare DNS Setup

**Automation Flow:**
```bash
# 1. Customer adds domain to Cloudflare (manual)
# 2. Customer changes nameservers (manual)
# 3. System detects domain is active
# 4. System creates tunnel

cloudflared tunnel create customer-${CUSTOMER_ID}
cloudflared tunnel route dns customer-${CUSTOMER_ID} ${CUSTOMER_DOMAIN}

# 5. Config file
cat > /etc/cloudflared/customer-${CUSTOMER_ID}.yml << EOF
tunnel: customer-${CUSTOMER_ID}
credentials-file: /etc/cloudflared/customer-${CUSTOMER_ID}.json
ingress:
  - hostname: ${CUSTOMER_DOMAIN}
    service: http://localhost:${CUSTOMER_PORT}
  - service: http_status:404
EOF

# 6. Start tunnel
cloudflared tunnel run customer-${CUSTOMER_ID}
```

---

## 📊 Database Schema (Supabase)

### Orders Table
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  template_id TEXT NOT NULL,
  customization JSONB NOT NULL,
  domain TEXT,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  payment_id TEXT,
  staging_url TEXT,
  production_url TEXT,
  crash_test_score INTEGER,
  docker_image_id TEXT,
  tunnel_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer ON orders(customer_id);
```

### Customers Table
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  license_key TEXT UNIQUE,
  subscription_tier TEXT DEFAULT 'basic',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Deployments Table
```sql
CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  environment TEXT NOT NULL, -- 'staging' | 'production'
  url TEXT NOT NULL,
  docker_image TEXT,
  tunnel_config JSONB,
  status TEXT DEFAULT 'pending',
  health_check_status TEXT,
  last_health_check TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔄 Order Status Flow

```
pending → processing → building → testing → 
  ├── passed → packaging → deploying → delivered
  └── failed → repairing → testing (max 3x)
                └── escalated (manual intervention)
```

| Status | Description | Next Steps |
|--------|-------------|------------|
| `pending` | Order received, awaiting payment | Wait for payment confirmation |
| `paid` | Payment confirmed | Start processing |
| `processing` | Cloning template | Build project |
| `building` | Building project | Deploy to staging |
| `testing` | Running crash tests | Quality gate decision |
| `repairing` | Auto-fixing issues | Re-test |
| `packaging` | Creating blackbox | Deploy to production |
| `deploying` | Setting up DNS/tunnel | Deliver |
| `delivered` | Live and accessible | Customer support |
| `escalated` | Failed after 3 retries | Manual intervention |

---

## 🔐 Security Considerations

### Customer Data
- All data encrypted at rest (Supabase)
- HTTPS everywhere
- No source code exposure
- License verification on startup

### Payment
- Stripe/PayPal webhook verification
- No card data stored locally
- PCI DSS compliance via Stripe

### Deployment
- Customer-isolated Docker containers
- Cloudflare tunnel isolation
- No cross-customer access
- Rate limiting on all APIs

---

## 📋 Implementation Checklist

### Phase 1: Webshop Frontend
- [ ] Template gallery page
- [ ] Template detail page with live preview
- [ ] Customization form (wizard)
- [ ] Stripe payment integration
- [ ] Order confirmation page

### Phase 2: Backend API
- [ ] Order creation endpoint
- [ ] Customer management
- [ ] Webhook handlers (Stripe/PayPal)
- [ ] Order status tracking

### Phase 3: Website Worker
- [ ] Template cloning system
- [ ] Customization engine
- [ ] Build pipeline
- [ ] Vercel deployment automation

### Phase 4: Quality Gate
- [ ] Chrome DevTools MCP integration
- [ ] Lighthouse automation
- [ ] Console error detection
- [ ] Auto-repair system

### Phase 5: Blackbox System
- [ ] Code obfuscation pipeline
- [ ] Docker image builder
- [ ] License embedding
- [ ] Image registry

### Phase 6: DNS Automation
- [ ] Cloudflare API integration
- [ ] Tunnel management
- [ ] Health monitoring
- [ ] Auto-recovery

### Phase 7: Customer Portal
- [ ] Dashboard
- [ ] Analytics
- [ ] Support tickets
- [ ] Billing management

---

## 🎯 Success Metrics

| Metric | Target |
|--------|--------|
| Order → Delivery time | < 1 hour |
| Crash test pass rate | > 95% first try |
| Auto-repair success | > 80% |
| Customer satisfaction | > 4.5/5 |
| Uptime | > 99.9% |

---

## 🔧 API Endpoints (Planned)

### Public API
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List available templates |
| GET | `/api/templates/:id` | Get template details |
| POST | `/api/orders` | Create new order |
| GET | `/api/orders/:id/status` | Get order status |
| POST | `/api/webhooks/stripe` | Stripe webhook |
| POST | `/api/webhooks/paypal` | PayPal webhook |

### Internal API (Worker)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/internal/build` | Trigger build |
| POST | `/internal/deploy` | Trigger deployment |
| POST | `/internal/test` | Run crash tests |
| POST | `/internal/repair` | Auto-repair |
| POST | `/internal/package` | Create blackbox |
| POST | `/internal/tunnel` | Setup DNS tunnel |

---

**Next Steps:**
1. Implement webshop frontend
2. Create order processing API
3. Build Website Worker pipeline
4. Integrate Chrome DevTools for testing
5. Develop blackbox packaging system
6. Automate Cloudflare DNS setup

---

**Room:** Architecture  
**Status:** 📐 Design Complete  
**Last Updated:** 2026-01-27  
**Maintainer:** SIN-Solver Team  
**License:** Delqhi Proprietary
