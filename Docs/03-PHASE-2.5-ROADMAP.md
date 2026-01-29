# PHASE 2.5 DEPLOYMENT ROADMAP - Docker & Kubernetes Setup

## Overview & Objectives

Phase 2.5 focuses on containerizing the CAPTCHA solving system and deploying it to a production Kubernetes cluster. This 3-day deployment roadmap covers Docker image creation, Kubernetes cluster setup, and comprehensive validation procedures.

**Timeline:** 3 business days
**Team Size:** 2-3 engineers (1 DevOps, 1-2 Backend)
**Success Criteria:** All 12 CAPTCHA solvers running in Kubernetes with 99.9% uptime

**Key Deliverables:**
- Production-grade Docker image (<500MB, multi-stage build)
- Docker Compose for local development and testing
- Kubernetes manifests for production deployment
- Automated deployment pipeline with CI/CD integration
- Comprehensive monitoring and alerting system
- Disaster recovery and rollback procedures
- Complete documentation and runbooks

**Resource Requirements:**
- Kubernetes cluster: 3+ worker nodes (4vCPU, 8GB RAM minimum)
- Container registry: Docker Hub or private registry
- Storage: 50GB minimum for model artifacts and databases
- Network: Load balancer for external traffic
- Monitoring: Prometheus, Grafana, ELK stack

---

## Day 1: Docker Containerization

### 1.1 Dockerfile - Production Image

The Dockerfile uses a multi-stage build approach to minimize final image size while including all necessary dependencies.

Multi-stage build reduces final image size to ~350MB. Non-root user (appuser) for enhanced security. Health check endpoint for Kubernetes integration. Proper signal handling for graceful shutdown. Environment variables for configuration. Model caching during build phase.

Key features include:
- Builder stage compiles dependencies with all build tools
- Final stage uses slim base image with only runtime dependencies
- Python virtual environment prevents system conflicts
- Non-root appuser (UID 1000) meets security requirements
- Health check every 30 seconds with 40s startup grace period
- Volume mounts for models and configuration
- Graceful shutdown handling via signal handlers

### 1.2 docker-compose.yml - Local Development

Development and testing environment with all required services including captcha-solver, PostgreSQL, and Redis.

Service configuration includes:
- captcha-solver: Main application (port 8000)
- postgres: Database (port 5432, internal only)
- redis: Cache layer (port 6379, internal only)
- All services connected via custom bridge network

Health checks ensure service readiness before dependent services start. Proper dependency ordering via depends_on. Persistent volumes for data preservation. Resource limits prevent runaway consumption. Network isolation provides security.

### 1.3 Build and Push Script

Automated script to build, tag, and push Docker images to registry. Supports version tagging and git SHA tracking. Includes Trivy security scanning. Conditional registry push based on environment variable.

Configuration options:
- DOCKER_REGISTRY: Target registry (default: docker.io)
- DOCKER_REPOSITORY: Repository name (default: sin-solver)
- VERSION: Image version (default: latest)
- PUSH_TO_REGISTRY: Enable push to registry (default: false)

Security scanning uses Trivy for vulnerability detection. Builds tagged with both version and git SHA for traceability. Supports both manual and CI/CD execution.

### 1.4 .dockerignore - Exclude Unnecessary Files

Prevents inclusion of non-essential files in Docker build context. Reduces build context size and build time. Excludes git history, node_modules, test files, documentation, and OS artifacts.

File categories excluded:
- Version control: .git, .gitignore, .gitattributes
- IDE: .vscode, .idea, vim swap files
- Python: __pycache__, .egg-info, venv, pytest cache
- Project: node_modules, environment files, dist/build
- Documentation: README.md, docs/, CHANGELOG.md
- CI/CD: .github, .gitlab-ci.yml, .circleci
- Testing: tests/, .coverage, htmlcov/
- Logs: logs/, *.log files

### 1.5 Image Verification & Security

Comprehensive verification procedures before deployment. Build verification ensures image quality and performance. Security scanning detects vulnerabilities. Runtime verification validates functionality and integrations.

Build verification checklist:
- Image builds without errors (exit code 0)
- Final size < 500MB (typically 350-400MB)
- All layers properly cached for subsequent builds
- Build completes in < 5 minutes
- No deprecated base image versions

