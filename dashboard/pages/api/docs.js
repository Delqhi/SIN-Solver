import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const docsRoot = path.join(process.cwd(), 'docs');
  const { doc } = req.query;

  if (doc) {
    let safePath = doc.replace(/\.\./g, '');
    let fullPath = path.join(docsRoot, safePath);
    
    if (!fullPath.endsWith('.md')) {
        if (fs.existsSync(fullPath + '.md')) {
            fullPath += '.md';
        } else if (fs.existsSync(path.join(fullPath, 'index.md'))) {
            fullPath = path.join(fullPath, 'index.md');
        } else if (fs.existsSync(path.join(fullPath, 'README.md'))) {
            fullPath = path.join(fullPath, 'README.md');
        }
    }

    if (!fullPath.startsWith(docsRoot)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const content = fs.readFileSync(fullPath, 'utf8');
      return res.status(200).json({ content });
    } else {
       return res.status(404).json({ error: 'File not found' });
    }
  }

  const structure = {
    developer: getFiles(path.join(docsRoot, 'developer'), 'developer'),
    user: getFiles(path.join(docsRoot, 'user'), 'user'),
    agents: getFiles(path.join(docsRoot, 'agents'), 'agents')
  };

  res.status(200).json(structure);
}

function getFiles(dir, relativePath) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      const children = getFiles(path.join(dir, item.name), `${relativePath}/${item.name}`);
      results.push(...children);
    } else if (item.name.endsWith('.md')) {
      results.push({
        title: formatTitle(item.name),
        path: `${relativePath}/${item.name.replace('.md', '')}`,
        fileName: item.name
      });
    }
  }
  return results.sort((a, b) => a.title.localeCompare(b.title));
}

function formatTitle(filename) {
  return filename.replace('.md', '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
