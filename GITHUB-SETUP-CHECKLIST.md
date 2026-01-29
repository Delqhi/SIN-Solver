# GitHub Setup Checklist - Phase 15.1

## Overview
This checklist guides you through the final setup steps required to activate the CI/CD pipeline created in Phase 15.1.

**Status:** Ready to Configure  
**Estimated Time:** 15-20 minutes  
**Prerequisites:** CI/CD workflows committed ✅

---

## 🔐 STEP 1: Configure GitHub Secrets

### Required Secrets

#### 1a. KUBECONFIG (CRITICAL for deploy workflow)
**Purpose:** Authenticates kubectl to Kubernetes cluster  
**Required for:** deploy.yml workflow

**Steps to Generate:**
```bash
# Option 1: If you have a kubeconfig file
cat ~/.kube/config | base64 -w 0
# Copy the output

# Option 2: If using GKE
gcloud container clusters get-credentials CLUSTER_NAME --region REGION
cat ~/.kube/config | base64 -w 0

# Option 3: If using EKS
aws eks update-kubeconfig --region REGION --name CLUSTER_NAME
cat ~/.kube/config | base64 -w 0
```

**Add to GitHub:**
1. Go to: `github.com/Delqhi/SIN-Solver`
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `KUBECONFIG`
5. Value: Paste the base64-encoded kubeconfig
6. Click "Add secret"

**Verification:**
```bash
# Test after adding secret
gh secret list
# Should show: KUBECONFIG    ✓
```

#### 1b. CODECOV_TOKEN (Optional, for coverage tracking)
**Purpose:** Upload test coverage reports to Codecov  
**Required for:** test.yml workflow (optional)

**Steps to Generate:**
1. Go to: `https://codecov.io/account/select/repositories`
2. Sign in with GitHub account
3. Click "Add repository" and select SIN-Solver
4. Copy the repository upload token
5. Add to GitHub Secrets as `CODECOV_TOKEN`

**Note:** If not configured, test workflow will skip coverage upload (non-blocking)

---

## 🔒 STEP 2: Configure Branch Protection Rules

**Purpose:** Ensure all tests pass before merging to main  
**Duration:** 5 minutes

**Steps:**
1. Go to: `github.com/Delqhi/SIN-Solver`
2. Settings → Branches → "Add rule"
3. Apply to: `main`
4. Enable:
   - ☑ Require a pull request before merging
   - ☑ Require approvals (1)
   - ☑ Require status checks to pass before merging:
     - `test / lint`
     - `test / typecheck`
     - `test / test`
     - `test / build`
   - ☑ Require branches to be up to date before merging
   - ☑ Require conversation resolution before merging
5. Click "Create"

**Diagram:**
```
Developer creates feature branch
         ↓
   Push code
         ↓
   GitHub Actions triggers (test.yml)
         ↓
   All tests must pass ← Must complete before merge
         ↓
   Create Pull Request
         ↓
   Require 1 code review
         ↓
   Merge to main (after approval)
         ↓
   build.yml triggers (Docker build)
         ↓
   Docker images pushed to GHCR
         ↓
   deploy.yml can be manually triggered
```

---

## 🚀 STEP 3: Trigger First Test Run (Verification)

**Purpose:** Verify workflows are working correctly  
**Duration:** 30 minutes

**Option A: Test with Feature Branch (RECOMMENDED)**
```bash
# Create test branch
git checkout -b test/ci-pipeline-check

# Make a small change (add comment)
echo "# CI/CD Pipeline Test" >> README.md

# Commit and push
git add README.md
git commit -m "test: verify CI/CD pipeline is working"
git push origin test/ci-pipeline-check
```

Then:
1. Go to GitHub → "Pull requests" → "New pull request"
2. Create PR from `test/ci-pipeline-check` → `main`
3. Watch Actions tab:
   - test.yml should run automatically (takes ~30 min)
   - All jobs must pass: lint, typecheck, test, build
4. After tests pass, request code review
5. Once approved, click "Merge pull request"
6. build.yml should trigger automatically (Docker build)

**Option B: Test with Manual Dispatch (FASTER)**
```bash
# Push a real change to main directly (only if trusted)
git push origin main

# Go to Actions tab
# Manually trigger build.yml
# Click "Run workflow" → Select environment
```

---

## ✅ STEP 4: Verify Docker Images Built

**Purpose:** Confirm Docker images pushed to GitHub Container Registry  
**Duration:** 5 minutes

**After build.yml completes:**
1. Go to: `github.com/Delqhi/SIN-Solver/pkgs/container`
2. Verify 3 images exist:
   - `sin-solver-dashboard`
   - `sin-solver-api-brain`
   - `sin-solver-captcha-worker`
3. Click each image to verify tags:
   - `main` (latest code from main branch)
   - `v1.0.0` (semantic version)
   - `main-XXXXXXX` (commit SHA)
   - `latest` (most recent release)

**Example:**
```
ghcr.io/delqhi/SIN-Solver/sin-solver-dashboard:main
├── Created: 2 minutes ago
├── Size: 245 MB
├── Tags: main, main-0aeb48a, v1.0.0, latest
└── Push: Automated by build.yml
```

---

## 🎯 STEP 5: View Workflow Status & Logs

**Purpose:** Monitor and debug CI/CD execution

