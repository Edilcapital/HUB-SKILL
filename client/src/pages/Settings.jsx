import { useEffect, useState } from 'react';
import { RefreshCw, GitBranch, Clock, Terminal } from 'lucide-react';
import { api } from '../utils/api';
import { useLanguage } from '../utils/LanguageContext';
import toast from 'react-hot-toast';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    Promise.all([
      api.getSettings(),
      api.getSyncStatus(),
    ]).then(([settingsData, statusData]) => {
      setSettings(settingsData);
      setSyncStatus(statusData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      await api.updateSettings(settings);
      toast.success(t('sett_toast_saved'));
    } catch (err) {
      toast.error(t('sett_toast_save_failed', { error: err.message }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
            {t('sett_title')}
          </span>
        </h1>
        <p className="text-gray-400">{t('sett_desc')}</p>
      </div>

      {/* Sync Settings */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-cyan-400" />
          {t('sett_sync_title')}
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('sett_auto_sync')}</p>
              <p className="text-xs text-gray-500">{t('sett_auto_sync_desc')}</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, auto_sync_enabled: settings.auto_sync_enabled === 'true' ? 'false' : 'true' })}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                settings.auto_sync_enabled === 'true' ? 'bg-purple-500' : 'bg-gray-700'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform duration-200 ${
                settings.auto_sync_enabled === 'true' ? 'left-6.5' : 'left-0.5'
              }`} style={{ left: settings.auto_sync_enabled === 'true' ? '26px' : '2px' }} />
            </button>
          </div>

          {syncStatus && (
            <div className="p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-400">
                  {t('sett_last_sync', {
                    time: syncStatus.lastSync ? new Date(syncStatus.lastSync.synced_at).toLocaleString() : t('sett_never')
                  })}
                </span>
              </div>
              {syncStatus.totalSkills > 0 && (
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  {t('sett_skills_in_catalog', { count: syncStatus.totalSkills })}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* GitHub Settings */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-gray-400" />
          {t('sett_github_title')}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t('sett_repo')}</label>
            <input
              type="text"
              value={settings.github_repo || ''}
              onChange={(e) => setSettings({ ...settings, github_repo: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t('sett_branch')}</label>
            <input
              type="text"
              value={settings.github_branch || ''}
              onChange={(e) => setSettings({ ...settings, github_branch: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {/* MCP Server Info */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          {t('sett_mcp_title')}
        </h2>
        <p className="text-sm text-gray-400 mb-4">{t('sett_mcp_desc')}</p>
        <div className="bg-black/40 rounded-xl p-4 font-mono text-sm">
          <p className="text-gray-500 mb-2">{t('sett_mcp_info')}</p>
          <pre className="text-emerald-400 whitespace-pre-wrap">{`{
  "mcpServers": {
    "skill-hub": {
      "command": "node",
      "args": ["/Users/adrianomontresor/Desktop/ANTIGRAVITY/GESTIONE SKILL ( in locale)/ai-skill-hub/mcp-server/index.js"]
    }
  }
}`}</pre>
        </div>
        <p className="text-xs text-gray-500 mt-3">{t('sett_mcp_tools')}</p>
      </div>

      {/* Save */}
      <button onClick={handleSave} className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg shadow-purple-500/25 active:scale-95">
        {t('sett_btn_save')}
      </button>
    </div>
  );
}
