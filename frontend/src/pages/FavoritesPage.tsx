import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { HeartIcon, TrashIcon, DocumentDuplicateIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { favoriteService, generationService } from '../services/api';
import type { Generation } from '../types';

interface FavoriteItem {
  favoriteId: number;
  generation: Generation;
}

interface SelectedImage {
  image: FavoriteItem;
  index: number;
}

export const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useStore();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites(currentPage);
    }
  }, [isAuthenticated, currentPage]);

  const fetchFavorites = async (page: number) => {
    try {
      setLoading(true);
      const data = await favoriteService.getList(page, pageSize);
      const results: FavoriteItem[] = [];
      
      for (const fav of data.favorites) {
        try {
          const gen = await generationService.get(fav.generation_id);
          results.push({ favoriteId: fav.id, generation: gen });
        } catch {
          // skip failed ones
        }
      }
      
      setFavorites(results);
      setTotalPages(Math.ceil(data.total / pageSize));
    } catch (error) {
      toast.error('加载收藏失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (favoriteId: number) => {
    try {
      await favoriteService.remove(favoriteId);
      setFavorites(prev => prev.filter(f => f.favoriteId !== favoriteId));
      toast.success('已取消收藏');
    } catch (error) {
      toast.error('取消收藏失败');
    }
  };

  const handleUsePrompt = (prompt: string) => {
    navigate('/', { state: { prompt } });
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success('Prompt已复制到剪贴板');
  };

  if (!isAuthenticated) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{background: 'var(--color-accent-gradient)'}}>
            <HeartIcon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4" style={{color: 'var(--color-text)'}}>请先登录</h2>
          <p className="text-lg mb-8" style={{color: 'var(--color-text-muted)'}}>登录后即可查看和管理您的收藏</p>
          <button
            onClick={() => navigate('/login')}
            className="btn btn-primary btn-lg"
          >
            前往登录
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 animate-spin" style={{borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)', borderWidth: '4px'}}></div>
          <p style={{color: 'var(--color-text-muted)'}}>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="nav-bar">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="nav-logo-icon">AI</div>
              <span className="text-xl font-bold gradient-text">我的收藏</span>
            </Link>
            <nav className="flex items-center gap-6">
              <Link to="/gallery" className="nav-link">画廊</Link>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'var(--color-accent-gradient)'}}>
              <HeartIcon className="w-6 h-6 text-white" />
            </div>
            <div className="stat-value">{favorites.length}</div>
            <div className="stat-label">收藏作品</div>
          </div>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-20 card-elevated p-12">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{background: 'var(--color-accent-light)'}}>
              <HeartIcon className="w-10 h-10" style={{color: 'var(--color-accent)'}} />
            </div>
            <h2 className="text-2xl font-bold mb-3" style={{color: 'var(--color-text)'}}>还没有收藏</h2>
            <p className="text-lg mb-8" style={{color: 'var(--color-text-muted)'}}>去画廊浏览喜欢的图片并收藏吧</p>
            <Link
              to="/gallery"
              className="btn btn-primary inline-block"
            >
              浏览画廊
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((item, index) => (
              <div key={item.generation.id} className="card hover-lift">
                <div 
                  className="relative cursor-pointer"
                  onClick={() => setSelectedImage({ image: item, index })}
                >
                  {item.generation.images && item.generation.images[0]?.url ? (
                    <img src={item.generation.images[0].url} alt={item.generation.prompt} className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center" style={{background: 'var(--color-border-subtle)'}}>
                      <span style={{color: 'var(--color-text-subtle)'}}>无图片</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="relative mb-3">
                    <p className="text-sm line-clamp-2" style={{color: 'var(--color-text-muted)'}}>
                      {item.generation.prompt}
                    </p>
                    <div className="absolute inset-0 gradient-mask-b pointer-events-none" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopyPrompt(item.generation.prompt)}
                      className="btn btn-secondary flex-1 text-sm"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4" />
                      复制
                    </button>
                    <button
                      onClick={() => handleUsePrompt(item.generation.prompt)}
                      className="btn btn-primary flex-1 text-sm"
                    >
                      使用
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemove(item.favoriteId)}
                    className="w-full mt-2 py-2 text-sm rounded-lg transition-all duration-200 hover:bg-red-50"
                    style={{color: 'var(--color-danger)'}}
                  >
                    <TrashIcon className="w-4 h-4 inline mr-1" />
                    取消收藏
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-10">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary"
              style={{opacity: currentPage === 1 ? 0.5 : 1}}
            >
              上一页
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={currentPage === pageNum ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{minWidth: '44px'}}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="btn btn-secondary"
              style={{opacity: currentPage === totalPages ? 0.5 : 1}}
            >
              下一页
            </button>
          </div>
        )}
      </main>

      {selectedImage && (
        <div className="modal-overlay" onClick={() => setSelectedImage(null)}>
          <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 p-2 rounded-full z-10 transition-all duration-200 hover:bg-gray-100"
                style={{background: 'rgba(255, 255, 255, 0.9)', color: 'var(--color-text)'}}
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
              {selectedImage.image.generation.images && selectedImage.image.generation.images[0]?.url ? (
                <img 
                  src={selectedImage.image.generation.images[0].url} 
                  alt={selectedImage.image.generation.prompt}
                  className="w-full max-h-[70vh] object-contain"
                  style={{background: 'var(--color-bg)'}}
                />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center" style={{background: 'var(--color-bg)'}}>
                  <span style={{color: 'var(--color-text-subtle)'}}>无图片</span>
                </div>
              )}
            </div>
            <div className="p-6">
              <h3 className="text-lg font-bold mb-3" style={{color: 'var(--color-text)'}}>Prompt</h3>
              <p className="text-sm mb-4 p-4 rounded-xl" style={{color: 'var(--color-text-muted)', background: 'var(--color-accent-light)'}}>
                {selectedImage.image.generation.prompt}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleCopyPrompt(selectedImage.image.generation.prompt)}
                  className="btn btn-secondary flex-1"
                >
                  <DocumentDuplicateIcon className="w-5 h-5" />
                  复制 Prompt
                </button>
                <button
                  onClick={() => {
                    handleUsePrompt(selectedImage.image.generation.prompt);
                    setSelectedImage(null);
                  }}
                  className="btn btn-primary flex-1"
                >
                  使用此 Prompt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};