import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import {
  HeartIcon, 
  EyeIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
  XMarkIcon,
  ClockIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { galleryService, favoriteService, generationService, type GalleryImage } from '../services/api';

const SORT_OPTIONS = [
  { name: '最新', value: 'latest', icon: 'ClockIcon' },
  { name: '最热', value: 'popular', icon: 'FireIcon' },
  { name: '浏览最多', value: 'views', icon: 'EyeIcon' },
];

export const GalleryPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useStore();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [selectedSort, setSelectedSort] = useState('latest');
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await favoriteService.getList(1, 100);
      const ids = new Set(data.favorites.map(f => f.generation_id));
      setFavoriteIds(ids);
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    }
  }, [isAuthenticated]);

  const fetchGalleries = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      const data = await galleryService.getList(page, 20, selectedSort);
      const localImages = data.images.filter(img => {
        const url = img.images?.[0]?.url || '';
        return !url.includes('unsplash.com') && !url.includes('images.unsplash.com');
      });
      setImages(localImages);
      setTotalCount(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / 20) || 1);
      setCurrentPage(page);
    } catch (error) {
      toast.error('加载画廊失败');
    } finally {
      setLoading(false);
    }
  }, [selectedSort]);

  useEffect(() => {
    fetchGalleries(currentPage);
    fetchFavorites();
  }, [selectedSort, currentPage, fetchGalleries, fetchFavorites]);

  const handleLike = async (_imageId: number) => {
    if (!isAuthenticated) {
      toast.error('请先登录后再点赞');
      return;
    }
    try {
      const result = await generationService.toggleLike(_imageId);
      if (result.liked) {
        toast.success('点赞成功');
      } else {
        toast.success('已取消点赞');
      }
      setImages(prev => prev.map(img => 
        img.id === _imageId ? { ...img, likes_count: result.likes_count } : img
      ));
    } catch (error) {
      toast.error('点赞失败');
    }
  };

  const handleToggleFavorite = async (generationId: number) => {
    if (!isAuthenticated) {
      toast.error('请先登录后再收藏');
      return;
    }

    setLoadingFavorite(true);
    const isFavorited = favoriteIds.has(generationId);

    try {
      if (isFavorited) {
        await favoriteService.removeByGeneration(generationId);
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(generationId);
          return next;
        });
        toast.success('已取消收藏');
      } else {
        await favoriteService.add(generationId);
        setFavoriteIds(prev => new Set(prev).add(generationId));
        toast.success('已添加到收藏');
      }
    } catch (error: any) {
      const msg = error?.response?.data?.detail || (isFavorited ? '取消收藏失败' : '收藏失败');
      toast.error(msg);
    } finally {
      setLoadingFavorite(false);
    }
  };

  const handleUsePrompt = (prompt: string) => {
    if (!isAuthenticated) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }
    navigate('/', { state: { prompt } });
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success('Prompt已复制');
  };

  return (
    <div className="page-container">
      <header className="nav-bar">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="nav-logo-icon">AI</div>
              <span className="text-xl font-bold gradient-text">创意画廊</span>
            </Link>
            <nav className="flex items-center gap-6">
              <Link to="/gallery" className="nav-link nav-link-active">画廊</Link>
              <Link to="/templates" className="nav-link">模板</Link>
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

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-12">
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-3" style={{color: 'var(--color-text)'}}>探索创意世界</h1>
          <p className="text-lg" style={{color: 'var(--color-text-muted)'}}>发现AI生成的无限可能</p>
        </div>

        <div className="flex items-center gap-3 mb-10">
          {SORT_OPTIONS.map((sort) => {
            const Icon = sort.value === 'latest' ? ClockIcon : sort.value === 'popular' ? FireIcon : EyeIcon;
            return (
              <button
                key={sort.value}
                onClick={() => setSelectedSort(sort.value)}
                className={selectedSort === sort.value ? 'filter-tag filter-tag-active' : 'filter-tag'}
              >
                <Icon className="w-4 h-4" />
                {sort.name}
              </button>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary px-4 py-2"
            >
              上一页
            </button>
            <span className="text-sm" style={{color: 'var(--color-text-muted)'}}>
              第 {currentPage} / {totalPages} 页，共 {totalCount} 条
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="btn btn-secondary px-4 py-2"
            >
              下一页
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="w-16 h-16 rounded-full animate-spin" style={{borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)', borderWidth: '4px'}}></div>
            <p className="mt-4" style={{color: 'var(--color-text-muted)'}}>加载中...</p>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-20 card-elevated p-12">
            <SparklesIcon className="w-16 h-16 mx-auto mb-4" style={{color: 'var(--color-accent)'}} />
            <p className="text-lg mb-6" style={{color: 'var(--color-text-muted)'}}>暂无作品</p>
            <Link to="/" className="btn btn-primary inline-block">
              创建第一张图片
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.map((image) => {
              const isFavorited = favoriteIds.has(image.id);
              return (
                <div key={image.id} className="card hover-lift overflow-hidden">
                  <div 
                    className="relative cursor-pointer group"
                    onClick={async () => {
                      try {
                        const detail = await galleryService.getDetail(image.id);
                        setSelectedImage(detail);
                      } catch {
                        setSelectedImage(image);
                      }
                    }}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden">
                      {image.images && image.images[0]?.url ? (
                        <>
                          <img
                            src={image.images[0].url}
                            alt={image.prompt}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                          {image.images.length > 1 && (
                            <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium" style={{background: 'rgba(0,0,0,0.6)', color: 'white'}}>
                              {image.images.length}张
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{background: 'var(--color-border-subtle)'}}>
                          <span style={{color: 'var(--color-text-subtle)'}}>无图片</span>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)'}}>
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p className="text-white text-sm font-medium line-clamp-2 mb-3">
                            {image.prompt}
                          </p>
                          <div className="flex items-center justify-between">
                            <button 
                              className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:scale-105"
                              style={{background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)'}}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLike(image.id);
                              }}
                            >
                              <HeartIcon className="w-5 h-5 text-white" />
                              <span className="text-white text-sm">{image.likes_count}</span>
                            </button>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFavorite(image.id);
                                }}
                                disabled={loadingFavorite}
                                className="p-2 rounded-full transition-all hover:scale-110"
                                style={{background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)'}}
                              >
                                {isFavorited ? (
                                  <HeartIconSolid className="w-5 h-5 text-red-500" />
                                ) : (
                                  <HeartIcon className="w-5 h-5 text-white" />
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedImage(image);
                                }}
                                className="p-2 rounded-full transition-all hover:scale-110"
                                style={{background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)'}}
                              >
                                <EyeIcon className="w-5 h-5 text-white" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{background: 'var(--color-accent-gradient)'}}>
                          {image.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium" style={{color: 'var(--color-text)'}}>@{image.username}</span>
                      </div>
                      <span className="text-xs" style={{color: 'var(--color-text-subtle)'}}>
                        {new Date(image.created_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUsePrompt(image.prompt);
                      }}
                      className="btn btn-primary w-full text-sm"
                    >
                      <SparklesIcon className="w-4 h-4" />
                      使用此Prompt
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {selectedImage && (
        <div 
          className="modal-overlay"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="modal-content max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 flex items-center justify-between" style={{borderBottom: '1px solid var(--color-border)'}}>
              <div className="flex items-center gap-3">
                <SparklesIcon className="w-6 h-6" style={{color: 'var(--color-accent)'}} />
                <h3 className="text-xl font-bold" style={{color: 'var(--color-text)'}}>作品详情</h3>
              </div>
              <button 
                onClick={() => setSelectedImage(null)}
                className="p-2 rounded-lg transition-colors"
                style={{color: 'var(--color-text-muted)'}}
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto" style={{maxHeight: '75vh'}}>
              <div className="p-8">
                <div className="space-y-6">
                  {selectedImage.images && selectedImage.images.length > 0 ? (
                    <div className="space-y-4">
                      {selectedImage.images.map((img: any, idx: number) => (
                        <div key={idx} className="image-container shadow-lg">
                          <img
                            src={img.url}
                            alt={selectedImage.prompt}
                            className="w-full h-auto"
                            style={{maxHeight: '60vh', objectFit: 'contain', background: 'var(--color-bg)'}}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full h-64 flex items-center justify-center" style={{background: 'var(--color-bg)'}}>
                      <span style={{color: 'var(--color-text-muted)'}}>无图片</span>
                    </div>
                  )}
                  
                  <div className="card-elevated p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{background: 'var(--color-accent-gradient)'}}>
                          {selectedImage.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-lg" style={{color: 'var(--color-text)'}}>@{selectedImage.username}</p>
                          <p className="text-sm" style={{color: 'var(--color-text-muted)'}}>
                            {new Date(selectedImage.created_at).toLocaleDateString('zh-CN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6" style={{color: 'var(--color-text-muted)'}}>
                        <span className="flex items-center gap-2">
                          <HeartIcon className="w-5 h-5" />
                          <span>{selectedImage.likes_count}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <EyeIcon className="w-5 h-5" />
                          <span>{selectedImage.views_count}</span>
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <DocumentDuplicateIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                        <label className="text-sm font-bold" style={{color: 'var(--color-text)'}}>
                          生成提示词
                        </label>
                      </div>
                      <p className="leading-relaxed p-4 rounded-xl" style={{background: 'var(--color-bg)', color: 'var(--color-text)'}}>
                        {selectedImage.prompt}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        onClick={() => {
                          handleToggleFavorite(selectedImage.id);
                        }}
                        className={favoriteIds.has(selectedImage.id) ? 'btn btn-primary' : 'btn btn-secondary'}
                      >
                        <HeartIcon className="w-5 h-5" />
                        {favoriteIds.has(selectedImage.id) ? '已收藏' : '收藏'}
                      </button>
                      <button
                        onClick={() => handleCopyPrompt(selectedImage.prompt)}
                        className="btn btn-secondary"
                      >
                        <DocumentDuplicateIcon className="w-5 h-5" />
                        复制Prompt
                      </button>
                      <button
                        onClick={() => handleUsePrompt(selectedImage.prompt)}
                        className="btn btn-primary"
                      >
                        <SparklesIcon className="w-5 h-5" />
                        使用此Prompt
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
