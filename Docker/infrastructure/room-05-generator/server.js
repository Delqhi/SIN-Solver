const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8205;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'video-generator', uptime: process.uptime() });
});

app.post('/generate', (req, res) => {
  const { images, output, duration = 5 } = req.body;
  
  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: 'Images array required' });
  }

  res.json({
    status: 'processing',
    message: 'Video generation started',
    images: images.length,
    output: output || 'output.mp4'
  });
});

app.get('/status', (req, res) => {
  exec('ffmpeg -version | head -1', (error, stdout) => {
    res.json({
      ffmpeg: error ? 'not available' : stdout.trim(),
      status: 'ready'
    });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Video Generator MCP Server running on port ${PORT}`);
});