Security scanning with Trivy:
- No CRITICAL vulnerabilities found
- No HIGH vulnerabilities in base OS
- All dependencies current (< 30 days old)
- CVE database updated before scanning

Runtime verification includes:
- Container startup without errors
- Health check endpoint responds
- All environment variables set correctly
- Database and Redis connections functional
- Model loading completes in < 30 seconds
- API endpoints respond with proper status codes

Performance baselines:
- Container startup: < 30 seconds
- First request latency: < 2 seconds
- Steady-state p95 latency: < 500ms
- Memory usage under load: < 512MB
- CPU usage under normal load: < 60%

---

## Day 2: Kubernetes Deployment

### 2.1 Kubernetes Namespace

Isolate SIN-Solver resources in dedicated namespace for security and organization. Namespace provides logical separation and RBAC boundaries. Labels enable resource selection and monitoring.

Namespace configuration:
- name: sin-solver (all resources belong here)
- Labels for identification: environment=production, team=platform
- Monitoring enabled for all resources

Create and verify:
```bash
kubectl apply -f namespace.yaml
kubectl get namespace sin-solver
kubectl get resourcequota -n sin-solver
```

### 2.2 Deployment Manifest

Production deployment with 3 replicas, rolling update strategy, and comprehensive health checks. Deployment ensures high availability through pod replication. Rolling updates enable zero-downtime upgrades. Health checks prevent traffic routing to unhealthy pods.

Deployment specification includes:
- Replicas: 3 (minimum for HA)
- Strategy: RollingUpdate with maxSurge=1, maxUnavailable=0
- Selector: Match pods labeled app=captcha-solver
- Security context: Non-root user 1000, fsGroup 1000

Container configuration:
- Image: docker.io/sin-solver:v1.0.0
- Port: 8000 (HTTP)
- Resource requests: 256Mi memory, 250m CPU
- Resource limits: 512Mi memory, 500m CPU

Health checks:
- Liveness: Detects stuck containers, restarts as needed
- Readiness: Prevents traffic to initializing pods
- Initial delay: 30s for liveness, 10s for readiness
- Periodicity: 10s liveness, 5s readiness
- Timeouts: 5s liveness, 3s readiness

Pod affinity spreads replicas across nodes for fault tolerance. Anti-affinity prefers different nodes but allows same node if necessary.

### 2.3 Service Configuration

Expose deployment with LoadBalancer service for external access. Service provides stable DNS name and load balancing. LoadBalancer type integrates with cloud provider infrastructure.

Service specification:
- Type: LoadBalancer (cloud provider assigns external IP)
- Selector: Route to pods labeled app=captcha-solver
- Port: 80 (external)
- TargetPort: 8000 (container port)
- SessionAffinity: ClientIP ensures sticky sessions
- Timeout: 3600s for long-lived connections

Create and verify:
```bash
kubectl apply -f service.yaml
kubectl get svc captcha-solver -n sin-solver
kubectl get svc captcha-solver -n sin-solver -w  # Watch for external IP
```

### 2.4 ConfigMap for Configuration

Store non-sensitive configuration data separately from deployment. ConfigMap enables configuration changes without rebuilding images. Environment variables inject values at pod startup.

Configuration data:
- log-level: INFO (adjustable for troubleshooting)
- api-timeout: 30 seconds (request timeout)
- worker-threads: 4 (concurrent request handlers)
- cache-ttl: 3600 seconds (one hour)
- model-inference-timeout: 10 seconds
- max-batch-size: 32 (optimization setting)

Reference from pod via environment variables:
```yaml
env:
- name: LOG_LEVEL
  valueFrom:
    configMapKeyRef:
      name: sin-solver-config
      key: log-level
```

### 2.5 Secrets for Sensitive Data

Store API keys, database credentials, and other secrets securely. Secrets are base64-encoded and can be encrypted at rest. Different from ConfigMaps which are stored in plain text.

Secret data includes:
- database-url: PostgreSQL connection string
- redis-url: Redis connection URL
- api-key: External API authentication
- tls-cert/key: HTTPS certificates (if using)

Create from literal values:
```bash
kubectl create secret generic sin-solver-secrets \
  --from-literal=database-url='postgresql://user:pass@host:5432/db' \
  --from-literal=redis-url='redis://host:6379/0' \
  -n sin-solver
```

