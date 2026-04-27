import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { SparklesIcon, MagnifyingGlassIcon, BookmarkIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
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

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory, showSavedOnly]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      if (showSavedOnly) {
        const data = await templateService.getMy(1, 50);
        setTemplates(data.templates);
      } else {
        const category = selectedCategory === 'all' ? undefined : selectedCategory;
        const data = await templateService.getPublic(1, 50, category);
        setTemplates(data.templates);
      }
    } catch (error) {
      toast.error('加载模板失败');
    } finally {
      setLoading(false);
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

          <button
            onClick={() => setShowSavedOnly(!showSavedOnly)}
            className={showSavedOnly ? 'btn btn-primary' : 'btn btn-secondary'}
          >
            {showSavedOnly ? <BookmarkIconSolid className="w-5 h-5" /> : <BookmarkIcon className="w-5 h-5" />}
            <span>我的模板</span>
          </button>
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
                className="card p-5 hover-lift"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold mb-2" style={{color: 'var(--color-text)'}}>{template.name}</h3>
                    <span className="badge">
                      {CATEGORIES.find(c => c.value === template.category)?.name || template.category}
                    </span>
                  </div>
                </div>

                <div className="relative mb-4">
                  <p className="text-sm line-clamp-3" style={{color: 'var(--color-text-muted)'}}>
                    {template.prompt}
                  </p>
                  <div className="absolute inset-0 gradient-mask-b pointer-events-none" />
                </div>

                <div className="flex items-center gap-4 text-xs mb-4" style={{color: 'var(--color-text-subtle)'}}>
                  <div className="flex items-center gap-1">
                    <SparklesIcon className="w-4 h-4" />
                    <span>{template.usage_count || 0} 次使用</span>
                  </div>
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
      </main>
    </div>
  );
};
