# Agent Assignment Rules - SIN-Solver Multi-Agent Swarm System

**Created:** 2026-01-29 10:00  
**Version:** 1.0.0  
**Status:** ACTIVE  
**Applies To:** All AI Agents in SIN-Solver Project

---

## 🎯 AGENT ROLES & RESPONSIBILITIES

### 1. Sisyphus (Senior Implementation Agent)
**Role:** Primary code implementation and architecture
**Strengths:** Complex logic, system design, production code
**Model:** moonshotai/kimi-k2.5

**Responsibilities:**
- Complex feature implementation
- Architecture decisions
- Production-ready code
- Integration of multiple components
- Performance optimization

**When to Assign:**
- New feature development
- Complex refactoring
- API design
- Database schema changes
- Critical bug fixes

**Arbeitsbereich Format:**
```
{Feature Name};TASK-XXX-src/path/file.ts-STATUS
```

---

### 2. Sisyphus-Junior (Junior Implementation Agent)
**Role:** Quick implementations, documentation, coordination
**Strengths:** Fast execution, documentation, task management
**Model:** kimi-for-coding/k2p5

**Responsibilities:**
- Documentation updates
- Configuration changes
- Simple utilities
- TODO management
- Swarm coordination

**When to Assign:**
- Documentation tasks
- Configuration updates
- Simple scripts
- Task tracking
- Status updates

**Arbeitsbereich Format:**
```
{Task Type};TASK-XXX-path/file.ext-STATUS
```

---

### 3. Prometheus (Planning Agent)
**Role:** Architecture planning and task breakdown
**Strengths:** System design, planning, analysis
**Model:** kimi-for-coding/k2p5

**Responsibilities:**
- Create implementation plans
- Break down complex tasks
- Architecture reviews
- Technical specifications
- Risk assessment

**When to Assign:**
- Before starting complex features
- Architecture decisions
- Task decomposition
- Technical documentation

**Arbeitsbereich Format:**
```
{Planning Topic};PLAN-XXX-docs/plan.md-STATUS
```

---

### 4. Atlas (Heavy Lifting Agent)
**Role:** Large-scale operations and migrations
**Strengths:** Bulk operations, data processing, migrations
**Model:** kimi-for-coding/k2p5

**Responsibilities:**
- Large file operations
- Data migrations
- Batch processing
- Repository-wide changes
- Bulk refactoring

**When to Assign:**
- Multi-file refactoring
- Data migrations
- Repository restructuring
- Bulk updates

**Arbeitsbereich Format:**
```
{Operation Type};ATLAS-XXX-glob-pattern-STATUS
```

---

### 5. Oracle (Architecture Review Agent)
**Role:** Code review and quality assurance
**Strengths:** Review, analysis, best practices
**Model:** kimi-for-coding/k2p5

**Responsibilities:**
- Code reviews
- Architecture validation
- Best practice enforcement
- Security audits
- Performance reviews

**When to Assign:**
- Before merging code
- Architecture validation
- Security reviews
- Performance optimization

**Arbeitsbereich Format:**
```
{Review Type};REVIEW-XXX-src/path/file.ts-STATUS
```

---

### 6. Librarian (Documentation Agent)
**Role:** Documentation and knowledge management
**Strengths:** Documentation, research, knowledge organization
**Model:** opencode-zen/zen/big-pickle (FREE)

**Responsibilities:**
- Documentation updates
- Research tasks
- Knowledge base maintenance
- Guide creation
- Examples and tutorials

**When to Assign:**
- Documentation tasks
- Research assignments
- Guide creation
- Knowledge organization

**Arbeitsbereich Format:**
```
{Doc Type};DOC-XXX-docs/path/file.md-STATUS
```

---

### 7. Explore (Discovery Agent)
**Role:** Codebase exploration and discovery
**Strengths:** Search, exploration, pattern finding
**Model:** opencode-zen/zen/big-pickle (FREE)

**Responsibilities:**
- Codebase exploration
- Pattern discovery
- Dependency analysis
- File location
- Implementation research

**When to Assign:**
- Exploring unknown code
- Finding implementations
- Pattern discovery
- Dependency mapping

**Arbeitsbereich Format:**
```
{Exploration Topic};EXPLORE-XXX-search-pattern-STATUS
```

---

## 🚫 CONFLICT PREVENTION RULES

### Rule 1: Unique Arbeitsbereich
**NO TWO AGENTS may have the same Arbeitsbereich at the same time.**

**Before starting work:**
1. Check current Arbeitsbereich in `.sisyphus/todos/arbeitsbereich-tracking.md`
2. Verify no other agent is working on the same files
3. Register your Arbeitsbereich immediately

### Rule 2: File Locking
**When working on critical files, register them as LOCKED.**

**Lock Format:**
```
🔒 LOCKED: src/critical/file.ts
By: Agent-Name
Since: 2026-01-29 10:00
Until: 2026-01-29 11:00
```

### Rule 3: Communication
**Always update status in real-time.**

**Required Updates:**
- When starting a task
- When completing a task
- When blocking on another task
- When discovering issues

