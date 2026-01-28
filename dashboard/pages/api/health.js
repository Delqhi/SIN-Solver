export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    service: 'cockpit-dashboard',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
}
