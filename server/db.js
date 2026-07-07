import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'skills.db');
const DEFAULT_DB_PATH = path.join(__dirname, 'skills.db');

// Se il DB_PATH configurato non esiste, copia il database locale pre-popolato
if (DB_PATH !== DEFAULT_DB_PATH && !fs.existsSync(DB_PATH)) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(DEFAULT_DB_PATH)) {
      console.log(`📦 Copio il database iniziale da ${DEFAULT_DB_PATH} a ${DB_PATH}...`);
      fs.copyFileSync(DEFAULT_DB_PATH, DB_PATH);
      console.log('✅ Database iniziale copiato con successo.');
    }
  } catch (err) {
    console.error('❌ Errore durante la copia del database iniziale:', err);
  }
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT,
    tags TEXT,
    triggers TEXT,
    source TEXT,
    source_repo TEXT,
    source_type TEXT,
    date_added TEXT,
    license TEXT,
    risk TEXT,
    last_updated TEXT DEFAULT (datetime('now')),
    skill_md_url TEXT
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    count INTEGER DEFAULT 0,
    color TEXT
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT UNIQUE NOT NULL,
    added_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS installed_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_name TEXT NOT NULL,
    project_id INTEGER NOT NULL,
    installed_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    UNIQUE(skill_name, project_id)
  );

  CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    synced_at TEXT DEFAULT (datetime('now')),
    skills_count INTEGER,
    new_skills INTEGER DEFAULT 0,
    updated_skills INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
  CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
`);

// Insert default settings
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
insertSetting.run('auto_sync_enabled', 'true');
insertSetting.run('sync_interval_hours', '168'); // weekly = 168 hours
insertSetting.run('github_repo', 'sickn33/antigravity-awesome-skills');
insertSetting.run('github_branch', 'main');

// Safely add translation columns if they don't exist
try {
  db.exec('ALTER TABLE skills ADD COLUMN description_it TEXT;');
} catch (e) {
  // Column might already exist
}

try {
  db.exec('ALTER TABLE skills ADD COLUMN content_it TEXT;');
} catch (e) {
  // Column might already exist
}

export default db;

