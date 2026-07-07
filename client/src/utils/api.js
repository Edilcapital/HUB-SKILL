const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Skills
  getSkills: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/skills?${query}`);
  },
  getSkill: (name, lang = '') => request(`/skills/${encodeURIComponent(name)}${lang ? `?lang=${lang}` : ''}`),
  getSkillContent: (name, lang = '') => request(`/skills/${encodeURIComponent(name)}/content${lang ? `?lang=${lang}` : ''}`),
  searchSkills: (q, limit = 20) => request(`/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  // Categories
  getCategories: () => request('/categories'),

  // Projects
  getProjects: () => request('/projects'),
  addProject: (name, path) => request('/projects', {
    method: 'POST',
    body: JSON.stringify({ name, path }),
  }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  getProjectSkills: (id) => request(`/projects/${id}/skills`),

  // Install
  installSkill: (skillName, projectId) => request('/install', {
    method: 'POST',
    body: JSON.stringify({ skillName, projectId }),
  }),
  uninstallSkill: (skillName, projectId) => request(`/install/${encodeURIComponent(skillName)}/${projectId}`, {
    method: 'DELETE',
  }),

  // Sync
  triggerSync: () => request('/sync', { method: 'POST' }),
  getSyncStatus: () => request('/sync/status'),

  // Stats
  getStats: () => request('/stats'),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (settings) => request('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  }),
};
