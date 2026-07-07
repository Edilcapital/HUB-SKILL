import fetch from 'node-fetch';
import db from './db.js';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';
const REPO = db.prepare("SELECT value FROM settings WHERE key = 'github_repo'").get()?.value || 'sickn33/antigravity-awesome-skills';
const BRANCH = db.prepare("SELECT value FROM settings WHERE key = 'github_branch'").get()?.value || 'main';

// Category colors for the UI
const CATEGORY_COLORS = {
  'architecture': '#6366f1',
  'automation': '#f59e0b',
  'backend': '#10b981',
  'cloud': '#3b82f6',
  'data': '#8b5cf6',
  'database': '#06b6d4',
  'deployment': '#ec4899',
  'design': '#f43f5e',
  'devops': '#14b8a6',
  'documentation': '#84cc16',
  'frontend': '#f97316',
  'general': '#6b7280',
  'marketing': '#e11d48',
  'mobile': '#a855f7',
  'monitoring': '#0ea5e9',
  'performance': '#eab308',
  'productivity': '#22c55e',
  'quality': '#7c3aed',
  'security': '#ef4444',
  'testing': '#2dd4bf',
  'workflow': '#fb923c',
  'ai': '#8b5cf6',
  'ml': '#7c3aed',
  'api': '#0891b2',
  'cms': '#d946ef',
  'ecommerce': '#f43f5e',
  'analytics': '#06b6d4',
  'communication': '#3b82f6',
  'integration': '#10b981',
};

function getColorForCategory(category) {
  return CATEGORY_COLORS[category.toLowerCase()] || '#6b7280';
}

/**
 * Parse the CATALOG.md file to extract skill data
 */
function parseCatalog(markdown) {
  const skills = [];
  let currentCategory = null;

  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match category headers like "## architecture (113)"
    const categoryMatch = line.match(/^## (.+?)\s*\((\d+)\)/);
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim();
      continue;
    }

    // Match table rows (skip header and separator)
    if (line.startsWith('|') && currentCategory && !line.includes('---') && !line.startsWith('| Skill')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length >= 3) {
        const name = cells[0].replace(/`/g, '').trim();
        const description = cells[1].trim();
        const tags = cells[2].trim();
        const triggers = cells.length > 3 ? cells[3].trim() : '';

        if (name && name !== 'Skill') {
          skills.push({
            name,
            description,
            category: currentCategory,
            tags,
            triggers,
            skill_md_url: `${GITHUB_RAW_BASE}/${REPO}/${BRANCH}/skills/${name}/SKILL.md`
          });
        }
      }
    }
  }

  return skills;
}

/**
 * Sync skills from GitHub
 */
export async function syncSkills() {
  console.log('🔄 Starting skill sync from GitHub...');
  const catalogUrl = `${GITHUB_RAW_BASE}/${REPO}/${BRANCH}/CATALOG.md`;

  try {
    const response = await fetch(catalogUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch catalog: ${response.status} ${response.statusText}`);
    }

    const markdown = await response.text();
    const skills = parseCatalog(markdown);

    console.log(`📦 Parsed ${skills.length} skills from catalog`);

    // Get existing skill count
    const existingCount = db.prepare('SELECT COUNT(*) as count FROM skills').get().count;

    // Upsert skills
    const upsert = db.prepare(`
      INSERT INTO skills (name, description, category, tags, triggers, skill_md_url, last_updated)
      VALUES (@name, @description, @category, @tags, @triggers, @skill_md_url, datetime('now'))
      ON CONFLICT(name) DO UPDATE SET
        description = @description,
        category = @category,
        tags = @tags,
        triggers = @triggers,
        skill_md_url = @skill_md_url,
        last_updated = datetime('now')
    `);

    const insertMany = db.transaction((skills) => {
      for (const skill of skills) {
        upsert.run(skill);
      }
    });

    insertMany(skills);

    // Update categories
    const categories = [...new Set(skills.map(s => s.category))].filter(Boolean);
    const upsertCategory = db.prepare(`
      INSERT INTO categories (name, count, color)
      VALUES (?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET count = ?, color = ?
    `);

    for (const cat of categories) {
      const count = skills.filter(s => s.category === cat).length;
      const color = getColorForCategory(cat);
      upsertCategory.run(cat, count, color, count, color);
    }

    // Log sync
    const newSkills = skills.length - existingCount;
    db.prepare(`
      INSERT INTO sync_log (skills_count, new_skills, updated_skills)
      VALUES (?, ?, ?)
    `).run(skills.length, Math.max(0, newSkills), skills.length);

    console.log(`✅ Sync complete! ${skills.length} skills indexed, ${Math.max(0, newSkills)} new.`);
    return { success: true, total: skills.length, new: Math.max(0, newSkills) };
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run directly if called as script
if (process.argv[1] && process.argv[1].endsWith('sync.js')) {
  syncSkills().then(result => {
    console.log('Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}
