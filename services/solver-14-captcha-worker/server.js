const http = require('http');
const port = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  const response = {
    service: 'worker',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    path: req.url
  };
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(response, null, 2));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`worker service running on port ${port}`);
});
