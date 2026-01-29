import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const CATEGORY_MAP = {
  'agent': 'AI Agents',
  'room': 'Infrastructure',
  'solver': 'Task Solvers',
  'builder': 'Content Builders',
  'infra': 'Infrastructure'
};

const ICON_MAP = {
  'n8n': '⚙️',
  'agentzero': '🤖',
  'steel': '🌐',
  'skyvern': '👁️',
  'postgres': '🐘',
  'redis': '⚡',
  'vault': '🔐',
  'nocodb': '📊',
  'video-gen': '🎬',
  'mcp': '🔌',
  'supabase': '📦',
  'captcha': '🧩',
  'survey': '📝',
  'rocketchat': '💬',
  'mongo': '🍃',
  'hoppscotch': '🧪',
  'delqhi': '🧠',
  'dashboard': '📊'
};

const INTEGRATION_SUBDOMAIN_MAP = {
  'n8n': 'n8n',
  'skyvern': 'skyvern',
  'steel': 'steel',
  'stagehand': 'stagehand',
  'vault': 'vault',
  'nocodb': 'nocodb',
  'supabase': 'supabase',
  'codeserver': 'codeserver',
  'survey': 'survey',
  'captcha': 'captcha',
  'rocketchat': 'chat',
  'video': 'video',
  'social': 'social',
  'research': 'research',
  'dashboard': 'dashboard'
};

const parseContainerName = (name) => {
  const cleanName = name.startsWith('/') ? name.slice(1) : name;
  
  const parts = cleanName.split('-');
  
  if (parts.length >= 4) {
    const categoryKey = parts[0];
    const integration = parts[2];
    const role = parts.slice(3).join(' ');
    const subdomain = INTEGRATION_SUBDOMAIN_MAP[integration] || null;
    
    return {
      name: `${integration.charAt(0).toUpperCase() + integration.slice(1)} ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      category: CATEGORY_MAP[categoryKey] || 'Other',
      icon: ICON_MAP[integration] || '📦',
      integration: integration,
      subdomain: subdomain
    };
  }
  
  // Fallback for non-compliant names
  return {
    name: cleanName,
    category: 'Other',
    icon: '📦',
    integration: cleanName,
    subdomain: null
  };
};

export default async function handler(req, res) {
  try {
    const containers = await docker.listContainers({ all: true });
    
    const services = containers.map(container => {
      const { name, category, icon, subdomain } = parseContainerName(container.Names[0]);
      
      const mainPort = container.Ports && container.Ports.length > 0 
        ? container.Ports.find(p => p.PublicPort)?.PublicPort || container.Ports[0].PrivatePort 
        : null;

      const isRunning = container.State === 'running';
      
      // Construct public URL using delqhi.com if mapped
      const publicUrl = subdomain ? `https://${subdomain}.delqhi.com` : null;

      return {
        name: name,
        status: isRunning ? 'healthy' : 'down',
        port: mainPort,
        publicUrl: publicUrl,
        icon: icon,
        category: category,
        lastChecked: new Date().toISOString(),
        containerId: container.Id.substring(0, 12),
        state: container.State,
        image: container.Image
      };
    });

    // Calculate summary
    const total = services.length;
    const healthy = services.filter(s => s.status === 'healthy').length;
    const categories = [...new Set(services.map(s => s.category))];

    res.status(200).json({
      services,
      summary: {
        total,
        healthy,
        unhealthy: total - healthy,
        categories: categories.map(cat => ({
          name: cat,
          count: services.filter(s => s.category === cat).length,
          healthy: services.filter(s => s.category === cat && s.status === 'healthy').length
        }))
      },
      timestamp: new Date().toISOString(),
      source: 'docker-socket'
    });

  } catch (error) {
    console.error('Docker API Error:', error);
    res.status(500).json({
      error: 'Failed to fetch Docker containers',
      details: error.message,
      hint: 'Ensure /var/run/docker.sock is mounted into the container.'
    });
  }
}
