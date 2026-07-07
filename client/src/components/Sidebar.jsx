import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, FolderOpen, Settings, Sparkles, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { api } from '../utils/api';
import { useLanguage } from '../utils/LanguageContext';
import toast from 'react-hot-toast';

export default function Sidebar() {
  const [syncing, setSyncing] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api.triggerSync();
      if (result.success) {
        toast.success(t('sidebar_toast_sync_success', { count: result.total }));
      } else {
        toast.error(t('sidebar_toast_sync_failed', { error: result.error }));
      }
    } catch (err) {
      toast.error(t('sidebar_toast_sync_failed', { error: err.message }));
    } finally {
      setSyncing(false);
    }
  };

  const links = [
    { to: '/', icon: LayoutDashboard, label: t('sidebar_dashboard') },
    { to: '/catalog', icon: BookOpen, label: t('sidebar_catalog') },
    { to: '/projects', icon: FolderOpen, label: t('sidebar_projects') },
    { to: '/settings', icon: Settings, label: t('sidebar_settings') },
  ];

  return (
    <aside className="w-72 h-screen bg-gray-900/50 border-r border-white/5 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
              {t('sidebar_title')}
            </h1>
            <p className="text-xs text-gray-500">{t('sidebar_subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-white bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Language Switcher */}
      <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">Lingua / Language</span>
        <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5">
          <button
            onClick={() => setLanguage('it')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              language === 'it'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            IT
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              language === 'en'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            EN
          </button>
        </div>
      </div>

      {/* Sync Button */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl text-cyan-400 hover:from-cyan-500/30 hover:to-blue-500/30 transition-all duration-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">
            {syncing ? t('sidebar_syncing') : t('sidebar_sync_button')}
          </span>
        </button>
        <p className="text-xs text-gray-600 text-center mt-2">
          {t('sidebar_auto_sync_info')}
        </p>
      </div>
    </aside>
  );
}
