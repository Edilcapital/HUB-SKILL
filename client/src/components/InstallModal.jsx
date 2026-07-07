import { useEffect, useState } from 'react';
import { X, Download, FolderOpen, Check, AlertCircle, Copy } from 'lucide-react';
import { api } from '../utils/api';
import { useLanguage } from '../utils/LanguageContext';
import toast from 'react-hot-toast';

export default function InstallModal({ skill, onClose }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [copied, setCopied] = useState(false);
  const { t, language } = useLanguage();

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  useEffect(() => {
    if (isLocal) {
      api.getProjects().then(setProjects).catch(console.error);
    }
  }, [isLocal]);

  const handleInstall = async () => {
    if (!selectedProject) {
      toast.error(t('inst_toast_select_project'));
      return;
    }

    setInstalling(true);
    try {
      const result = await api.installSkill(skill.name, selectedProject.id);
      if (result.success) {
        setInstalled(true);
        toast.success(t('inst_toast_success', { skill: skill.name, project: selectedProject.name }));
      }
    } catch (err) {
      toast.error(t('inst_toast_failed', { error: err.message }));
    } finally {
      setInstalling(false);
    }
  };

  const handleDownload = async () => {
    setInstalling(true);
    try {
      const response = await fetch(`/api/skills/${encodeURIComponent(skill.name)}/raw?lang=${language}`);
      if (!response.ok) throw new Error('Download fallito');
      const text = await response.text();

      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'SKILL.md';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t('inst_success'));
      setInstalled(true);
    } catch (err) {
      toast.error(t('inst_toast_failed', { error: err.message }));
    } finally {
      setInstalling(false);
    }
  };

  const getCurlCommand = () => {
    const rawUrl = `${window.location.origin}/api/skills/${encodeURIComponent(skill.name)}/raw?lang=${language}`;
    const slug = encodeURIComponent(skill.name.toLowerCase().replace(/\s+/g, '-'));
    return `mkdir -p .skills/${slug} && curl -o .skills/${slug}/SKILL.md "${rawUrl}"`;
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(getCurlCommand());
    setCopied(true);
    toast.success(t('inst_cloud_copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-md">
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
            <Download className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold">{t('inst_title')}</h2>
          <p className="text-sm text-gray-400 mt-1">
            {t('inst_installing_to', { name: skill.name })}
          </p>
        </div>

        {installed ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-lg font-semibold text-emerald-400">{t('inst_success')}</p>
            <p className="text-sm text-gray-400 mt-2">{t('inst_success_desc')}</p>
            <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200">
              {t('inst_btn_done')}
            </button>
          </div>
        ) : isLocal ? (
          <>
            {/* Project Selection */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                {t('inst_select_project')}
              </label>
              {projects.length === 0 ? (
                <div className="flex items-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />
                  <p className="text-sm text-yellow-300">{t('inst_no_projects')}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        selectedProject?.id === project.id
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <FolderOpen className={`w-5 h-5 ${selectedProject?.id === project.id ? 'text-purple-400' : 'text-gray-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{project.name}</p>
                        <p className="text-xs text-gray-500 truncate">{project.path}</p>
                      </div>
                      {!project.exists && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                          {t('inst_missing')}
                        </span>
                      )}
                      {selectedProject?.id === project.id && (
                        <Check className="w-4 h-4 text-purple-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 px-6 py-2.5 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-200">
                {t('inst_btn_cancel')}
              </button>
              <button
                onClick={handleInstall}
                disabled={!selectedProject || installing}
                className="flex-1 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {installing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('inst_btn_installing')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    {t('inst_btn_install')}
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Cloud Download UI */}
            <div className="mb-6 space-y-4">
              <div className="flex items-start gap-2.5 p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300 leading-relaxed font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-purple-400 mt-0.5" />
                <p>{t('inst_cloud_desc')}</p>
              </div>

              <button
                onClick={handleDownload}
                disabled={installing}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 active:scale-98"
              >
                {installing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {t('inst_cloud_btn_download')}
              </button>

              <div className="border-t border-white/5 pt-4">
                <label className="text-xs text-gray-400 mb-1.5 block font-medium">
                  {t('inst_cloud_curl_title')}
                </label>
                <div className="flex gap-2 font-mono text-[10px]">
                  <div className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-gray-400 break-all select-all leading-normal max-h-24 overflow-y-auto">
                    {getCurlCommand()}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCurl}
                    className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 shrink-0 self-start transition-all"
                    title={t('inst_cloud_copied')}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-white/5 pt-4">
              <button onClick={onClose} className="w-full px-6 py-2.5 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-200 text-sm">
                {t('inst_btn_done')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
