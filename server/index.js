import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './db.js';
import { syncSkills } from './sync.js';
import { startBackgroundTranslation, translateText, translateMarkdown } from './translator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Start the background translation worker
startBackgroundTranslation(db);


// Serve static frontend in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

// ============ SKILLS API ============

// Get all skills with optional filters
app.get('/api/skills', (req, res) => {
  const { search, category, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = 'SELECT * FROM skills WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as total FROM skills WHERE 1=1';
  const params = [];
  const countParams = [];

  if (search) {
    const searchClause = ' AND (name LIKE ? OR description LIKE ? OR tags LIKE ?)';
    query += searchClause;
    countQuery += searchClause;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
    countParams.push(searchTerm, searchTerm, searchTerm);
  }

  if (category) {
    query += ' AND category = ?';
    countQuery += ' AND category = ?';
    params.push(category);
    countParams.push(category);
  }

  query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const skills = db.prepare(query).all(...params);
  const { total } = db.prepare(countQuery).get(...countParams);

  res.json({
    skills,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

// Get single skill details
app.get('/api/skills/:name', async (req, res) => {
  const { lang } = req.query;
  let skill = db.prepare('SELECT * FROM skills WHERE name = ?').get(req.params.name);
  if (!skill) {
    return res.status(404).json({ error: 'Skill not found' });
  }

  // Se è richiesta la traduzione in italiano e non è ancora disponibile nel DB, la facciamo al volo
  if (lang === 'it' && (!skill.description_it || skill.description_it.trim() === '')) {
    try {
      const translated = await translateText(skill.description, 'it');
      db.prepare('UPDATE skills SET description_it = ? WHERE name = ?').run(translated, skill.name);
      skill.description_it = translated;
    } catch (e) {
      console.error('On-demand description translation failed:', e);
    }
  }

  res.json(skill);
});

// Get skill SKILL.md content from GitHub (with optional IT translation)
app.get('/api/skills/:name/content', async (req, res) => {
  const { lang } = req.query;
  const skill = db.prepare('SELECT * FROM skills WHERE name = ?').get(req.params.name);
  if (!skill) {
    return res.status(404).json({ error: 'Skill not found' });
  }

  // Se è richiesta la lingua italiana e abbiamo già la traduzione cacheata
  if (lang === 'it' && skill.content_it && skill.content_it.trim() !== '') {
    return res.json({ content: skill.content_it, url: skill.skill_md_url, isTranslated: true });
  }

  try {
    const response = await fetch(skill.skill_md_url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    const content = await response.text();

    // Se l'utente vuole l'italiano e non è ancora cacheato, lo traduciamo al volo e lo salviamo nel DB
    if (lang === 'it') {
      try {
        const translatedContent = await translateMarkdown(content, 'it');
        db.prepare('UPDATE skills SET content_it = ? WHERE name = ?').run(translatedContent, skill.name);
        return res.json({ content: translatedContent, url: skill.skill_md_url, isTranslated: true });
      } catch (translationErr) {
        console.error('Markdown translation failed, falling back to English:', translationErr);
        return res.json({ content, url: skill.skill_md_url, isTranslated: false, translationError: true });
      }
    }

    res.json({ content, url: skill.skill_md_url });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch skill content', details: error.message });
  }
});


// ============ CATEGORIES API ============

app.get('/api/categories', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY count DESC').all();
  res.json(categories);
});

// ============ PROJECTS API ============

// Get all configured projects
app.get('/api/projects', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY name ASC').all();
  // Check which paths still exist
  const enriched = projects.map(p => ({
    ...p,
    exists: fs.existsSync(p.path)
  }));
  res.json(enriched);
});

// Add a project directory
app.post('/api/projects', (req, res) => {
  const { name, path: projectPath } = req.body;
  if (!name || !projectPath) {
    return res.status(400).json({ error: 'Name and path are required' });
  }

  const expandedPath = projectPath.replace(/^~/, process.env.HOME || '/home/ubuntu');

  try {
    db.prepare('INSERT INTO projects (name, path) VALUES (?, ?)').run(name, expandedPath);
    const project = db.prepare('SELECT * FROM projects WHERE path = ?').get(expandedPath);
    res.json(project);
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Project path already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Remove a project
app.delete('/api/projects/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ============ INSTALL API ============

// Install a skill into a project
app.post('/api/install', async (req, res) => {
  const { skillName, projectId } = req.body;

  if (!skillName || !projectId) {
    return res.status(400).json({ error: 'skillName and projectId are required' });
  }

  const skill = db.prepare('SELECT * FROM skills WHERE name = ?').get(skillName);
  if (!skill) {
    return res.status(404).json({ error: 'Skill not found' });
  }

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (!fs.existsSync(project.path)) {
    return res.status(400).json({ error: 'Project directory does not exist' });
  }

  try {
    // Fetch SKILL.md content
    const response = await fetch(skill.skill_md_url);
    if (!response.ok) {
      throw new Error(`Failed to fetch skill: ${response.status}`);
    }
    const content = await response.text();

    // Create skills directory in project if it doesn't exist
    const skillsDir = path.join(project.path, '.skills', skillName);
    fs.mkdirSync(skillsDir, { recursive: true });

    // Write SKILL.md
    const skillPath = path.join(skillsDir, 'SKILL.md');
    fs.writeFileSync(skillPath, content, 'utf-8');

    // Record installation
    db.prepare(`
      INSERT OR REPLACE INTO installed_skills (skill_name, project_id, installed_at)
      VALUES (?, ?, datetime('now'))
    `).run(skillName, projectId);

    res.json({
      success: true,
      message: `Skill "${skillName}" installed to ${project.name}`,
      path: skillPath
    });
  } catch (error) {
    res.status(500).json({ error: 'Installation failed', details: error.message });
  }
});

// Get installed skills for a project
app.get('/api/projects/:id/skills', (req, res) => {
  const installed = db.prepare(`
    SELECT is2.*, s.description, s.category, s.tags
    FROM installed_skills is2
    LEFT JOIN skills s ON s.name = is2.skill_name
    WHERE is2.project_id = ?
    ORDER BY is2.installed_at DESC
  `).all(req.params.id);
  res.json(installed);
});

// Uninstall a skill from a project
app.delete('/api/install/:skillName/:projectId', (req, res) => {
  const { skillName, projectId } = req.params;

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (project) {
    const skillPath = path.join(project.path, '.skills', skillName);
    if (fs.existsSync(skillPath)) {
      fs.rmSync(skillPath, { recursive: true });
    }
  }

  db.prepare('DELETE FROM installed_skills WHERE skill_name = ? AND project_id = ?').run(skillName, parseInt(projectId));
  res.json({ success: true });
});

// ============ SYNC API ============

app.post('/api/sync', async (req, res) => {
  const result = await syncSkills();
  res.json(result);
});

app.get('/api/sync/status', (req, res) => {
  const lastSync = db.prepare('SELECT * FROM sync_log ORDER BY synced_at DESC LIMIT 1').get();
  const totalSkills = db.prepare('SELECT COUNT(*) as count FROM skills').get().count;
  res.json({ lastSync, totalSkills });
});

// ============ SETTINGS API ============

app.get('/api/settings', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings').all();
  const obj = {};
  settings.forEach(s => { obj[s.key] = s.value; });
  res.json(obj);
});

app.put('/api/settings', (req, res) => {
  const updates = req.body;
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const transaction = db.transaction((entries) => {
    for (const [key, value] of entries) {
      upsert.run(key, String(value));
    }
  });
  transaction(Object.entries(updates));
  res.json({ success: true });
});

// ============ STATS API ============

app.get('/api/stats', (req, res) => {
  const totalSkills = db.prepare('SELECT COUNT(*) as count FROM skills').get().count;
  const totalCategories = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  const totalProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
  const totalInstalled = db.prepare('SELECT COUNT(*) as count FROM installed_skills').get().count;
  const lastSync = db.prepare('SELECT synced_at FROM sync_log ORDER BY synced_at DESC LIMIT 1').get();
  const topCategories = db.prepare('SELECT * FROM categories ORDER BY count DESC LIMIT 10').all();

  res.json({
    totalSkills,
    totalCategories,
    totalProjects,
    totalInstalled,
    lastSync: lastSync?.synced_at,
    topCategories
  });
});

// ============ SEARCH (for MCP compatibility) ============

app.get('/api/search', (req, res) => {
  const { q, limit = 20 } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  const skills = db.prepare(`
    SELECT * FROM skills
    WHERE name LIKE ? OR description LIKE ? OR tags LIKE ? OR triggers LIKE ?
    ORDER BY
      CASE
        WHEN name LIKE ? THEN 1
        WHEN tags LIKE ? THEN 2
        WHEN description LIKE ? THEN 3
        ELSE 4
      END
    LIMIT ?
  `).all(
    `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`,
    `%${q}%`, `%${q}%`, `%${q}%`,
    parseInt(limit)
  );

  res.json(skills);
});

// ============ SPA FALLBACK ============

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  const indexPath = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('AI Skill Hub API running. Build the client with: cd client && npm run build');
  }
});

// ============ CRON: Weekly Sync ============

// Run sync every Sunday at 3:00 AM
cron.schedule('0 3 * * 0', async () => {
  const autoSync = db.prepare("SELECT value FROM settings WHERE key = 'auto_sync_enabled'").get();
  if (autoSync?.value === 'true') {
    console.log('⏰ Running scheduled weekly sync...');
    await syncSkills();
  }
});

// ============ START SERVER ============

app.listen(PORT, () => {
  console.log(`🚀 AI Skill Hub server running on http://localhost:${PORT}`);
  console.log(`📚 API available at http://localhost:${PORT}/api`);
});
