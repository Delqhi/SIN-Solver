# PHASE 15.1 - GITHUB CI/CD ACTIVATION GUIDE

**Status:** Ready for Full Activation  
**Date:** 2026-01-30  
**Estimated Duration:** 45 minutes  
**Success Criteria:** All workflows passing, Docker images in GHCR

---

## ACTIVATION WORKFLOW

### STEP 1: Check KUBECONFIG (2 minutes)

**Purpose:** Enable Kubernetes deployment via GitHub Actions

**Command:**
```bash
ls -la ~/.kube/config
```

**If exists:**
```bash
# Generate base64
cat ~/.kube/config | base64 -w 0 | pbcopy

# Add to GitHub:
# 1. Go to: github.com/Delqhi/SIN-Solver/settings/secrets/actions
# 2. Click "New repository secret"
# 3. Name: KUBECONFIG
# 4. Paste the base64 output
# 5. Click "Add secret"
```

**If missing:**
- Skip this step (optional, only needed for Kubernetes deployment)
- Deploy workflow will skip deployment job if secret is missing

---

### STEP 2: Enable Branch Protection Rules (5 minutes)

**Purpose:** Prevent broken code from reaching main branch

**GitHub Steps:**
1. Go to: https://github.com/Delqhi/SIN-Solver/settings/branches
2. Click "Add rule"
3. Branch name pattern: `main`
4. Configure:
   - ✅ Require a pull request before merging
   - ✅ Require approvals (set to 1)
   - ✅ Require status checks to pass:
     - `test / lint`
     - `test / typecheck`
     - `test / test`
     - `test / build`
   - ✅ Require branches to be up to date before merging
   - ✅ Require conversation resolution before merging
5. Click "Create"

**Verification:**
```bash
gh repo rule list
```

---

### STEP 3: Create Test Branch & Verify CI/CD (30 minutes)

**Purpose:** Verify all workflows execute correctly

**Commands:**
```bash
cd /Users/jeremy/dev/SIN-Solver

# Create test branch
git checkout -b test/ci-pipeline-verification

# Make small change
echo "# CI/CD Pipeline Activation - $(date)" >> README.md

# Commit
git add README.md
git commit -m "test: verify CI/CD pipeline is working correctly"

# Push
git push origin test/ci-pipeline-verification
```

**GitHub Web:**
1. Go to: https://github.com/Delqhi/SIN-Solver
2. Should see banner: "test/ci-pipeline-verification had recent pushes"
3. Click "Compare & pull request"
4. Fill in PR details:
   - Title: "test: CI/CD Pipeline Verification"
   - Description: "Verifies all workflows execute correctly"
5. Click "Create pull request"

**Monitor Workflow Execution:**
1. Go to: https://github.com/Delqhi/SIN-Solver/actions
2. Click "test/ci-pipeline-verification" PR
3. Watch 4 jobs execute:
   - **lint** (~2 minutes)
   - **typecheck** (~3 minutes)
   - **test** (~18 minutes)
   - **build** (~7 minutes)
4. All should have ✅ green checkmarks

**Expected Timeline:**
- Workflow start: ~1 minute after push
- Lint completion: ~3 minutes
- Typecheck completion: ~6 minutes
- Tests completion: ~24 minutes
- Build completion: ~31 minutes
- TOTAL: ~30-35 minutes

**If Any Job Fails:**
1. Click failed job to see logs
2. Identify issue from error message
3. Fix locally and push again (will re-trigger workflow)
4. Repeat until all pass

**Approve & Merge PR:**
1. Once all 4 jobs have ✅ green checkmarks
2. Click "Approve" (or ask team member)
3. Click "Merge pull request"
4. Click "Confirm merge"

---

### STEP 4: Verify Build Workflow (10 minutes)

**Purpose:** Confirm Docker images pushed to GHCR

**GitHub Web:**
1. Go to: https://github.com/Delqhi/SIN-Solver/actions
2. Click "build" workflow
3. Click latest run (should be the main-branch merge)
4. Verify it has ✅ green checkmark
5. Logs should show:
   - Building sin-solver-dashboard
   - Building sin-solver-api-brain
   - Building sin-solver-captcha-worker
   - Pushing to GHCR

**Verify Container Registry:**
1. Go to: https://github.com/Delqhi/SIN-Solver/pkgs/container
2. Should see 3 packages:
   - sin-solver-dashboard
   - sin-solver-api-brain
   - sin-solver-captcha-worker
3. Each should have tags:
   - `main` (latest from main branch)
   - `v1.0.0` (semantic version)
   - `{commit-sha}` (specific commit)
   - `latest` (latest overall)

---

### STEP 5: Verify Repository Configuration (5 minutes)

**Purpose:** Confirm all settings are correct

**Commands:**
```bash
# Check branch protection
gh repo rule list

# Check workflows
ls -la .github/workflows/

# Verify main branch protection
gh api repos/Delqhi/SIN-Solver/branches/main \
  --jq '.protection.required_status_checks.checks[].context'
```

**Expected Output:**
```
test / lint
test / typecheck
test / test
test / build
```

---

## TROUBLESHOOTING

### Workflow Not Starting
- **Cause:** Workflow file has syntax error
- **Fix:** Check `.github/workflows/test.yml` for YAML syntax
- **Command:** `yamllint .github/workflows/`

### Workflow Times Out
- **Cause:** Tests take too long (>30 minutes)
- **Fix:** Increase timeout in `test.yml` or optimize tests
- **Check:** `grep timeout_minutes test.yml`

### Docker Build Fails
- **Cause:** Missing dependencies or build error
- **Fix:** Check build.yml logs in Actions tab
- **Check:** `docker build -f Docker/dockerfile.dashboard .`

### KUBECONFIG Secret Error
- **Cause:** Secret not set or invalid
- **Fix:** Check secret exists: `gh secret list`
- **If missing:** Add it again with correct base64 encoding

### PR Won't Merge
- **Cause:** Status checks not passing
- **Fix:** All 4 jobs must have ✅ green checkmarks
- **Wait:** Some jobs take 20-30 minutes

---

## SUCCESS CHECKLIST

- [ ] KUBECONFIG secret added (if applicable)
- [ ] Branch protection rules enabled on main
- [ ] Test branch created and pushed
- [ ] All 4 status checks passing (lint, typecheck, test, build)
- [ ] PR approved and merged
- [ ] Build workflow triggered on main merge
- [ ] 3 Docker images visible in GHCR
- [ ] All images have correct tags (main, v1.0.0, SHA, latest)
- [ ] No errors in any workflow logs

---

## NEXT PHASES

### Phase 15.2: Kubernetes Deployment
- Requires: KUBECONFIG secret configured
- Goal: Verify deploy.yml workflow
- Duration: 20-30 minutes

### Phase 15.3: Production Hardening
- Enable CodeQL security scanning
- Configure Dependabot auto-merge
- Setup deployment notifications
- Duration: 30-40 minutes

### Phase 16: Feature Development
- Branch from main with protection enabled
- All PRs require passing tests
- Production-ready deployment pipeline
- Duration: Ongoing

---

## REFERENCE LINKS

- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **GitHub Secrets:** https://docs.github.com/en/actions/security-guides/encrypted-secrets
- **Branch Protection:** https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests
- **Container Registry:** https://docs.github.com/en/packages/container-registry
- **Deployment Status:** https://github.com/Delqhi/SIN-Solver/actions

