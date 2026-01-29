import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { containerId, tail = 100 } = req.query;

  if (!containerId) {
    return res.status(400).json({ error: 'Missing containerId' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const container = docker.getContainer(containerId);
    const logStream = await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      tail: parseInt(tail),
      timestamps: true
    });

    logStream.on('data', (chunk) => {
      const content = chunk.toString('utf8', 8);
      res.write(`data: ${JSON.stringify({ log: content })}\n\n`);
    });

    logStream.on('error', (err) => {
      console.error('Log Stream Error:', err);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });

    req.on('close', () => {
      if (logStream.destroy) logStream.destroy();
    });

  } catch (error) {
    console.error('Docker Logs Error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}
