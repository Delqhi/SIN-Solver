import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { file } = req.query;

  // Whitelist allowed files for security
  const ALLOWED_FILES = ['AGENTS.md', 'lastchanges.md', 'userprompts.md'];
  
  if (!ALLOWED_FILES.includes(file)) {
    return res.status(403).json({ error: 'File access forbidden' });
  }

  // Determine path relative to project root (assuming dashboard is in /dashboard and docs in root)
  // Dashboard is at /Users/jeremy/dev/SIN-Solver/dashboard
  // Docs are at /Users/jeremy/dev/SIN-Solver/
  const filePath = path.join(process.cwd(), '..', file);

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `File ${file} not found` });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    res.status(200).json({ content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
