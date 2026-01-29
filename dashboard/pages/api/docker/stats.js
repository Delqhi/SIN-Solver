import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const containers = await docker.listContainers({ all: false });
    
    const statsPromises = containers.map(async (containerInfo) => {
      const container = docker.getContainer(containerInfo.Id);
      const stats = await container.stats({ stream: false });
      
      let cpuPercent = 0;
      if (stats.precpu_stats && stats.precpu_stats.cpu_usage) {
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
        const onlineCpus = stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;
        
        if (systemDelta > 0 && cpuDelta > 0) {
          cpuPercent = (cpuDelta / systemDelta) * onlineCpus * 100.0;
        }
      }

      const memUsage = stats.memory_stats.usage || 0;
      const memLimit = stats.memory_stats.limit || 0;
      const memPercent = memLimit > 0 ? (memUsage / memLimit) * 100.0 : 0;

      return {
        id: containerInfo.Id.substring(0, 12),
        name: containerInfo.Names[0].replace(/^\//, ''),
        cpu: cpuPercent.toFixed(2),
        memory: {
          usage: memUsage,
          limit: memLimit,
          percent: memPercent.toFixed(2)
        }
      };
    });

    const allStats = await Promise.all(statsPromises);
    
    res.status(200).json(allStats);
  } catch (error) {
    console.error('Docker Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch container stats', details: error.message });
  }
}
