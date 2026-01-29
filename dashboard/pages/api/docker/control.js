import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { containerId, action } = req.body;

  if (!containerId || !action) {
    return res.status(400).json({ error: 'Missing containerId or action' });
  }

  try {
    const container = docker.getContainer(containerId);
    
    switch (action) {
      case 'start':
        await container.start();
        break;
      case 'stop':
        await container.stop();
        break;
      case 'restart':
        await container.restart();
        break;
      default:
        return res.status(400).json({ error: 'Invalid action. Use start, stop, or restart.' });
    }

    res.status(200).json({ message: `Container ${action}ed successfully`, containerId, action });
  } catch (error) {
    console.error(`Docker Control Error (${action}):`, error);
    res.status(500).json({ error: `Failed to ${action} container`, details: error.message });
  }
}
