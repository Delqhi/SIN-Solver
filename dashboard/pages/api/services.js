import net from 'net';

const checkPort = (port, host = 'localhost') => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
};

const checkUrl = async (url) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response.ok;
  } catch (e) {
    return false;
  }
};

export default async function handler(req, res) {
  const services = [
    // AI Agents (4)
    {
      name: 'n8n Orchestrator',
      url: 'http://localhost:5678/healthz',
      port: 5678,
      icon: '⚙️',
      type: 'http',
      category: 'AI Agents'
    },
    {
      name: 'Agent Zero',
      url: 'http://localhost:8050/health',
      port: 8050,
      icon: '🤖',
      type: 'http',
      category: 'AI Agents'
    },
    {
      name: 'Steel Browser',
      url: 'http://localhost:3005/health',
      port: 3005,
      icon: '🌐',
      type: 'http',
      category: 'AI Agents'
    },
    {
      name: 'Skyvern Solver',
      url: 'http://localhost:8030/health',
      port: 8030,
      icon: '👁️',
      type: 'http',
      category: 'AI Agents'
    },
    // Infrastructure (7)
    {
      name: 'PostgreSQL',
      port: 5432,
      icon: '🐘',
      type: 'tcp',
      category: 'Infrastructure'
    },
    {
      name: 'Redis Cache',
      port: 6379,
      icon: '⚡',
      type: 'tcp',
      category: 'Infrastructure'
    },
    {
      name: 'Vault',
      url: 'http://localhost:8200/v1/sys/health',
      port: 8200,
      icon: '🔐',
      type: 'http',
      category: 'Infrastructure'
    },
    {
      name: 'NocoDB',
      url: 'http://localhost:8090/health',
      port: 8090,
      icon: '📊',
      type: 'http',
      category: 'Infrastructure'
    },
    {
      name: 'Video Gen',
      url: 'http://localhost:8205/health',
      port: 8205,
      icon: '🎬',
      type: 'http',
      category: 'Infrastructure'
    },
    {
      name: 'MCP Plugins',
      url: 'http://localhost:8040/health',
      port: 8040,
      icon: '🔌',
      type: 'http',
      category: 'Infrastructure'
    },
    {
      name: 'Supabase',
      url: 'http://localhost:54323/api/health',
      port: 54323,
      icon: '📦',
      type: 'http',
      category: 'Infrastructure'
    },
    // Task Solvers (2)
    {
      name: 'Captcha Worker',
      url: 'http://localhost:8019/health',
      port: 8019,
      icon: '🧩',
      type: 'http',
      category: 'Task Solvers'
    },
    {
      name: 'Survey Worker',
      url: 'http://localhost:8018/health',
      port: 8018,
      icon: '📝',
      type: 'http',
      category: 'Task Solvers'
    },
    // Communication (4)
    {
      name: 'RocketChat',
      url: 'http://localhost:3009/api/health',
      port: 3009,
      icon: '💬',
      type: 'http',
      category: 'Communication'
    },
    {
      name: 'MongoDB',
      port: 27017,
      icon: '🍃',
      type: 'tcp',
      category: 'Communication'
    },
    {
      name: 'Chat MCP',
      url: 'http://localhost:8119/health',
      port: 8119,
      icon: '🤖',
      type: 'http',
      category: 'Communication'
    },
    {
      name: 'Hoppscotch',
      url: 'http://localhost:3024/health',
      port: 3024,
      icon: '🧪',
      type: 'http',
      category: 'Communication'
    },
    // Delqhi Database (6)
    {
      name: 'Delqhi DB',
      port: 5412,
      icon: '🗄️',
      type: 'tcp',
      category: 'Delqhi DB'
    },
    {
      name: 'Auth API',
      url: 'http://localhost:9999/health',
      port: 9999,
      icon: '🔑',
      type: 'http',
      category: 'Delqhi DB'
    },
    {
      name: 'REST API',
      url: 'http://localhost:3112/health',
      port: 3112,
      icon: '🔌',
      type: 'http',
      category: 'Delqhi DB'
    },
    {
      name: 'Realtime',
      port: 4012,
      icon: '⚡',
      type: 'tcp',
      category: 'Delqhi DB'
    },
    {
      name: 'Storage',
      port: 5012,
      icon: '📁',
      type: 'tcp',
      category: 'Delqhi DB'
    },
    {
      name: 'Studio',
      url: 'http://localhost:3012/health',
      port: 3012,
      icon: '🎨',
      type: 'http',
      category: 'Delqhi DB'
    },
    // Delqhi Network (4)
    {
      name: 'Delqhi API',
      url: 'http://localhost:8130/health',
      port: 8130,
      icon: '🔌',
      type: 'http',
      category: 'Delqhi Net'
    },
    {
      name: 'Delqhi Web',
      url: 'http://localhost:3130/health',
      port: 3130,
      icon: '🌐',
      type: 'http',
      category: 'Delqhi Net'
    },
    {
      name: 'Delqhi MCP',
      url: 'http://localhost:8213/health',
      port: 8213,
      icon: '🤖',
      type: 'http',
      category: 'Delqhi Net'
    },
    {
      name: 'Meilisearch',
      url: 'http://localhost:7700/health',
      port: 7700,
      icon: '🔍',
      type: 'http',
      category: 'Delqhi Net'
    },
    // Dashboard
    {
      name: 'Dashboard',
      url: 'http://localhost:3011/api/health',
      port: 3011,
      icon: '📊',
      type: 'http',
      category: 'Dashboard'
    }
  ];

  const results = await Promise.all(services.map(async (service) => {
    let isHealthy = false;
    if (service.type === 'http') {
      isHealthy = await checkUrl(service.url);
    } else {
      isHealthy = await checkPort(service.port);
    }

    return {
      name: service.name,
      status: isHealthy ? 'healthy' : 'down',
      port: service.port,
      icon: service.icon,
      category: service.category,
      lastChecked: new Date().toISOString()
    };
  }));

  const categories = [...new Set(services.map(s => s.category))];
  const total = results.length;
  const healthy = results.filter(r => r.status === 'healthy').length;

  res.status(200).json({
    services: results,
    summary: {
      total,
      healthy,
      unhealthy: total - healthy,
      categories: categories.map(cat => ({
        name: cat,
        count: results.filter(r => r.category === cat).length,
        healthy: results.filter(r => r.category === cat && r.status === 'healthy').length
      }))
    },
    timestamp: new Date().toISOString()
  });
}
