import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, ExternalLink, Tag, Shield, Calendar } from 'lucide-react';
import { api } from '../utils/api';
import { useLanguage } from '../utils/LanguageContext';
import InstallModal from '../components/InstallModal';
import { Marked } from 'marked';

const markedInstance = new Marked();
markedInstance.use({
  renderer: {
    link({ href, title, text }) {
      return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    }
  }
});


export default function SkillDetail() {
  const { name } = useParams();
  const [skill, setSkill] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const { t, language } = useLanguage();
  
  // Impostiamo come visualizzazione predefinita del documento la lingua corrente dell'app
  const [viewLang, setViewLang] = useState(() => {
    return localStorage.getItem('lang') || 'it';
  });

  // Ricarica la lingua del documento se cambia la lingua globale
  useEffect(() => {
    setViewLang(language);
  }, [language]);

  // Recupera i dettagli della skill (inclusa la descrizione tradotta)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const skillData = await api.getSkill(decodeURIComponent(name), language);
        setSkill(skillData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [name, language]);

  // Recupera il contenuto di SKILL.md (tradotto al volo se viewLang === 'it')
  useEffect(() => {
    const fetchContent = async () => {
      setContentLoading(true);
      try {
        const contentData = await api.getSkillContent(decodeURIComponent(name), viewLang);
        setContent(contentData.content);
      } catch (err) {
        console.error(err);
        setContent('');
      } finally {
        setContentLoading(false);
      }
    };
    fetchContent();
  }, [name, viewLang]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400">{t('det_not_found')}</p>
        <Link to="/catalog" className="text-purple-400 hover:text-purple-300 mt-4 inline-block">
          {t('det_back')}
        </Link>
      </div>
    );
  }

  // Parse frontmatter from content
  const frontmatter = {};
  if (content && content.startsWith('---')) {
    const endIdx = content.indexOf('---', 3);
    if (endIdx > 0) {
      const fm = content.substring(3, endIdx);
      fm.split('\n').forEach(line => {
        const [key, ...vals] = line.split(':');
        if (key && vals.length) {
          frontmatter[key.trim()] = vals.join(':').trim();
        }
      });
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Back */}
      <Link to="/catalog" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {t('det_back')}
      </Link>

      {/* Header */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <h1 className="text-2xl font-bold mb-2 break-words notranslate">{skill.name}</h1>
            <p className="text-gray-400 mb-4 text-sm leading-relaxed">
              {language === 'it' && skill.description_it ? skill.description_it : skill.description}
            </p>
            <div className="flex flex-wrap gap-3">
              {skill.category && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-lg font-medium">
                  <Tag className="w-3 h-3" />
                  {skill.category}
                </span>
              )}
              {frontmatter.risk && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500/20 text-yellow-300 text-sm rounded-lg">
                  <Shield className="w-3 h-3" />
                  {t('det_risk')}: {frontmatter.risk}
                </span>
              )}
              {frontmatter.date_added && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-500/20 text-cyan-300 text-sm rounded-lg">
                  <Calendar className="w-3 h-3" />
                  {frontmatter.date_added}
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setShowInstall(true)} className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg shadow-purple-500/25 flex items-center gap-2 shrink-0 self-start">
            <Download className="w-4 h-4" />
            {t('cat_btn_install')}
          </button>
        </div>

        {/* Tags */}
        {skill.tags && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-xs text-gray-500 mb-2 font-medium">Tags</p>
            <div className="flex flex-wrap gap-1">
              {skill.tags.split(',').map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 bg-white/5 text-gray-400 rounded">
                  {tag.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Source */}
        {frontmatter.source && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <a
              href={frontmatter.source}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              {t('det_view_source')}
            </a>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
          <h2 className="text-lg font-semibold">{t('det_content_title')}</h2>
          
          {/* Selettore Lingua Documento */}
          <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5">
            <button
              onClick={() => setViewLang('it')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewLang === 'it'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {language === 'it' ? 'Italiano' : 'Italian'}
            </button>
            <button
              onClick={() => setViewLang('en')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewLang === 'en'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {language === 'it' ? 'Inglese' : 'English'}
            </button>
          </div>
        </div>

        {contentLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-500">
              {viewLang === 'it' ? 'Traduzione in corso...' : 'Caricamento in corso...'}
            </p>
          </div>
        ) : content ? (
          <div 
            className="markdown-content text-sm text-gray-300 overflow-x-auto leading-relaxed max-h-[650px] overflow-y-auto pr-2"
            dangerouslySetInnerHTML={{ __html: markedInstance.parse(content) }}
          />
        ) : (
          <p className="text-sm text-gray-500 py-10 text-center">Nessun contenuto disponibile.</p>
        )}
      </div>

      {/* Install Modal */}
      {showInstall && (
        <InstallModal skill={skill} onClose={() => setShowInstall(false)} />
      )}
    </div>
  );
}