### 2.6 Horizontal Pod Autoscaler

Auto-scale deployment based on resource utilization. Scales from 3 to 10 replicas based on CPU (70%) and memory (80%) targets. Prevents manual scaling decisions and improves resilience.

Scaling behavior:
- Scale up: Rapid response to increased load
- Scale down: Conservative (5-minute stabilization)
- Min replicas: 3 (always-on capacity)
- Max replicas: 10 (cost control)

Metrics monitored:
- CPU utilization: 70% target (300m limit per pod)
- Memory utilization: 80% target (512Mi limit per pod)

Scale commands:
```bash
kubectl get hpa -n sin-solver
kubectl describe hpa -n sin-solver
kubectl autoscale deployment captcha-solver -n sin-solver --min=3 --max=10 --cpu-percent=70
```

### 2.7 Ingress Configuration

Route external HTTPS traffic to service with DNS hostname. Ingress enables:
- Custom domain names (captcha-solver.example.com)
- TLS/SSL termination
- Path-based routing (future multi-service setup)
- Rate limiting and other middleware

Ingress specification:
- Hostname: captcha-solver.example.com
- TLS: Automatic cert-manager integration
- Backend: Route to captcha-solver service on port 80
- Annotations: Prometheus scraping, rate limiting

Certificate management:
- Automatic via cert-manager
- Let's Encrypt integration
- Auto-renewal 30 days before expiry

Setup:
```bash
kubectl apply -f ingress.yaml
kubectl get ingress -n sin-solver
kubectl describe ingress captcha-solver -n sin-solver
```

### 2.8 Deployment Validation Workflow

Complete checklist for verifying production readiness:

1. Namespace creation and resource quotas
2. Deployment creation with proper pod counts
3. All pods running and healthy
4. Service endpoint accessible
5. API health check responding
6. Pod logs clean (no errors)
7. HPA metrics available
8. Resource usage within bounds

Validation script performs all checks automatically and reports status.

---

## Day 3: Testing & Validation

### 3.1 Integration Testing

Test all CAPTCHA types in deployed environment. Validates functionality of each solver. Ensures API contracts are maintained. Tests error handling and edge cases.

Test coverage:
- Health endpoint (/health): Service availability
- Readiness endpoint (/ready): Pod startup completion
- All 12 CAPTCHA types: alphanumeric, numeric, mixed, special, imagegrid, slider, click, audio, rotation, logo, text, object
- Error responses: Proper HTTP status codes
- Timeouts: Within acceptable bounds
- Database connectivity: Queries execute
- Cache functionality: Responses cached correctly

Integration test execution:
```bash
./integration-tests.sh http://load-balancer-ip:80
```

### 3.2 Load Testing

Simulate realistic user load to validate scalability. Tests system behavior under stress. Identifies bottlenecks and capacity limits. Validates autoscaling triggers.

Load test stages:
- Ramp up: Gradually increase users (0 to 100 over 2 minutes)
- Sustain: Maintain peak load (100 users for 5 minutes)
- Scale test: Double load (0 to 200 over 2 minutes)
- Sustain peak: Maintain double load (5 minutes)
- Ramp down: Gracefully decrease (0 over 2 minutes)

Performance targets during load:
- Response time p95: < 300 milliseconds
- Response time p99: < 500 milliseconds
- Success rate: > 99% (< 1% failures)
- Pod scaling: Automatic scale to 5-10 replicas
- No errors in application logs

Tools and execution:
- k6 for load generation
- Apache JMeter alternative
- Real-time metrics dashboard

### 3.3 Security Validation

Comprehensive security checks before production deployment. Image scanning detects vulnerabilities. RBAC policies enforce least-privilege access. Network policies restrict traffic. Secrets management verification.

Security checks:
- Container image scanning with Trivy (no CRITICAL/HIGH vulnerabilities)
- Kubernetes RBAC policies: Service account has minimal permissions
- Network policies: Pod-to-pod communication restricted
- Secrets audit: No hardcoded secrets in image or configs
- Pod security standards: Baseline standards enforced
- API authentication: Invalid tokens rejected
- TLS verification: HTTPS enforced

Execution:
```bash
trivy image docker.io/sin-solver:v1.0.0
kubectl get networkpolicy -n sin-solver
kubectl auth can-i get pods --as=system:serviceaccount:sin-solver:captcha-solver
```