### Rule 4: Handover
**When passing work to another agent, document thoroughly.**

**Handover Format:**
```
HANDOVER: Task-XXX
From: Agent-A
To: Agent-B
Status: IN_PROGRESS / COMPLETED / BLOCKED
Notes: [Detailed notes about current state]
```

---

## 📋 TASK ASSIGNMENT WORKFLOW

### Step 1: Task Identification
```
1. Read master TODO: .sisyphus/todos/sin-solver-master-todo.md
2. Identify next pending task
3. Check dependencies
```

### Step 2: Agent Selection
```
1. Determine task complexity
2. Match with agent strengths
3. Check agent availability
4. Assign task
```

### Step 3: Arbeitsbereich Registration
```
1. Define exact files to modify
2. Create Arbeitsbereich entry
3. Update status to IN_PROGRESS
4. Set estimated completion time
```

### Step 4: Execution
```
1. Work on assigned task
2. Update progress regularly
3. Document any issues
4. Follow coding standards
```

### Step 5: Completion
```
1. Mark task as COMPLETED
2. Update Arbeitsbereich status
3. Update master TODO
4. Update lastchanges.md
5. Update userprompts.md
```

---

## 🔄 PARALLEL WORK MATRIX

| Task Type | Can Parallelize | Max Agents | Coordination |
|-----------|----------------|------------|--------------|
| Documentation | ✅ Yes | Unlimited | None |
| Different Components | ✅ Yes | 5+ | Arbeitsbereich |
| Same Component | ⚠️ Limited | 2 | File locking |
| Critical Files | ❌ No | 1 | Sequential |
| Database Schema | ❌ No | 1 | Sequential |
| API Changes | ⚠️ Limited | 2 | Versioning |

---

## 🚨 ESCALATION PROCEDURES

### Conflict Detected
```
1. STOP work immediately
2. Check Arbeitsbereich tracking
3. Identify conflicting agent
4. Escalate to orchestrator
5. Wait for resolution
```

### Task Blocked
```
1. Mark task as BLOCKED
2. Document blocker reason
3. Identify blocking task/agent
4. Notify orchestrator
5. Pick up next available task
```

### Emergency Override
```
1. Document current state
2. Save all work
3. Notify all agents
4. Wait for orchestrator
5. Follow new instructions
```

---

## 📊 AGENT AVAILABILITY TRACKING

### Status Definitions
- **🟢 AVAILABLE:** Ready for assignment
- **🟡 BUSY:** Working on assigned task
- **🔴 BLOCKED:** Waiting on dependency
- **⚫ OFFLINE:** Not available

### Availability Board
Update this section in real-time:

| Agent | Status | Current Task | Est. Completion |
|-------|--------|--------------|-----------------|
| Sisyphus | ⏸️ IDLE | - | - |
| Sisyphus-Junior | 🟢 ACTIVE | TASK-003-003 | 2026-01-29 10:30 |
| Prometheus | ⏸️ IDLE | - | - |
| Atlas | ⏸️ IDLE | - | - |
| Oracle | ⏸️ IDLE | - | - |
| Librarian | ⏸️ IDLE | - | - |
| Explore | ⏸️ IDLE | - | - |

---

## 🎯 PRIORITY LEVELS

### P0 - CRITICAL
- Production outages
- Security vulnerabilities
- Data loss prevention
- **Response:** Immediate, all agents

### P1 - HIGH
- Feature blockers
- Performance issues
- Critical bugs
- **Response:** Within 1 hour, senior agents

### P2 - MEDIUM
- Feature development
- Refactoring
- Documentation
- **Response:** Within 4 hours, any agent

### P3 - LOW
- Nice-to-have features
- Code cleanup
- Minor optimizations
- **Response:** Within 24 hours, junior agents

---

## 📝 BEST PRACTICES

### DO:
- ✅ Update status immediately when starting/completing
- ✅ Document Arbeitsbereich clearly
- ✅ Communicate blockers promptly
- ✅ Follow naming conventions
- ✅ Test before marking complete
- ✅ Update all relevant documentation

### DON'T:
- ❌ Work without registering Arbeitsbereich
- ❌ Modify files another agent is working on
- ❌ Leave tasks in unclear states
- ❌ Skip documentation updates
- ❌ Ignore conflict warnings
- ❌ Work on P0 tasks without escalation

---

## 🔧 TOOLS & RESOURCES

### Required Reading
- Master TODO: `.sisyphus/todos/sin-solver-master-todo.md`
- Arbeitsbereich Tracking: `.sisyphus/todos/arbeitsbereich-tracking.md`
- Last Changes: `lastchanges.md`
- User Prompts: `userprompts.md`
- AGENTS.md: `/Users/jeremy/dev/SIN-Solver/AGENTS.md`

### Communication Channels
- Status Updates: TODO files
- Blockers: Escalate to orchestrator
- Questions: Check documentation first

---

**Last Updated:** 2026-01-29 10:15  
**Updated By:** Sisyphus-Junior  
**Next Review:** 2026-01-30 10:00
