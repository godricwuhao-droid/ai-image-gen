import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { SparklesIcon, MagnifyingGlassIcon, BookmarkIcon, DocumentDuplicateIcon, TrashIcon, PlusIcon, CheckIcon, PencilIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { templateService, type Template } from '../services/api';

const CATEGORIES = [
  { name: '全部', value: 'all' },
  { name: '人像', value: 'portrait' },
  { name: '风景', value: 'landscape' },
  { name: '建筑', value: 'architecture' },
  { name: '动漫', value: 'anime' },
  { name: '艺术', value: 'art' },
  { name: '商业', value: 'business' },
];

export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedTemplateIds, setSavedTemplateIds] = useState<Set<number>>(new Set());
  const [savingTemplateId, setSavingTemplateId] = useState<number | null>(null);

  // 新建/编辑模板弹窗
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    prompt: '',
    category: 'general',
    description: '',
  });

  useEffect(() => {
    fetchTemplates();
    if (showSavedOnly && isAuthenticated) {
      fetchSavedIds();
    }
  }, [selectedCategory, showSavedOnly]);

  const fetchSavedIds = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await templateService.getMy(1, 100);
      const ids = new Set(data.templates.map(t => t.id));
      setSavedTemplateIds(ids);
    } catch (error) {
      console.error('Failed to fetch saved template ids:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      if (showSavedOnly) {
        const data = await templateService.getMy(1, 50);
        setTemplates(data.templates);
        setSavedTemplateIds(new Set(data.templates.map(t => t.id)));
      } else {
        const category = selectedCategory === 'all' ? undefined : selectedCategory;
        const data = await templateService.getPublic(1, 50, category);
        setTemplates(data.templates);
        if (isAuthenticated) {
          fetchSavedIds();
        }
      }
    } catch (error) {
      toast.error('加载模板失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (template: Template) => {
    if (!isAuthenticated) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }
    try {
      setSavingTemplateId(template.id);
      await templateService.create({
        name: template.name,
        prompt: template.prompt,
        category: template.category || 'general',
        description: template.description,
        is_public: false,
      });
      setSavedTemplateIds(prev => new Set(prev).add(template.id));
      toast.success('已保存到我的模板');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || '保存失败');
    } finally {
      setSavingTemplateId(null);
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!isAuthenticated) return;
    try {
      await templateService.delete(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      setSavedTemplateIds(prev => { const next = new Set(prev); next.delete(templateId); return next; });
      toast.success('已删除');
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const isTemplateSaved = (templateId: number) => savedTemplateIds.has(templateId);

  const handleCreateTemplate = () => {
    if (!isAuthenticated) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }
    setEditingTemplate(null);
    setCreateForm({ name: '', prompt: '', category: 'general', description: '' });
    setShowCreateModal(true);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setCreateForm({
      name: template.name,
      prompt: template.prompt,
      category: template.category || 'general',
      description: template.description || '',
    });
    setShowCreateModal(true);
  };

  const handleSubmitTemplate = async () => {
    if (!createForm.name.trim() || !createForm.prompt.trim()) {
      toast.error('请填写模板名称和 Prompt');
      return;
    }
    try {
      if (editingTemplate && editingTemplate.id) {
        await templateService.update(editingTemplate.id, createForm);
        toast.success('模板已更新');
      } else {
        await templateService.create({ ...createForm, is_public: false });
        toast.success('模板已创建');
      }
      setShowCreateModal(false);
      fetchTemplates();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || '操作失败');
    }
  };

  const handleUseTemplate = (template: Template) => {
    if (!isAuthenticated) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }
    navigate('/', { state: { prompt: template.prompt, style: template.category } });
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success('Prompt已复制到剪贴板');
  };

  const filteredTemplates = templates;

  return (
    <div className="page-container">
      <header className="nav-bar">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="nav-logo">
              <div className="nav-logo-icon">AI</div>
              <span className="text-xl font-bold gradient-text">Prompt 模板库</span>
            </Link>
            <nav className="flex items-center gap-6">
              <Link to="/gallery" className="nav-link">画廊</Link>
              <Link to="/templates" className="nav-link nav-link-active">模板</Link>
              <Link to="/pricing" className="nav-link">定价</Link>
              {isAuthenticated ? (
                <Link to="/profile" className="btn btn-primary">个人中心</Link>
              ) : (
                <Link to="/login" className="btn btn-primary">登录</Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      <section className="page-header">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="page-header-title">
            <span className="gradient-text">Prompt 模板库</span>
          </h1>
          <p className="page-header-subtitle">
            发现灵感，使用专业设计的 Prompt 模板创建惊艳的AI图像
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 pb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{color: 'var(--color-text-subtle)'}} />
            <input
              type="text"
              placeholder="搜索模板..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-12"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowSavedOnly(!showSavedOnly)}
              className={showSavedOnly ? 'btn btn-primary' : 'btn btn-secondary'}
            >
              {showSavedOnly ? <BookmarkIconSolid className="w-5 h-5" /> : <BookmarkIcon className="w-5 h-5" />}
              <span>我的模板</span>
            </button>
            {isAuthenticated && (
              <button
                onClick={handleCreateTemplate}
                className="btn btn-primary"
                style={{ background: 'var(--color-accent-gradient)' }}
              >
                <PlusIcon className="w-5 h-5" />
                <span>新建模板</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={selectedCategory === category.value ? 'filter-tag filter-tag-active' : 'filter-tag'}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 pb-16">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-4 rounded-full animate-spin" style={{borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)'}}></div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-16">
            <SparklesIcon className="w-16 h-16 mx-auto mb-4" style={{color: 'var(--color-text-subtle)'}} />
            <p className="text-lg mb-4" style={{color: 'var(--color-text-muted)'}}>
              {showSavedOnly ? '还没有保存任何模板' : '没有找到符合条件的模板'}
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
                setShowSavedOnly(false);
              }}
              className="btn btn-primary"
            >
              清除筛选
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className={`card p-5 hover-lift ${showSavedOnly ? 'card--mine' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold mb-2" style={{color: 'var(--color-text)'}}>{template.name}</h3>
                    <div className="flex gap-2 items-center">
                      <span className="badge">
                        {CATEGORIES.find(c => c.value === template.category)?.name || template.category}
                      </span>
                      {showSavedOnly && (
                        <span className="badge badge--mine" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                          我的模板
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative mb-4">
                  <p className="text-sm line-clamp-3" style={{color: 'var(--color-text-muted)'}}>
                    {template.prompt}
                  </p>
                  <div className="absolute inset-0 gradient-mask-b pointer-events-none" />
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1 text-xs" style={{color: 'var(--color-text-subtle)'}}>
                    <SparklesIcon className="w-4 h-4" />
                    <span>{template.usage_count || 0} 次使用</span>
                  </div>
                  {!showSavedOnly && (
                    <button
                      onClick={() => handleSaveTemplate(template)}
                      disabled={savingTemplateId === template.id}
                      className={`p-1.5 rounded-lg transition-all ${
                        isTemplateSaved(template.id)
                          ? 'text-yellow-500 hover:text-yellow-600'
                          : 'hover:bg-[var(--color-accent-light)]'
                      }`}
                      style={{color: isTemplateSaved(template.id) ? '#eab308' : 'var(--color-text-subtle)'}}
                      title={isTemplateSaved(template.id) ? '已保存' : '保存到我的模板'}
                    >
                      {isTemplateSaved(template.id) ? (
                        <CheckIcon className="w-4 h-4" />
                      ) : savingTemplateId === template.id ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <PlusIcon className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  {showSavedOnly && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="p-1.5 rounded-lg text-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
                        title="编辑"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="删除"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyPrompt(template.prompt)}
                    className="btn btn-secondary flex-1 text-sm"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                    复制
                  </button>
                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="btn btn-primary flex-1 text-sm"
                  >
                    使用
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      {/* 新建/编辑模板弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="card-elevated p-8 max-w-lg w-full" style={{ animation: 'slideUp 0.3s ease-out' }}>
            <h3 className="text-xl font-bold mb-6" style={{ color: 'var(--color-text)' }}>
              {editingTemplate ? '编辑模板' : '新建模板'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>模板名称</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  className="input"
                  placeholder="例如：日系写真"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>分类</label>
                <select
                  value={createForm.category}
                  onChange={e => setCreateForm(f => ({ ...f, category: e.target.value }))}
                  className="input"
                >
                  <option value="portrait">人像</option>
                  <option value="landscape">风景</option>
                  <option value="architecture">建筑</option>
                  <option value="anime">动漫</option>
                  <option value="art">艺术</option>
                  <option value="business">商业</option>
                  <option value="general">通用</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>描述</label>
                <input
                  type="text"
                  value={createForm.description}
                  onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  className="input"
                  placeholder="简短描述模板风格"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>Prompt 模板</label>
                <textarea
                  value={createForm.prompt}
                  onChange={e => setCreateForm(f => ({ ...f, prompt: e.target.value }))}
                  className="input"
                  rows={5}
                  placeholder="请输入 Prompt 模板内容，支持英文逗号分隔的描述词"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 rounded-xl font-medium transition-all"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
              >
                取消
              </button>
              <button
                onClick={handleSubmitTemplate}
                className="flex-1 py-3 rounded-xl font-medium text-white transition-all"
                style={{ background: 'var(--color-accent-gradient)' }}
              >
                {editingTemplate ? '保存修改' : '创建模板'}
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
};
