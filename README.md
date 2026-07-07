# AI Skill Hub

> Personal skill manager for AI coding agents — browse, install, and manage 1,800+ skills from a beautiful web interface.

![License](https://img.shields.io/badge/license-MIT-purple)
![Skills](https://img.shields.io/badge/skills-1900%2B-pink)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Node.js-blue)

## Overview

AI Skill Hub is a local web application that serves as a personal skill store for AI coding agents like **Claude Code**, **Antigravity**, **Codex CLI**, **Gemini CLI**, and more. It fetches skills from the [antigravity-awesome-skills](https://github.com/sickn33/antigravity-awesome-skills) repository and lets you browse, search, and install them into your projects with one click.

### Features

- **Skill Catalog** — Browse 1,900+ skills with search, category filters, and color-coded cards
- **One-Click Install** — Select a project, click Install, done. The SKILL.md lands in your project's `.skills/` directory
- **Project Management** — Configure multiple project directories for easy skill installation
- **Weekly Auto-Sync** — Background job checks GitHub for new/updated skills every week
- **MCP Server** — Exposes `search_skills`, `recommend_skills`, `install_skill` tools for AI agents
- **Beautiful UI** — Dark theme with vibrant gradients and modern glass-morphism design

## Quick Start

### Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **npm** 9+

### Installation

```bash
# Clone or download this project
cd ai-skill-hub

# Install all dependencies (server + client + MCP)
npm run install:all

# Initial sync — fetches the skill catalog from GitHub
npm run sync

# Start the app (server + client)
npm run dev
```

Open **http://localhost:5173** in your browser.

### Production Build

```bash
# Build the frontend
npm run build

# Start in production mode (serves frontend from Express)
npm run start:server
```

Then open **http://localhost:3001**.

## Project Structure

```
ai-skill-hub/
├── server/           # Express API + SQLite database
│   ├── index.js      # Main server with all API routes
│   ├── db.js         # Database initialization
│   └── sync.js       # GitHub catalog sync logic
├── client/           # React frontend (Vite + Tailwind)
│   └── src/
│       ├── pages/    # Dashboard, Catalog, Projects, Settings, SkillDetail
│       ├── components/  # Sidebar, InstallModal
│       └── utils/    # API client
├── mcp-server/       # MCP server for AI agents
│   └── index.js      # MCP tools implementation
├── package.json      # Root scripts (dev, build, sync, etc.)
└── README.md
```

## Usage

### 1. Browse Skills

Go to **Skill Catalog** to browse all 1,900+ skills. Use the search bar to find skills by name, description, or tags. Click the **Filters** button to filter by category.

### 2. Configure Projects

Go to **Projects** and add your project directories:
- `~/Desktop/Antigravity`
- `~/Projects/my-app`
- Any directory where you want skills installed

### 3. Install Skills

Click **Install** on any skill card → select your target project → click **Install**. The skill's `SKILL.md` file is saved to:

```
your-project/.skills/skill-name/SKILL.md
```

Your AI coding agent will automatically discover and use the skill.

### 4. MCP Integration

The included MCP server lets AI agents search and install skills directly. Add it to your agent's MCP configuration:

#### Claude Code (`~/.claude/mcp.json`)

```json
{
  "mcpServers": {
    "skill-hub": {
      "command": "node",
      "args": ["/path/to/ai-skill-hub/mcp-server/index.js"]
    }
  }
}
```

#### Antigravity (`.antigravity/mcp.json`)

```json
{
  "mcpServers": {
    "skill-hub": {
      "command": "node",
      "args": ["/path/to/ai-skill-hub/mcp-server/index.js"]
    }
  }
}
```

#### Available MCP Tools

| Tool | Description |
|------|-------------|
| `search_skills(query)` | Search skills by keyword, technology, or description |
| `recommend_skills(project_description)` | Get skill recommendations based on what you're building |
| `install_skill(skill_name, project_path)` | Install a skill into a project directory |
| `list_categories()` | List all skill categories with counts |
| `get_skill_details(skill_name)` | Get full skill content and metadata |

### 5. Auto-Sync

Skills are automatically synced from GitHub every Sunday at 3:00 AM. You can also trigger a manual sync from the sidebar or the Settings page.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/skills` | List skills (supports `?search=`, `?category=`, `?page=`, `?limit=`) |
| GET | `/api/skills/:name` | Get skill metadata |
| GET | `/api/skills/:name/content` | Get SKILL.md content from GitHub |
| GET | `/api/categories` | List all categories |
| GET | `/api/search?q=` | Full-text search |
| GET | `/api/projects` | List configured projects |
| POST | `/api/projects` | Add a project `{ name, path }` |
| DELETE | `/api/projects/:id` | Remove a project |
| POST | `/api/install` | Install a skill `{ skillName, projectId }` |
| DELETE | `/api/install/:skillName/:projectId` | Uninstall a skill |
| POST | `/api/sync` | Trigger manual sync |
| GET | `/api/sync/status` | Get last sync info |
| GET | `/api/stats` | Dashboard statistics |
| GET/PUT | `/api/settings` | Read/update settings |

## Configuration

Settings are stored in the SQLite database and can be changed from the Settings page:

| Setting | Default | Description |
|---------|---------|-------------|
| `auto_sync_enabled` | `true` | Enable weekly auto-sync |
| `sync_interval_hours` | `168` | Sync interval (168h = 1 week) |
| `github_repo` | `sickn33/antigravity-awesome-skills` | Source repository |
| `github_branch` | `main` | Branch to sync from |

## Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS 4 + Lucide Icons
- **Backend**: Express.js + better-sqlite3 + node-cron
- **MCP**: @modelcontextprotocol/sdk (stdio transport)
- **Data**: SQLite database (auto-created on first run)

## License

MIT
