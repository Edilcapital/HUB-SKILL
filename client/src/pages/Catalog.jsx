import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Search, Filter, X, ChevronLeft, ChevronRight, Package, Bookmark } from 'lucide-react';
import { api } from '../utils/api';
import { useLanguage } from '../utils/LanguageContext';
import InstallModal from '../components/InstallModal';

export default function Catalog() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [skills, setSkills] = useState([]);
  
  const handleWatchToggle = async (e, skill) => {
    e.stopPropagation();
    try {
      if (skill.is_watched) {
        await api.unwatchSkill(skill.name);
      } else {
        await api.watchSkill(skill.name);
      }
      setSkills(prev => prev.map(s => s.name === skill.name ? { ...s, is_watched: s.is_watched ? 0 : 1 } : s));
    } catch (err) {
      console.error(err);
    }
  };
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [installSkill, setInstallSkill] = useState(null);
  const [expandedSkills, setExpandedSkills] = useState(new Set());
  const { t, language } = useLanguage();

  const toggleExpand = (name) => {
    setExpandedSkills(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const fetchSkills = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (search) params.search = search;
      if (selectedCategory) params.category = selectedCategory;
      const data = await api.getSkills(params);
      setSkills(data.skills);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory]);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    fetchSkills(1);
  }, [fetchSkills]);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = {};
    if (search) params.search = search;
    if (selectedCategory) params.category = selectedCategory;
    setSearchParams(params);
    fetchSkills(1);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSearchParams({});
  };

  const getCategoryColor = (categoryName) => {
    const cat = categories.find(c => c.name === categoryName);
    return cat?.color || '#6b7280';
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
            {t('cat_title')}
          </span>
        </h1>
        <p className="text-gray-400">
          {t('cat_desc', { count: pagination.total.toLocaleString() })}
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('cat_search_placeholder')}
              className="w-full px-4 py-3 pl-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-6 py-2.5 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-200 flex items-center gap-2 ${showFilters ? 'border-purple-500/50 text-purple-400' : ''}`}
          >
            <Filter className="w-4 h-4" />
            {t('cat_filters')}
          </button>
          <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg shadow-purple-500/25 active:scale-95">
            {t('cat_search_button')}
          </button>
        </div>
      </form>

      {/* Category Filters */}
      {showFilters && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-300">{t('cat_categories')}</h3>
            {selectedCategory && (
              <button onClick={clearFilters} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                <X className="w-3 h-3" /> {t('cat_clear')}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => {
                  const newCat = cat.name === selectedCategory ? '' : cat.name;
                  setSelectedCategory(newCat);
                  setSearchParams(newCat ? { category: newCat } : {});
                }}
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                  cat.name === selectedCategory ? 'ring-2 ring-offset-1 ring-offset-gray-900 scale-105' : 'opacity-80 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: `${cat.color}20`,
                  color: cat.color,
                  border: `1px solid ${cat.name === selectedCategory ? cat.color : 'transparent'}`,
                }}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Filters */}
      {(search || selectedCategory) && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-500">{t('cat_active_filters')}</span>
          {search && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-lg">
              &quot;{search}&quot;
              <X className="w-3 h-3 cursor-pointer" onClick={() => { setSearch(''); setSearchParams(selectedCategory ? { category: selectedCategory } : {}); }} />
            </span>
          )}
          {selectedCategory && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-pink-500/20 text-pink-300 text-xs rounded-lg">
              {selectedCategory}
              <X className="w-3 h-3 cursor-pointer" onClick={() => { setSelectedCategory(''); setSearchParams(search ? { search } : {}); }} />
            </span>
          )}
        </div>
      )}

      {/* Skills Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : skills.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">{t('cat_no_skills')}</p>
          <button onClick={clearFilters} className="mt-4 text-purple-400 hover:text-purple-300 text-sm">
            {t('cat_clear_all')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          {skills.map((skill) => (
            <div 
              key={skill.name} 
              onClick={() => navigate(`/skill/${encodeURIComponent(skill.name)}`)}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <Link to={`/skill/${encodeURIComponent(skill.name)}`} className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors truncate notranslate">
                      {skill.name}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <button
                      onClick={(e) => handleWatchToggle(e, skill)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-purple-500/20 text-gray-400 hover:text-purple-400 transition-colors focus:outline-none"
                      title={skill.is_watched ? t('cat_unwatch') : t('cat_watch')}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${skill.is_watched ? 'fill-purple-500 text-purple-500' : ''}`} />
                    </button>
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold notranslate"
                      style={{
                        backgroundColor: `${getCategoryColor(skill.category)}20`,
                        color: getCategoryColor(skill.category),
                      }}
                    >
                      {skill.category}
                    </span>
                  </div>
                </div>
                
                {/* Descrizione espandibile */}
                <div className="mb-3">
                  <p className={`text-xs text-gray-400 leading-relaxed ${expandedSkills.has(skill.name) ? '' : 'line-clamp-2'}`}>
                    {language === 'it' && skill.description_it ? skill.description_it : skill.description}
                  </p>
                  {(language === 'it' && skill.description_it ? skill.description_it : skill.description)?.length > 80 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleExpand(skill.name); }}
                      className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold mt-1 focus:outline-none"
                    >
                      {expandedSkills.has(skill.name) ? t('cat_show_less') : t('cat_show_more')}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto">
                <div className="flex flex-wrap gap-1">
                  {skill.tags?.split(',').slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-white/5 text-gray-500 rounded notranslate">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setInstallSkill(skill); }}
                  className="text-xs px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity font-medium"
                >
                  {t('cat_btn_install')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => fetchSkills(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-6 py-2.5 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-200 flex items-center gap-1 text-sm disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" /> {t('cat_prev')}
          </button>
          <span className="text-sm text-gray-400">
            {t('cat_page', { page: pagination.page, pages: pagination.pages })}
          </span>
          <button
            onClick={() => fetchSkills(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="px-6 py-2.5 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-200 flex items-center gap-1 text-sm disabled:opacity-30"
          >
            {t('cat_next')} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Install Modal */}
      {installSkill && (
        <InstallModal
          skill={installSkill}
          onClose={() => setInstallSkill(null)}
        />
      )}
    </div>
  );
}
