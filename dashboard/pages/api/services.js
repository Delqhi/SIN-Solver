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
    {
      name: 'n8n Orchestrator',
      url: 'http://localhost:5678/healthz',
      port: 5678,
      icon: '⚙️',
      type: 'http'
    },
    {
      name: 'Vault API',
      url: 'http://localhost:8201/health',
      port: 8201,
      icon: '🔐',
      type: 'http'
    },
    {
      name: 'CodeServer API',
      port: 8041,
      icon: '💻',
      type: 'tcp'
    },
    {
      name: 'PostgreSQL',
      port: 5432,
      icon: '🗄️',
      type: 'tcp'
    },
    {
      name: 'Redis Cache',
      port: 6379,
      icon: '⚡',
      type: 'tcp'
    },
    {
      name: 'Steel Browser',
      url: 'http://localhost:3005/health',
      port: 3005,
      icon: '🌐',
      type: 'http'
    },
    {
      name: 'Skyvern',
      url: 'http://localhost:8030/health',
      port: 8030,
      icon: '👁️',
      type: 'http'
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
      lastChecked: new Date().toISOString()
    };
  }));

  res.status(200).json({
    services: results,
    timestamp: new Date().toISOString()
  });
}
