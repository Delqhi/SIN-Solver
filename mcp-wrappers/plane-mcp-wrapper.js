#!/usr/bin/env node
/**
 * Plane MCP Wrapper - Enhanced Version
 * Konvertiert Plane HTTP API zu MCP stdio Protocol
 * 
 * This wrapper provides comprehensive integration with Plane.so project management
 * including projects, issues, cycles, modules, comments, and AI agent orchestration.
 * 
 * Usage: Add to opencode.json as local MCP
 * Environment Variables:
 *   - PLANE_API_URL: Plane API endpoint (default: https://plane.delqhi.com)
 *   - PLANE_API_KEY: API key for authentication
 *   - PLANE_WORKSPACE_SLUG: Workspace identifier (default: sin-solver)
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

// Configuration
const PLANE_API_URL = process.env.PLANE_API_URL || 'https://plane.delqhi.com';
const PLANE_API_KEY = process.env.PLANE_API_KEY;
const PLANE_WORKSPACE_SLUG = process.env.PLANE_WORKSPACE_SLUG || 'sin-solver';

if (!PLANE_API_KEY) {
  console.error('ERROR: PLANE_API_KEY environment variable is required');
  process.exit(1);
}

// Create axios client with default config
const client = axios.create({
  baseURL: PLANE_API_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': PLANE_API_KEY,
  },
});

// Error handler helper
function handleError(error) {
  const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
  const statusCode = error.response?.status || 500;
  return {
    content: [{ 
      type: 'text', 
      text: `Error (${statusCode}): ${errorMessage}` 
    }],
    isError: true,
  };
}

// Initialize MCP Server
const server = new Server(
  {
    name: 'plane-mcp-wrapper',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================================================
// PLANE API FUNCTIONS
// ============================================================================

// Projects
async function listProjects() {
  const response = await client.get(`/api/v1/workspaces/${PLANE_WORKSPACE_SLUG}/projects/`);
  return response.data;
}

async function getProject(projectId) {
  const response = await client.get(`/api/v1/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${projectId}/`);
  return response.data;
}

// Issues
async function listIssues(projectId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.state) params.append('state', filters.state);
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.assignee) params.append('assignee', filters.assignee);
  if (filters.per_page) params.append('per_page', filters.per_page);
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const response = await client.get(`/api/v1/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${projectId}/issues/${queryString}`);
  return response.data;
}

async function createIssue(projectId, data) {
  const response = await client.post(
    `/api/v1/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${projectId}/issues/`,
    data
  );
  return response.data;
}

async function getIssue(projectId, issueId) {
  const response = await client.get(
    `/api/v1/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${projectId}/issues/${issueId}/`
  );
  return response.data;
}

async function updateIssue(projectId, issueId, data) {
  const response = await client.patch(
    `/api/v1/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${projectId}/issues/${issueId}/`,
    data
  );
  return response.data;
}

async function deleteIssue(projectId, issueId) {
  const response = await client.delete(
    `/api/v1/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${projectId}/issues/${issueId}/`
  );
  return response.data;
}

// Comments
async function listComments(projectId, issueId) {
  const response = await client.get(
    `/api/v1/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${projectId}/issues/${issueId}/comments/`
  );
  return response.data;
}

async function addComment(projectId, issueId, comment, actorId = 'system') {
  const data = {
    comment_html: comment,
    actor: actorId,
  };
  const response = await client.post(
    `/api/v1/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${projectId}/issues/${issueId}/comments/`,
    data
  );
  return response.data;
}

// Cycles (Sprints)
async function listCycles(projectId) {
  const response = await client.get(
    `/api/v1/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${projectId}/cycles/`
  );
  return response.data;
}

async function createCycle(projectId, data) {
  const response = await client.post(
    `/api/v1/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${projectId}/cycles/`,
    data
  );
  return response.data;
}

async function getCycle(projectId, cycleId) {
  const response = await client.get(
    `/api/v1/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${projectId}/cycles/${cycleId}/`
  );
  return response.data;
}

// Modules
async function listModules(projectId) {
  const response = await client.get(
    `/api/v1/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${projectId}/modules/`
  );
  return response.data;
}

async function createModule(projectId, data) {
  const response = await client.post(
    `/api/v1/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${projectId}/modules/`,
    data
  );
  return response.data;
}

async function getModule(projectId, moduleId) {
  const response = await client.get(
    `/api/v1/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${projectId}/modules/${moduleId}/`
  );
  return response.data;
}

// Members
async function listMembers() {
  const response = await client.get(`/api/v1/workspaces/${PLANE_WORKSPACE_SLUG}/members/`);
  return response.data;
}

// States (Issue States)
async function listStates(projectId) {
  const response = await client.get(
    `/api/v1/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${projectId}/states/`
  );
  return response.data;
}

// Labels
async function listLabels(projectId) {
  const response = await client.get(
    `/api/v1/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${projectId}/labels/`
  );
  return response.data;
}

// Search
async function searchIssues(projectId, query) {
  const response = await client.get(
    `/api/v1/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${projectId}/issues/?search=${encodeURIComponent(query)}`
  );
  return response.data;
}

// ============================================================================
// AI AGENT ORCHESTRATION FUNCTIONS
// ============================================================================

const AGENT_REGISTRY = {
  'agent-zero': {
    name: 'Agent Zero',
    role: 'orchestrator',
    capabilities: ['planning', 'delegation', 'coordination', 'decision-making'],
  },
  'steel-browser': {
    name: 'Steel Browser',
    role: 'browser',
    capabilities: ['web-browsing', 'screenshot', 'form-filling', 'scraping'],
  },
  'clawdbot': {
    name: 'ClawdBot',
    role: 'social',
    capabilities: ['social-media', 'messaging', 'notifications', 'content-posting'],
  },
  'skyvern': {
    name: 'Skyvern',
    role: 'automation',
    capabilities: ['automation', 'workflow', 'data-extraction', 'form-automation'],
  },
  'opencode': {
    name: 'OpenCode',
    role: 'coder',
    capabilities: ['coding', 'debugging', 'refactoring', 'code-review'],
  },
  'tresor': {
    name: 'Tresor Vault',
    role: 'secrets',
    capabilities: ['credentials', 'api-keys', 'secrets', 'encryption'],
  },
  'stagehand': {
    name: 'Stagehand',
    role: 'research',
    capabilities: ['research', 'investigation', 'data-gathering', 'analysis'],
  },
  'playwright': {
    name: 'Playwright QA',
    role: 'qa',
    capabilities: ['testing', 'validation', 'e2e-tests', 'visual-regression'],
  },
  'n8n': {
    name: 'N8N Orchestrator',
    role: 'workflow',
    capabilities: ['workflow-automation', 'integrations', 'triggers', 'scheduling'],
  },
  'surfsense': {
    name: 'SurfSense',
    role: 'knowledge',
    capabilities: ['knowledge-base', 'memory', 'context', 'learning'],
  },
};

async function listAgents() {
  return Object.entries(AGENT_REGISTRY).map(([id, agent]) => ({
    id,
    ...agent,
    status: 'idle',
  }));
}

async function getAgent(agentId) {
  const agent = AGENT_REGISTRY[agentId];
  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }
  return {
    id: agentId,
    ...agent,
    status: 'idle',
  };
}

async function mentionAgent(agentId, issueId, projectId, command, context = {}) {
  const agent = AGENT_REGISTRY[agentId];
  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  // Simulate agent processing
  const isComplex = command.split(' ').length > 10 || command.toLowerCase().includes('create');
  
  return {
    status: 'processing',
    agent: agentId,
    agent_name: agent.name,
    issue_id: issueId,
    project_id: projectId,
    command: command,
    is_complex: isComplex,
    requires_orchestrator: isComplex && agentId !== 'agent-zero',
    task_id: `task_${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
}

async function agentSuggestion(agentId, issueId, suggestionType, content, autoApply = false) {
  const agent = AGENT_REGISTRY[agentId];
  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  return {
    status: 'suggestion_sent',
    suggestion_id: `sug_${Date.now()}`,
    agent: agentId,
    agent_name: agent.name,
    issue_id: issueId,
    suggestion_type: suggestionType,
    content: content,
    auto_apply: autoApply,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const TOOLS = [
  // Project Tools
  {
    name: 'plane_list_projects',
    description: 'List all projects in the Plane workspace',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'plane_get_project',
    description: 'Get details of a specific project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
      },
      required: ['project_id'],
    },
  },
  
  // Issue Tools
  {
    name: 'plane_list_issues',
    description: 'List all issues in a project with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        state: { type: 'string', description: 'Filter by state (e.g., backlog, started, completed)' },
        priority: { type: 'string', description: 'Filter by priority (urgent, high, medium, low)' },
        assignee: { type: 'string', description: 'Filter by assignee ID' },
        per_page: { type: 'number', description: 'Number of results per page (default: 30)' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'plane_create_issue',
    description: 'Create a new issue in a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Issue title' },
        description: { type: 'string', description: 'Issue description (HTML supported)' },
        priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low', 'none'], description: 'Issue priority' },
        state: { type: 'string', description: 'Initial state (default: backlog)' },
        assignee_ids: { type: 'array', items: { type: 'string' }, description: 'Array of assignee IDs' },
        labels: { type: 'array', items: { type: 'string' }, description: 'Array of label IDs' },
        cycle_id: { type: 'string', description: 'Cycle ID to add issue to' },
        module_id: { type: 'string', description: 'Module ID to add issue to' },
      },
      required: ['project_id', 'name'],
    },
  },
  {
    name: 'plane_get_issue',
    description: 'Get details of a specific issue',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        issue_id: { type: 'string', description: 'Issue ID' },
      },
      required: ['project_id', 'issue_id'],
    },
  },
  {
    name: 'plane_update_issue',
    description: 'Update an existing issue',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        issue_id: { type: 'string', description: 'Issue ID' },
        name: { type: 'string', description: 'New title' },
        description: { type: 'string', description: 'New description' },
        priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low', 'none'] },
        state: { type: 'string', description: 'New state' },
        assignee_ids: { type: 'array', items: { type: 'string' } },
        labels: { type: 'array', items: { type: 'string' } },
      },
      required: ['project_id', 'issue_id'],
    },
  },
  {
    name: 'plane_delete_issue',
    description: 'Delete an issue from a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        issue_id: { type: 'string', description: 'Issue ID' },
      },
      required: ['project_id', 'issue_id'],
    },
  },
  {
    name: 'plane_search_issues',
    description: 'Search for issues in a project by query string',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        query: { type: 'string', description: 'Search query' },
      },
      required: ['project_id', 'query'],
    },
  },
  
  // Comment Tools
  {
    name: 'plane_list_comments',
    description: 'List all comments on an issue',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        issue_id: { type: 'string', description: 'Issue ID' },
      },
      required: ['project_id', 'issue_id'],
    },
  },
  {
    name: 'plane_add_comment',
    description: 'Add a comment to an issue',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        issue_id: { type: 'string', description: 'Issue ID' },
        comment: { type: 'string', description: 'Comment text (HTML supported)' },
        actor_id: { type: 'string', description: 'Actor/user ID (default: system)' },
      },
      required: ['project_id', 'issue_id', 'comment'],
    },
  },
  
  // Cycle Tools
  {
    name: 'plane_list_cycles',
    description: 'List all cycles/sprints in a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'plane_create_cycle',
    description: 'Create a new cycle/sprint in a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Cycle name' },
        description: { type: 'string', description: 'Cycle description' },
        start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        end_date: { type: 'string', description: 'End date (YYYY-MM-DD)' },
      },
      required: ['project_id', 'name'],
    },
  },
  {
    name: 'plane_get_cycle',
    description: 'Get details of a specific cycle',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        cycle_id: { type: 'string', description: 'Cycle ID' },
      },
      required: ['project_id', 'cycle_id'],
    },
  },
  
  // Module Tools
  {
    name: 'plane_list_modules',
    description: 'List all modules in a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'plane_create_module',
    description: 'Create a new module in a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Module name' },
        description: { type: 'string', description: 'Module description' },
      },
      required: ['project_id', 'name'],
    },
  },
  {
    name: 'plane_get_module',
    description: 'Get details of a specific module',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        module_id: { type: 'string', description: 'Module ID' },
      },
      required: ['project_id', 'module_id'],
    },
  },
  
  // Member Tools
  {
    name: 'plane_list_members',
    description: 'List all workspace members',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  
  // State Tools
  {
    name: 'plane_list_states',
    description: 'List all issue states in a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
      },
      required: ['project_id'],
    },
  },
  
  // Label Tools
  {
    name: 'plane_list_labels',
    description: 'List all labels in a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
      },
      required: ['project_id'],
    },
  },
  
  // AI Agent Tools
  {
    name: 'plane_list_agents',
    description: 'List all available AI agents and their capabilities',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'plane_get_agent',
    description: 'Get details of a specific AI agent',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { 
          type: 'string', 
          description: 'Agent ID',
          enum: ['agent-zero', 'steel-browser', 'clawdbot', 'skyvern', 'opencode', 'tresor', 'stagehand', 'playwright', 'n8n', 'surfsense'],
        },
      },
      required: ['agent_id'],
    },
  },
  {
    name: 'plane_mention_agent',
    description: 'Mention/assign an AI agent to handle a task related to an issue',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { 
          type: 'string', 
          description: 'Agent ID to mention',
          enum: ['agent-zero', 'steel-browser', 'clawdbot', 'skyvern', 'opencode', 'tresor', 'stagehand', 'playwright', 'n8n', 'surfsense'],
        },
        issue_id: { type: 'string', description: 'Issue ID' },
        project_id: { type: 'string', description: 'Project ID' },
        command: { type: 'string', description: 'Command or task description for the agent' },
        context: { type: 'object', description: 'Additional context for the agent' },
      },
      required: ['agent_id', 'issue_id', 'project_id', 'command'],
    },
  },
  {
    name: 'plane_agent_suggestion',
    description: 'Submit a suggestion from an AI agent for an issue',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Agent ID making the suggestion' },
        issue_id: { type: 'string', description: 'Issue ID' },
        suggestion_type: { 
          type: 'string', 
          enum: ['correction', 'improvement', 'automation', 'delegation'],
          description: 'Type of suggestion',
        },
        content: { type: 'string', description: 'Suggestion content' },
        auto_apply: { type: 'boolean', description: 'Whether to auto-apply the suggestion' },
      },
      required: ['agent_id', 'issue_id', 'suggestion_type', 'content'],
    },
  },
];

// ============================================================================
// REQUEST HANDLERS
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // Projects
      case 'plane_list_projects':
        return { toolResult: await listProjects() };
      case 'plane_get_project':
        return { toolResult: await getProject(args.project_id) };
      
      // Issues
      case 'plane_list_issues':
        return { toolResult: await listIssues(args.project_id, args) };
      case 'plane_create_issue':
        return { toolResult: await createIssue(args.project_id, {
          name: args.name,
          description_html: args.description || '',
          priority: args.priority || 'medium',
          state: args.state,
          assignee_ids: args.assignee_ids,
          labels: args.labels,
          cycle_id: args.cycle_id,
          module_id: args.module_id,
        }) };
      case 'plane_get_issue':
        return { toolResult: await getIssue(args.project_id, args.issue_id) };
      case 'plane_update_issue':
        return { toolResult: await updateIssue(args.project_id, args.issue_id, {
          name: args.name,
          description_html: args.description,
          priority: args.priority,
          state: args.state,
          assignee_ids: args.assignee_ids,
          labels: args.labels,
        }) };
      case 'plane_delete_issue':
        return { toolResult: await deleteIssue(args.project_id, args.issue_id) };
      case 'plane_search_issues':
        return { toolResult: await searchIssues(args.project_id, args.query) };
      
      // Comments
      case 'plane_list_comments':
        return { toolResult: await listComments(args.project_id, args.issue_id) };
      case 'plane_add_comment':
        return { toolResult: await addComment(args.project_id, args.issue_id, args.comment, args.actor_id) };
      
      // Cycles
      case 'plane_list_cycles':
        return { toolResult: await listCycles(args.project_id) };
      case 'plane_create_cycle':
        return { toolResult: await createCycle(args.project_id, {
          name: args.name,
          description: args.description,
          start_date: args.start_date,
          end_date: args.end_date,
        }) };
      case 'plane_get_cycle':
        return { toolResult: await getCycle(args.project_id, args.cycle_id) };
      
      // Modules
      case 'plane_list_modules':
        return { toolResult: await listModules(args.project_id) };
      case 'plane_create_module':
        return { toolResult: await createModule(args.project_id, {
          name: args.name,
          description: args.description,
        }) };
      case 'plane_get_module':
        return { toolResult: await getModule(args.project_id, args.module_id) };
      
      // Members
      case 'plane_list_members':
        return { toolResult: await listMembers() };
      
      // States
      case 'plane_list_states':
        return { toolResult: await listStates(args.project_id) };
      
      // Labels
      case 'plane_list_labels':
        return { toolResult: await listLabels(args.project_id) };
      
      // AI Agents
      case 'plane_list_agents':
        return { toolResult: await listAgents() };
      case 'plane_get_agent':
        return { toolResult: await getAgent(args.agent_id) };
      case 'plane_mention_agent':
        return { toolResult: await mentionAgent(args.agent_id, args.issue_id, args.project_id, args.command, args.context) };
      case 'plane_agent_suggestion':
        return { toolResult: await agentSuggestion(args.agent_id, args.issue_id, args.suggestion_type, args.content, args.auto_apply) };
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return handleError(error);
  }
});

// ============================================================================
// START SERVER
// ============================================================================

const transport = new StdioServerTransport();
server.connect(transport).catch((error) => {
  console.error('Failed to start Plane MCP wrapper:', error);
  process.exit(1);
});

console.error('Plane MCP Wrapper v2.0.0 started successfully');
console.error(`Connected to: ${PLANE_API_URL}`);
console.error(`Workspace: ${PLANE_WORKSPACE_SLUG}`);
