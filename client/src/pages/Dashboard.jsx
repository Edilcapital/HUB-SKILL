import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FolderOpen, Download, Clock, TrendingUp, Zap } from 'lucide-react';
import { api } from '../utils/api';
import { useLanguage } from '../utils/LanguageContext';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    api.getStats().then(data => {
      setStats(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      label: t('db_total_skills'),
      value: stats?.totalSkills || 0,
      icon: BookOpen,
      gradient: 'from-purple-500 to-indigo-500',
      bgGradient: 'from-purple-500/10 to-indigo-500/10',
    },
    {
      label: t('db_categories'),
      value: stats?.totalCategories || 0,
      icon: TrendingUp,
      gradient: 'from-pink-500 to-rose-500',
      bgGradient: 'from-pink-500/10 to-rose-500/10',
    },
    {
      label: t('db_projects'),
      value: stats?.totalProjects || 0,
      icon: FolderOpen,
      gradient: 'from-cyan-500 to-blue-500',
      bgGradient: 'from-cyan-500/10 to-blue-500/10',
    },
    {
      label: t('db_installed'),
      value: stats?.totalInstalled || 0,
      icon: Download,
      gradient: 'from-emerald-500 to-teal-500',
      bgGradient: 'from-emerald-500/10 to-teal-500/10',
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {t('db_welcome')}{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
            AI Skill Hub
          </span>
        </h1>
        <p className="text-gray-400">{t('db_desc')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, gradient, bgGradient }) => (
          <div key={label} className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 bg-gradient-to-br ${bgGradient}`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
            <p className="text-sm text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions + Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            {t('db_quick_actions')}
          </h2>
          <div className="space-y-3">
            <Link
              to="/catalog"
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('db_browse_catalog')}</p>
                <p className="text-xs text-gray-500">{t('db_browse_desc', { count: stats?.totalSkills || 0 })}</p>
              </div>
            </Link>
            <Link
              to="/projects"
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <FolderOpen className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('db_manage_projects')}</p>
                <p className="text-xs text-gray-500">{t('db_projects_desc')}</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Top Categories */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            {t('db_top_categories')}
          </h2>
          <div className="space-y-2">
            {stats?.topCategories?.slice(0, 7).map((cat) => (
              <Link
                key={cat.name}
                to={`/catalog?category=${cat.name}`}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-sm capitalize">{cat.name}</span>
                </div>
                <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                  {cat.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Last Sync */}
      {stats?.lastSync && (
        <div className="mt-6 flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{t('db_last_synced', { time: new Date(stats.lastSync).toLocaleString() })}</span>
        </div>
      )}
    </div>
  );
}
