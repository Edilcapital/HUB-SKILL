import { useEffect, useState } from 'react';
import { FolderOpen, Plus, Trash2, Package, AlertCircle, Check } from 'lucide-react';
import { api } from '../utils/api';
import { useLanguage } from '../utils/LanguageContext';
import toast from 'react-hot-toast';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');
  const [projectSkills, setProjectSkills] = useState({});
  const { t } = useLanguage();

  const fetchProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
      const skillsMap = {};
      for (const project of data) {
        try {
          const skills = await api.getProjectSkills(project.id);
          skillsMap[project.id] = skills;
        } catch {
          skillsMap[project.id] = [];
        }
      }
      setProjectSkills(skillsMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName || !newPath) {
      toast.error(t('proj_toast_error_required'));
      return;
    }
    try {
      await api.addProject(newName, newPath);
      toast.success(t('proj_toast_success_added', { name: newName }));
      setNewName('');
      setNewPath('');
      setShowAdd(false);
      fetchProjects();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (project) => {
    if (!confirm(t('proj_confirm_remove', { name: project.name }))) return;
    try {
      await api.deleteProject(project.id);
      toast.success(t('proj_toast_success_removed'));
      fetchProjects();
    } catch (err) {
      toast.error(err.message);
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
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
              {t('proj_title')}
            </span>
          </h1>
          <p className="text-gray-400">{t('proj_desc')}</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg shadow-purple-500/25 active:scale-95 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('proj_btn_add')}
        </button>
      </div>

      {/* Add Project Form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold mb-4">{t('proj_form_title')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t('proj_form_name')}</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('proj_form_name_placeholder')}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t('proj_form_path')}</label>
              <input
                type="text"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                placeholder={t('proj_form_path_placeholder')}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl text-sm">
              {t('proj_form_btn_add')}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-6 py-2.5 bg-white/10 border border-white/20 text-white font-semibold rounded-xl text-sm">
              {t('proj_form_btn_cancel')}
            </button>
          </div>
        </form>
      )}

      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">{t('proj_no_projects')}</p>
          <p className="text-sm text-gray-500">{t('proj_no_projects_desc')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <div key={project.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    project.exists
                      ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20'
                      : 'bg-red-500/20'
                  }`}>
                    <FolderOpen className={`w-5 h-5 ${project.exists ? 'text-cyan-400' : 'text-red-400'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      {project.name}
                      {project.exists ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-400">
                          <AlertCircle className="w-3 h-3" /> {t('proj_path_not_found')}
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 font-mono">{project.path}</p>
                    {projectSkills[project.id]?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {projectSkills[project.id].map((s) => (
                          <span key={s.skill_name} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-lg">
                            <Package className="w-3 h-3" />
                            {s.skill_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(project)}
                  className="text-gray-500 hover:text-red-400 transition-colors p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
        <h3 className="text-sm font-semibold mb-2 text-purple-300">{t('proj_how_it_works')}</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>{t('proj_how_step_1')}</li>
          <li>{t('proj_how_step_2')}</li>
          <li>
            {t('proj_how_step_3')}{' '}
            <code className="text-purple-400 bg-purple-500/10 px-1 rounded">
              .skills/skill-name/SKILL.md
            </code>
          </li>
          <li>{t('proj_how_step_4')}</li>
        </ul>
      </div>
    </div>
  );
}