**Dashboard:**
1. Go to: `github.com/Delqhi/SIN-Solver/actions`
2. View all workflow runs
3. Click on a workflow to see detailed logs
4. Each job shows:
   - Duration (e.g., 2m 45s)
   - Status (✅ passed, ❌ failed, ⏭️ skipped)
   - Detailed logs for debugging

**Command Line:**
```bash
# List all workflows
gh workflow list

# List recent runs
gh run list

# View specific workflow runs
gh run list --workflow=test.yml

# View run details
gh run view RUN_ID

# Download artifacts
gh run download RUN_ID -n artifact-name
```

---

## 📊 STEP 6: Monitor Test Coverage

**Purpose:** Track code coverage trends  
**Duration:** 2 minutes

**If CODECOV_TOKEN configured:**
1. Go to: `https://app.codecov.io/gh/Delqhi/SIN-Solver`
2. View coverage dashboard
3. Coverage badges available:
   - Overall coverage: `[![codecov](https://codecov.io/gh/Delqhi/SIN-Solver/branch/main/graph/badge.svg)](https://codecov.io/gh/Delqhi/SIN-Solver)`

**In README.md:**
```markdown
## Code Quality

[![Test Status](https://github.com/Delqhi/SIN-Solver/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/Delqhi/SIN-Solver/actions)
[![Code Coverage](https://codecov.io/gh/Delqhi/SIN-Solver/branch/main/graph/badge.svg)](https://codecov.io/gh/Delqhi/SIN-Solver)
[![Build Status](https://github.com/Delqhi/SIN-Solver/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/Delqhi/SIN-Solver/actions)
```

---

## 🐛 STEP 7: Troubleshooting Common Issues

### Issue 1: Test Workflow Fails

**Symptoms:**
- ❌ test.yml shows red X
- Error: "PostgreSQL connection refused"

**Solution:**
```bash
# Check PostgreSQL service health
docker ps | grep postgres

# If not running, start locally
docker-compose up -d postgres redis

# Re-run workflow
gh run rerun FAILED_RUN_ID
```

### Issue 2: Build Workflow Fails

**Symptoms:**
- ❌ build.yml shows red X
- Error: "Docker build failed"

**Solution:**
```bash
# Build locally to test
docker build -t sin-solver-dashboard:test .

# If succeeds locally, check GitHub secret
gh secret list

# If GITHUB_TOKEN missing, regenerate
gh auth refresh --scopes write:packages
```

### Issue 3: Deploy Workflow Fails

**Symptoms:**
- ❌ deploy.yml shows red X
- Error: "kubeconfig: no such file or directory"

**Solution:**
```bash
# Verify KUBECONFIG secret exists
gh secret list
# Should show: KUBECONFIG    ✓

# If missing, add it:
cat ~/.kube/config | base64 -w 0
gh secret set KUBECONFIG

# Re-run workflow
gh run rerun FAILED_RUN_ID
```

### Issue 4: Coverage Not Uploading

**Symptoms:**
- ⚠️ test.yml succeeds but coverage badge shows "no coverage"

**Solution:**
```bash
# Check if CODECOV_TOKEN is set
gh secret list

# If missing, it's optional (non-blocking)
# To fix: go to codecov.io and copy token
gh secret set CODECOV_TOKEN
```

---

## 📈 STEP 8: View GitHub Actions Summary

**After all workflows complete, check:**
1. Go to: `github.com/Delqhi/SIN-Solver/actions`
2. Click recent run
3. Verify section appears:
   - ✅ All checks passed
   - Lint: 2m 15s
   - TypeCheck: 3m 42s
   - Test: 18m 36s
   - Build: 7m 12s

---

## ✨ COMPLETION CHECKLIST

- [ ] KUBECONFIG secret added to GitHub
- [ ] CODECOV_TOKEN secret added (optional)
- [ ] Branch protection rules configured for `main`
- [ ] Feature branch created and pushed
- [ ] PR created and tested (test.yml ran successfully)
- [ ] Code reviewed and approved
- [ ] PR merged to main
- [ ] build.yml triggered and completed
- [ ] Docker images verified in GHCR
- [ ] All 3 images present with correct tags
- [ ] Coverage dashboard accessible (if using Codecov)
- [ ] Workflow status badges added to README

---

## 📞 Next Steps (Phase 15.2)

Once all above steps complete:

1. **Configure Kubernetes Cluster** (1-2 hours)
   - Create kubeconfig file
   - Setup service account
   - Configure RBAC permissions

2. **Test deploy.yml Workflow** (30 minutes)
   - Go to Actions → deploy.yml
   - Click "Run workflow"
   - Select environment: "staging"
   - Watch deployment proceed

3. **Verify Production Deployment** (30 minutes)
   - Check kubectl: `kubectl get pods -n sin-solver`
   - Test health endpoint: `curl https://api.delqhi.com/health`
   - Monitor logs: `kubectl logs -f deployment/sin-solver-dashboard -n sin-solver`

---

## 📞 Support Commands

```bash
# Check workflow status
gh workflow list

# View all recent runs
gh run list -L 10

# View specific workflow
gh workflow view test.yml

# Check secrets configured
gh secret list

# Re-run failed workflow
gh run rerun RUN_ID

# Download logs
gh run download RUN_ID -n logs

# Cancel running workflow
gh run cancel RUN_ID
```

---

**Checklist Status:** Ready for Implementation  
**Estimated Completion:** 30-40 minutes for full setup  
**Previous Step:** CI/CD workflows committed ✅ (Commit 0aeb48a)  
**Next Step:** Configure secrets and test

