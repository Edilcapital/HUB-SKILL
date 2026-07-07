#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Database from 'better-sqlite3';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'server', 'skills.db');

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
  console.error('Database not found. Please run "npm run sync" first to populate the skill catalog.');
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });

// Create MCP Server
const server = new Server(
  {
    name: 'ai-skill-hub',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_skills',
        description: 'Search the AI skill catalog by keyword, category, or description. Returns matching skills with their metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query - can be a keyword, technology name, or description of what you need',
            },
            category: {
              type: 'string',
              description: 'Optional: filter by category (e.g., "frontend", "backend", "devops", "testing", "security")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'recommend_skills',
        description: 'Get skill recommendations based on a project description or task. Analyzes the description and suggests relevant skills.',
        inputSchema: {
          type: 'object',
          properties: {
            project_description: {
              type: 'string',
              description: 'Description of the project or task you need help with',
            },
            max_recommendations: {
              type: 'number',
              description: 'Maximum number of recommendations (default: 5)',
            },
          },
          required: ['project_description'],
        },
      },
      {
        name: 'install_skill',
        description: 'Install a skill (SKILL.md file) into a project directory. Creates a .skills/<skill-name>/SKILL.md file in the target project.',
        inputSchema: {
          type: 'object',
          properties: {
            skill_name: {
              type: 'string',
              description: 'The exact name of the skill to install (as shown in search results)',
            },
            project_path: {
              type: 'string',
              description: 'Absolute path to the project directory where the skill should be installed',
            },
          },
          required: ['skill_name', 'project_path'],
        },
      },
      {
        name: 'list_categories',
        description: 'List all available skill categories with their skill counts.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_skill_details',
        description: 'Get detailed information about a specific skill, including its full SKILL.md content.',
        inputSchema: {
          type: 'object',
          properties: {
            skill_name: {
              type: 'string',
              description: 'The exact name of the skill',
            },
          },
          required: ['skill_name'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'search_skills': {
      const { query, category, limit = 10 } = args;
      let sql = `
        SELECT name, description, category, tags FROM skills
        WHERE (name LIKE ? OR description LIKE ? OR tags LIKE ? OR triggers LIKE ?)
      `;
      const params = [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`];

      if (category) {
        sql += ' AND category = ?';
        params.push(category);
      }

      sql += ` ORDER BY
        CASE
          WHEN name LIKE ? THEN 1
          WHEN tags LIKE ? THEN 2
          WHEN description LIKE ? THEN 3
          ELSE 4
        END
        LIMIT ?`;
      params.push(`%${query}%`, `%${query}%`, `%${query}%`, limit);

      const results = db.prepare(sql).all(...params);

      if (results.length === 0) {
        return {
          content: [{ type: 'text', text: `No skills found matching "${query}". Try a different search term or browse categories with list_categories.` }],
        };
      }

      const formatted = results.map((s, i) =>
        `${i + 1}. **${s.name}** [${s.category}]\n   ${s.description}\n   Tags: ${s.tags}`
      ).join('\n\n');

      return {
        content: [{ type: 'text', text: `Found ${results.length} skills matching "${query}":\n\n${formatted}` }],
      };
    }

    case 'recommend_skills': {
      const { project_description, max_recommendations = 5 } = args;

      // Extract keywords from the description
      const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'and', 'but', 'if', 'or', 'because', 'not', 'no', 'nor', 'so', 'very', 'just', 'than', 'too', 'also', 'want', 'like', 'help', 'work', 'working', 'project', 'build', 'building', 'create', 'creating', 'make', 'making', 'use', 'using']);

      const keywords = project_description
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));

      // Score skills based on keyword matches
      const allSkills = db.prepare('SELECT name, description, category, tags, triggers FROM skills').all();
      const scored = allSkills.map(skill => {
        const text = `${skill.name} ${skill.description} ${skill.tags} ${skill.triggers}`.toLowerCase();
        let score = 0;
        for (const keyword of keywords) {
          if (text.includes(keyword)) {
            // Higher score for name/tag matches
            if (skill.name.toLowerCase().includes(keyword)) score += 3;
            else if (skill.tags?.toLowerCase().includes(keyword)) score += 2;
            else score += 1;
          }
        }
        return { ...skill, score };
      });

      const recommendations = scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, max_recommendations);

      if (recommendations.length === 0) {
        return {
          content: [{ type: 'text', text: `No relevant skills found for: "${project_description}". Try describing your task differently or search for specific technologies.` }],
        };
      }

      const formatted = recommendations.map((s, i) =>
        `${i + 1}. **${s.name}** [${s.category}] (relevance: ${s.score})\n   ${s.description}\n   Tags: ${s.tags}`
      ).join('\n\n');

      return {
        content: [{ type: 'text', text: `Recommended skills for your project:\n\n${formatted}\n\nTo install a skill, use: install_skill(skill_name, project_path)` }],
      };
    }

    case 'install_skill': {
      const { skill_name, project_path } = args;

      const skill = db.prepare('SELECT * FROM skills WHERE name = ?').get(skill_name);
      if (!skill) {
        return {
          content: [{ type: 'text', text: `Skill "${skill_name}" not found. Use search_skills to find the correct name.` }],
          isError: true,
        };
      }

      const expandedPath = project_path.replace(/^~/, process.env.HOME || '/home/ubuntu');

      if (!fs.existsSync(expandedPath)) {
        return {
          content: [{ type: 'text', text: `Project path "${expandedPath}" does not exist.` }],
          isError: true,
        };
      }

      try {
        // Fetch SKILL.md content
        const response = await fetch(skill.skill_md_url);
        if (!response.ok) {
          throw new Error(`Failed to fetch skill content: ${response.status}`);
        }
        const content = await response.text();

        // Create skills directory
        const skillsDir = path.join(expandedPath, '.skills', skill_name);
        fs.mkdirSync(skillsDir, { recursive: true });

        // Write SKILL.md
        const skillPath = path.join(skillsDir, 'SKILL.md');
        fs.writeFileSync(skillPath, content, 'utf-8');

        return {
          content: [{ type: 'text', text: `✅ Successfully installed skill "${skill_name}" to:\n${skillPath}\n\nThe skill is now available in your project's .skills directory.` }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Failed to install skill: ${error.message}` }],
          isError: true,
        };
      }
    }

    case 'list_categories': {
      const categories = db.prepare('SELECT name, count FROM categories ORDER BY count DESC').all();
      const formatted = categories.map(c => `- **${c.name}** (${c.count} skills)`).join('\n');
      return {
        content: [{ type: 'text', text: `Available skill categories:\n\n${formatted}\n\nTotal: ${categories.reduce((sum, c) => sum + c.count, 0)} skills across ${categories.length} categories.` }],
      };
    }

    case 'get_skill_details': {
      const { skill_name } = args;
      const skill = db.prepare('SELECT * FROM skills WHERE name = ?').get(skill_name);

      if (!skill) {
        return {
          content: [{ type: 'text', text: `Skill "${skill_name}" not found.` }],
          isError: true,
        };
      }

      try {
        const response = await fetch(skill.skill_md_url);
        const content = response.ok ? await response.text() : '(Content not available)';

        return {
          content: [{
            type: 'text',
            text: `# ${skill.name}\n\n**Category:** ${skill.category}\n**Tags:** ${skill.tags}\n**Description:** ${skill.description}\n\n---\n\n${content}`
          }],
        };
      } catch {
        return {
          content: [{
            type: 'text',
            text: `# ${skill.name}\n\n**Category:** ${skill.category}\n**Tags:** ${skill.tags}\n**Description:** ${skill.description}\n\n(Full content not available offline)`
          }],
        };
      }
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AI Skill Hub MCP Server running on stdio');
}

main().catch(console.error);