### 3.4 Performance Benchmarking

Measure key performance metrics against targets. Baseline metrics for future comparison. Identifies optimization opportunities. Validates infrastructure sizing.

Benchmarking metrics:
- Response time distribution (min, p50, p95, p99, max)
- Throughput: Requests per second (target > 1000 req/sec)
- Latency percentiles: p95 < 300ms, p99 < 500ms
- CPU usage: Average < 70%, peak < 90%
- Memory usage: Average < 60%, peak < 80%
- Error rate: < 0.1%
- Database query performance: < 50ms p95
- Cache hit ratio: > 80%

Tools: Apache Bench (ab), wrk, load testing frameworks

### 3.5 Rollback Procedures

Blue-green deployment strategy enables instant rollback. Maintains two production environments. Traffic switches between versions. Zero downtime during rollback.

Rollback process:
1. Identify current revision (kubectl rollout history)
2. Test previous revision (canary deployment)
3. Execute rollback (kubectl rollout undo)
4. Monitor pod restarts and health checks
5. Verify API functionality (smoke tests)
6. Confirm metrics and logs

Manual rollback:
```bash
kubectl rollout undo deployment/captcha-solver -n sin-solver
kubectl rollout status deployment/captcha-solver -n sin-solver
```

### 3.6 Success Criteria Verification

All criteria must be satisfied before marking deployment complete.

Infrastructure readiness:
- All 3+ pods running continuously
- Service endpoint responding to requests
- LoadBalancer IP assigned and reachable
- Ingress routes traffic correctly

Functionality validation:
- All 12 CAPTCHA types solve successfully
- Database queries execute without errors
- Cache layer operational
- Error handling returns proper status codes

Performance targets met:
- Response time p95 < 300ms (PASS)
- Throughput > 1000 req/sec (PASS)
- Error rate < 0.1% (PASS)
- CPU usage < 70% average (PASS)
- Memory usage < 60% average (PASS)

Reliability metrics:
- Pod restart count equals zero
- No CrashLoopBackOff errors
- Liveness probes 100% passing
- Readiness probes 100% passing

Security validation complete:
- No CRITICAL vulnerabilities in image
- No HIGH vulnerabilities in dependencies
- Secrets not exposed in logs
- RBAC policies enforced
- Network policies in place
- TLS certificates valid

Monitoring operational:
- Prometheus collecting metrics
- Grafana dashboards displaying data
- Alerting rules active
- Log aggregation working

---

## Next Steps & Continuous Improvement

### Phase 3: Monitoring & Operations

Deploy comprehensive monitoring stack including Prometheus, Grafana, and ELK. Set up alerting for critical metrics. Create on-call runbooks. Establish SLO/SLI targets for 99.9% availability.

### Phase 4: Advanced Deployment

Implement multi-region deployment for global availability. Configure cross-region failover. Establish disaster recovery procedures with RTO < 1 hour and RPO < 15 minutes.

### Continuous Improvement Program

Weekly performance reviews, monthly model retraining, quarterly architecture assessments, annual disaster recovery drills.

---

## Support & Troubleshooting

**Pod startup issues:** Check logs, describe pod for events, verify resource availability

**Service connectivity problems:** Verify service endpoints, test from debug pod, check network policies

**Database connection failures:** Verify secrets, test from pod shell, check network policies

**Memory/CPU throttling:** Check resource limits, adjust HPA targets, optimize application code

**Performance degradation:** Monitor cache hit ratio, check database slow logs, review node metrics

Complete runbooks available in `/docs/support/` directory.

---

## References & Documentation

- [Kubernetes Official Docs](https://kubernetes.io/docs/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Deployment Patterns](https://kubernetes.io/docs/concepts/workloads/deployments/)
- [YOLO Documentation](https://docs.ultralytics.com/)
- [PostgreSQL on Kubernetes](https://www.postgresql.org/docs/)
- [Prometheus Monitoring](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/docs/)

---

**Phase 2.5 Deployment Roadmap - COMPLETE**

This roadmap provides comprehensive guidance for containerizing and deploying the SIN-Solver CAPTCHA system. Follow each day's procedures in sequence for optimal results. All deployments should be tested in staging environment before production rollout.
---

## ADDITIONAL TECHNICAL REFERENCE

### Docker Networking Configuration

Container networking in production requires careful consideration of network modes and port mappings. Bridge networks provide isolation between containers while allowing inter-container communication.

**Network Topology:**
- Host machine: Acts as gateway
- Bridge network: Internal container communication
- Service discovery: Kubernetes DNS (servicename.namespace.svc.cluster.local)
- Load balancer: Distributes traffic across replicas
- Ingress controller: Routes external HTTPS traffic

**DNS Resolution:**
- Kubernetes DNS automatically resolves service names
- Pod FQDN: pod-name.sin-solver.pod.cluster.local
- Service FQDN: captcha-solver.sin-solver.svc.cluster.local
- Cross-namespace: service-name.other-namespace.svc.cluster.local

### Storage and Persistence

Kubernetes storage includes ephemeral volumes (emptyDir) and persistent storage.

**Ephemeral Storage:**
- emptyDir: Temporary storage, deleted when pod terminates
- Use case: Cache, logs, temporary processing
- Size limits: Configurable via requests/limits

**Persistent Storage:**
- PersistentVolume (PV): Cluster-level storage resource
- PersistentVolumeClaim (PVC): Pod request for storage
- Storage classes: Dynamic provisioning configuration

**Backup Strategy:**
- Nightly automated snapshots of databases
- Off-site replication to secondary region
- Weekly restore testing to verify integrity
- RPO (Recovery Point Objective): < 1 hour
- RTO (Recovery Time Objective): < 4 hours

### Resource Management and Quotas

Kubernetes resource quotas prevent individual projects from consuming all cluster resources.

**Resource Requests:**
- Guaranteed minimum resources
- Used for pod scheduling decisions
- Enable proper HPA calculations

**Resource Limits:**
- Hard upper bound on resource consumption
- Prevents noisy neighbor problems
- Triggers pod eviction if exceeded

**Quota Configuration:**
- Per-namespace CPU quota: 10 CPU units
- Per-namespace memory quota: 20Gi
- Per-pod maximum CPU: 2 units
- Per-pod maximum memory: 4Gi

### Logging and Monitoring Strategy

Production deployments require comprehensive logging and monitoring.

**Log Aggregation:**
- Elasticsearch for storage (7-day retention)
- Kibana for searching and visualization
- Filebeat for log shipping from pods
- Structured logging in JSON format
- Log levels: ERROR, WARN, INFO, DEBUG

**Metrics Collection:**
- Prometheus scrapes metrics every 15 seconds
- Retention period: 2 weeks
- Custom application metrics recorded
- System metrics: CPU, memory, disk, network

**Alerting Rules:**
- Pod restart alert: > 3 restarts in 10 minutes
- CPU alert: Average > 80% for 5 minutes
- Memory alert: Average > 85% for 5 minutes
- Error rate alert: > 1% for 2 consecutive minutes
- Latency alert: p95 > 500ms for 5 minutes
- Availability alert: < 3 replicas healthy

**Grafana Dashboards:**
- System overview: CPU, memory, disk, network
- Application metrics: Request rate, latency, errors
- CAPTCHA metrics: Solve rate per type, accuracy
- Pod metrics: Restarts, logs, resource usage
- Database metrics: Connection pool, query performance

### Secrets Management Best Practices

Secure handling of sensitive data is critical for production systems.

**Secret Creation Methods:**
1. kubectl create secret: Command-line creation
2. YAML manifests: Git-tracked but encrypted at rest
3. External secret operator: Integrate with HashiCorp Vault
4. Sealed secrets: Encryption keys stored in cluster

**Secret Access Control:**
- RBAC: Only authorize service accounts that need access
- Pod-level: Mount secrets as volumes or environment variables
- Audit logging: Track all secret access attempts
- Rotation: Regularly rotate API keys and passwords

**Environment-Specific Secrets:**
- Development: Non-production credentials
- Staging: Mirror of production (for testing)
- Production: Real credentials with strict access control

### CI/CD Integration

Automated deployment pipeline ensures consistency and reliability.

**Pipeline Stages:**

1. **Build Stage:** Compile code, run unit tests, build Docker image
2. **Push Stage:** Push image to registry with version tags
3. **Deploy Stage:** Apply Kubernetes manifests
4. **Test Stage:** Run integration and smoke tests
5. **Monitor Stage:** Check metrics and logs for issues
6. **Rollback Stage:** Automatic rollback on failure

**Implementation Tools:**
- GitHub Actions: Native GitHub integration
- GitLab CI: Integrated with GitLab
- Jenkins: Enterprise self-hosted option
- ArgoCD: GitOps-based continuous deployment

**Deployment Strategies:**

- Blue-Green: Two identical environments, instant switchover
- Canary: Gradual traffic shift to new version
- Rolling: Incremental pod replacement (default Kubernetes)

### Disaster Recovery Planning

Business continuity requires documented recovery procedures.

**Backup Schedule:**
- Hourly incremental backups (transaction logs)
- Daily full backups (database snapshots)
- Weekly off-site replication
- Monthly archived snapshots (immutable)

**Recovery Testing:**
- Monthly restore drills from production backups
- Quarterly full disaster recovery simulation
- Annual multi-region failover test
- Documentation of recovery time achieved

**Failover Procedures:**
1. Detect primary region failure (health checks)
2. Activate secondary region (DNS update)
3. Verify secondary functionality (smoke tests)
4. Notify stakeholders
5. Begin investigation of primary failure
6. Execute failback when primary restored
7. Post-mortem and improvements

### Performance Optimization Tips

Production deployments require ongoing optimization.

**Database Optimization:**
- Add indexes on frequently queried columns
- Implement connection pooling (pgbouncer)
- Archive old data to separate table
- Regular VACUUM and ANALYZE operations
- Monitor query execution plans

**Application Optimization:**
- Implement caching at multiple levels
- Use async/await for I/O operations
- Batch database operations
- Compress HTTP responses (gzip)
- Minimize external API calls

**Infrastructure Optimization:**
- Right-size container resource limits
- Utilize horizontal pod autoscaling
- Implement pod disruption budgets
- Enable cluster autoscaling for nodes
- Use node affinity for optimization

### Security Hardening Checklist

Before production deployment, verify all security controls.

**Container Security:**
- [ ] Non-root user (UID > 1000)
- [ ] Read-only root filesystem where possible
- [ ] No privileged containers
- [ ] Resource limits enforced
- [ ] Image scanning passed (no CRITICAL/HIGH CVEs)

**Kubernetes Security:**
- [ ] RBAC: Minimal required permissions
- [ ] Network policies: Restrict pod-to-pod traffic
- [ ] Pod security policies: Baseline standards
- [ ] Secrets: Encrypted at rest
- [ ] HTTPS/TLS: All external traffic encrypted

**Infrastructure Security:**
- [ ] Firewall rules: Least privilege access
- [ ] VPC isolation: Private subnets
- [ ] SSH keys: Disabled, use managed identity
- [ ] Vulnerability scanning: Regular scans
- [ ] Audit logging: All API calls logged

### Advanced Kubernetes Features

Production deployments leverage advanced features for reliability.

**Pod Disruption Budgets:**
- Ensure minimum pods available during maintenance
- Prevent excessive simultaneous pod evictions
- Configuration: minAvailable: 2 (always at least 2 pods)

**Quality of Service (QoS) Classes:**
- Guaranteed: Requests = limits (highest priority)
- Burstable: Requests < limits (medium priority)
- BestEffort: No requests or limits (lowest priority)

**Custom Resource Definitions (CRDs):**
- Extend Kubernetes API for domain-specific objects
- Example: CaptchaSolverConfig CRD
- Enables GitOps-style configuration management

**Operators:**
- Automate complex deployment and management tasks
- Example: PostgreSQL Operator for database management
- Encode operational knowledge in code

---

## PHASE 2.5 EXECUTION TIMELINE

### Pre-Deployment (Day 0)

**1 Week Before:**
- Review this roadmap with entire team
- Ensure all prerequisites met (kubectl, Docker, etc.)
- Stage environment created and tested
- Backup procedures verified and tested

**1 Day Before:**
- Team members assigned to specific tasks
- On-call rotation established
- Communication channels confirmed (Slack, PagerDuty)
- Rollback procedures reviewed and tested

### Deployment Week (Days 1-3)

**Day 1: Docker Containerization**
- Morning: Build Dockerfile (2 hours)
- Afternoon: Test locally with docker-compose (3 hours)
- Evening: Security scanning with Trivy (1 hour)
