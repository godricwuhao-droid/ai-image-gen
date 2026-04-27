import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { 
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  TrashIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
  XMarkIcon,
  GlobeAltIcon,
  PhotoIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { generationService } from '../services/api';
import toast from 'react-hot-toast';

interface ImageItem {
  url: string;
  width?: number;
  height?: number;
}

export const HistoryPage: React.FC = () => {
  const { generations, fetchGenerations, deleteGeneration } = useStore();
  const navigate = useNavigate();
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [selectedGeneration, setSelectedGeneration] = useState<any>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState<number | null>(null);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchGenerations();
  }, []);

  const handleDelete = async (id: number) => {
    if (window.confirm('确定要删除吗?')) {
      try {
        await deleteGeneration(id);
        toast.success('删除成功');
      } catch (error) {
        toast.error('删除失败');
      }
    }
  };

  const handleTogglePublic = async (id: number, currentPublic: boolean) => {
    try {
      setUpdatingId(id);
      await generationService.update(id, { is_public: !currentPublic });
      toast.success(!currentPublic ? '已发布到画廊' : '已取消发布');
      fetchGenerations();
      
      if (selectedGeneration && selectedGeneration.id === id) {
        setSelectedGeneration((prev: any) => ({
          ...prev,
          is_public: !currentPublic
        }));
      }
    } catch (error) {
      toast.error('操作失败');
    } finally {
      setUpdatingId(null);
    }
  };

  const getImageUrls = (images: any): ImageItem[] => {
    if (!images) return [];
    
    if (Array.isArray(images)) {
      return images.map(img => {
        if (typeof img === 'string') {
          return { url: img };
        } else if (typeof img === 'object' && img?.url) {
          return { url: img.url, width: img.width, height: img.height };
        }
        return null;
      }).filter(Boolean) as ImageItem[];
    }
    
    if (typeof images === 'string') {
      return [{ url: images }];
    }
    
    return [];
  };

  const downloadSingleImage = async (id: number, imageUrl: string, index: number) => {
    try {
      setDownloadingIndex(index);
      
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('下载的图片为空');
      }

      const contentType = response.headers.get('content-type') || 'image/png';
      const extension = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `generated-image-${id}-${index + 1}-${Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`第 ${index + 1} 张图片下载成功`);
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(`下载失败: ${error.message || '请稍后重试'}`);
    } finally {
      setDownloadingIndex(null);
    }
  };

  const handleDownloadAll = async (id: number, images: any) => {
    const imageUrls = getImageUrls(images);
    
    if (imageUrls.length === 0) {
      toast.error('没有可下载的图片');
      return;
    }

    if (imageUrls.length === 1) {
      await downloadSingleImage(id, imageUrls[0].url, 0);
      return;
    }

    setShowDownloadMenu(id);
  };

  const handleDownloadSelected = async (id: number, images: any, index: number) => {
    const imageUrls = getImageUrls(images);
    await downloadSingleImage(id, imageUrls[index].url, index);
    setShowDownloadMenu(null);
  };

  const handleDownloadAllImages = async (id: number, images: any) => {
    const imageUrls = getImageUrls(images);
    
    if (imageUrls.length === 0) {
      toast.error('没有可下载的图片');
      return;
    }

    toast.success(`开始下载 ${imageUrls.length} 张图片...`);
    
    for (let i = 0; i < imageUrls.length; i++) {
      await downloadSingleImage(id, imageUrls[i].url, i);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setShowDownloadMenu(null);
    toast.success('全部图片下载完成！');
  };

  const getImageUrl = (images: any): string | null => {
    if (!images) return null;
    if (Array.isArray(images) && images.length > 0) {
      const first = images[0];
      if (typeof first === 'string') return first;
      if (first?.url) return first.url;
    }
    return null;
  };

  return (
    <div className="page-container">
      <header className="nav-bar">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 rounded-xl transition-all hover:bg-gray-100"
              style={{color: 'var(--color-text-muted)'}}
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold gradient-text">创作历程</h1>
            <div className="w-9"></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold mb-2" style={{color: 'var(--color-text)'}}>我的作品集</h2>
            <p style={{color: 'var(--color-text-muted)'}}>记录每一次创意的诞生</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary"
          >
            <SparklesIcon className="w-5 h-5" />
            创建新图片
          </button>
        </div>

        {!generations || generations.length === 0 ? (
          <div className="text-center py-20 card-elevated p-12">
            <SparklesIcon className="w-16 h-16 mx-auto mb-4" style={{color: 'var(--color-accent)'}} />
            <p className="text-lg mb-6" style={{color: 'var(--color-text-muted)'}}>还没有创作记录</p>
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary"
            >
              开始你的第一次创作
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {generations.map((gen) => {
              const imageUrls = getImageUrls(gen.images);
              const imageUrl = getImageUrl(gen.images);
              return (
                <div key={gen.id} className="card hover-lift overflow-hidden">
                  {imageUrl && (
                    <div 
                      className="relative cursor-pointer group"
                      onClick={() => setSelectedGeneration(gen)}
                    >
                      <img
                        src={imageUrl}
                        alt="Generated"
                        className="w-full aspect-[3/4] object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p className="text-white text-sm font-medium line-clamp-2 mb-3">
                            {gen.prompt}
                          </p>
                          <div className="flex items-center justify-end gap-2">
                            {imageUrls.length > 1 && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium" style={{backgroundColor: 'rgba(255,255,255,0.2)', color: 'white'}}>
                                {imageUrls.length}张
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadAll(gen.id, gen.images);
                              }}
                              className="p-2 rounded-full transition-transform hover:scale-110 shadow-lg"
                              style={{backgroundColor: 'rgba(255,255,255,0.95)'}}
                            >
                              <ArrowDownTrayIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedGeneration(gen);
                              }}
                              className="p-2 rounded-full transition-transform hover:scale-110 shadow-lg"
                              style={{backgroundColor: 'rgba(255,255,255,0.95)'}}
                            >
                              <EyeIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-5">
                    <p className="text-sm mb-3 line-clamp-2" style={{color: 'var(--color-text-muted)'}}>
                      {gen.prompt}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs mb-4" style={{color: 'var(--color-text-subtle)'}}>
                      <span>{new Date(gen.created_at).toLocaleDateString('zh-CN')}</span>
                      <span 
                        className="badge"
                        style={
                          gen.status === 'completed' 
                            ? {backgroundColor: 'rgba(76, 175, 80, 0.1)', color: 'var(--color-success)', borderColor: 'rgba(76, 175, 80, 0.3)'}
                            : gen.status === 'failed'
                            ? {backgroundColor: 'rgba(244, 67, 54, 0.1)', color: 'var(--color-danger)', borderColor: 'rgba(244, 67, 54, 0.3)'}
                            : {backgroundColor: 'rgba(255, 152, 0, 0.1)', color: 'var(--color-warning)', borderColor: 'rgba(255, 152, 0, 0.3)'}
                        }
                      >
                        {gen.status === 'completed' ? '已完成' : gen.status === 'failed' ? '失败' : '处理中'}
                      </span>
                    </div>

                    <div className="flex gap-2 items-center">
                      {gen.status === 'completed' && imageUrl && (
                        <>
                          <button
                            onClick={() => handleDownloadAll(gen.id, gen.images)}
                            className="btn btn-secondary flex-1 text-sm"
                          >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            {imageUrls.length > 1 ? `下载 (${imageUrls.length})` : '下载'}
                          </button>
                          <button
                            onClick={() => handleTogglePublic(gen.id, !!gen.is_public)}
                            disabled={updatingId === gen.id}
                            className={gen.is_public ? 'btn flex-1 text-sm' : 'btn btn-secondary flex-1 text-sm'}
                            style={gen.is_public ? {background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: 'white'} : {}}
                          >
                            {updatingId === gen.id ? (
                              <span className="animate-pulse">处理中</span>
                            ) : gen.is_public ? (
                              <>
                                <CheckIcon className="w-4 h-4" />
                                已公开
                              </>
                            ) : (
                              <>
                                <GlobeAltIcon className="w-4 h-4" />
                                公开
                              </>
                            )}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(gen.id)}
                        className="btn btn-ghost p-3"
                        style={{color: 'var(--color-danger)'}}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {showDownloadMenu === gen.id && (
                    <div 
                      className="fixed inset-0 z-[9999] flex items-end justify-center"
                      style={{backgroundColor: 'rgba(0, 0, 0, 0.5)'}}
                      onClick={() => setShowDownloadMenu(null)}
                    >
                      <div 
                        className="w-full max-w-lg rounded-t-3xl shadow-2xl animate-slideUp"
                        style={{backgroundColor: 'var(--color-surface)'}}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="p-6 space-y-4">
                          <div className="flex items-center justify-between pb-4" style={{borderBottom: '1px solid var(--color-border)'}}>
                            <h3 className="text-lg font-bold" style={{color: 'var(--color-text)'}}>
                              选择下载方式
                            </h3>
                            <button 
                              onClick={() => setShowDownloadMenu(null)}
                              className="p-2 rounded-full hover:bg-gray-100"
                            >
                              <XMarkIcon className="w-5 h-5" />
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            {imageUrls.map((_img, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleDownloadSelected(gen.id, gen.images, idx)}
                                disabled={downloadingIndex === idx}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all"
                                style={{
                                  backgroundColor: 'var(--color-bg)',
                                  color: 'var(--color-text)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent-light)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg)'}
                              >
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{backgroundColor: 'var(--color-accent-light)'}}>
                                  <PhotoIcon className="w-6 h-6" style={{color: 'var(--color-accent)'}} />
                                </div>
                                <div className="flex-1 text-left">
                                  <p className="font-medium">第 {idx + 1} 张图片</p>
                                  <p className="text-sm" style={{color: 'var(--color-text-muted)'}}>点击下载此图片</p>
                                </div>
                                {downloadingIndex === idx ? (
                                  <span className="text-sm" style={{color: 'var(--color-accent)'}}>下载中...</span>
                                ) : (
                                  <ArrowDownTrayIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                                )}
                              </button>
                            ))}
                          </div>
                          
                          {imageUrls.length > 1 && (
                            <button
                              onClick={() => handleDownloadAllImages(gen.id, gen.images)}
                              className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl font-medium text-white"
                              style={{backgroundColor: 'var(--color-accent)'}}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              <ArrowDownTrayIcon className="w-5 h-5" />
                              下载全部 ({imageUrls.length} 张)
                            </button>
                          )}
                          
                          <div className="pt-2">
                            <button
                              onClick={() => setShowDownloadMenu(null)}
                              className="w-full p-4 text-center font-medium"
                              style={{color: 'var(--color-text-muted)'}}
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {selectedGeneration && (
        <div 
          className="modal-overlay"
          onClick={() => setSelectedGeneration(null)}
        >
          <div 
            className="modal-content max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 flex items-center justify-between" style={{borderBottom: '1px solid var(--color-border)'}}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: 'var(--color-accent-gradient)'}}>
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{color: 'var(--color-text)'}}>作品详情</h3>
                  <p className="text-sm" style={{color: 'var(--color-text-muted)'}}>查看生成详情</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedGeneration(null)}
                className="p-2 rounded-xl hover:bg-gray-100"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto" style={{maxHeight: '75vh'}}>
              <div className="p-8">
                <div className="space-y-6">
                  {getImageUrls(selectedGeneration.images).map((img, idx) => (
                    <div key={idx} className="rounded-2xl overflow-hidden shadow-lg">
                      <img 
                        src={img.url} 
                        alt="Generated"
                        style={{
                          width: '100%',
                          maxHeight: '60vh',
                          objectFit: 'contain',
                          background: 'var(--color-bg)'
                        }}
                      />
                      <div className="flex items-center justify-between p-4" style={{backgroundColor: 'var(--color-surface)'}}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: 'var(--color-accent-light)'}}>
                            <span className="font-bold" style={{color: 'var(--color-accent)'}}>{idx + 1}</span>
                          </div>
                          <span className="font-medium" style={{color: 'var(--color-text)'}}>第 {idx + 1} 张图片</span>
                        </div>
                        <button
                          onClick={() => handleDownloadSelected(selectedGeneration.id, selectedGeneration.images, idx)}
                          disabled={downloadingIndex === idx}
                          className="btn btn-secondary text-sm"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                          {downloadingIndex === idx ? '下载中...' : '下载'}
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="card-elevated p-6 space-y-5">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <DocumentDuplicateIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                        <label className="text-sm font-bold" style={{color: 'var(--color-text)'}}>
                          生成提示词
                        </label>
                      </div>
                      <p className="leading-relaxed p-4 rounded-xl" style={{backgroundColor: 'var(--color-bg)', color: 'var(--color-text)'}}>
                        {selectedGeneration.prompt}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="stat-card text-left p-4">
                        <label className="text-xs font-medium mb-2 block" style={{color: 'var(--color-text-subtle)'}}>
                          尺寸
                        </label>
                        <p className="text-sm font-semibold" style={{color: 'var(--color-text)'}}>
                          {selectedGeneration.size}
                        </p>
                      </div>
                      <div className="stat-card text-left p-4">
                        <label className="text-xs font-medium mb-2 block" style={{color: 'var(--color-text-subtle)'}}>
                          质量
                        </label>
                        <p className="text-sm font-semibold" style={{color: 'var(--color-text)'}}>
                          {selectedGeneration.quality === 'low' ? '快速' : 
                           selectedGeneration.quality === 'standard' ? '标准' : '高清'}
                        </p>
                      </div>
                      <div className="stat-card text-left p-4">
                        <label className="text-xs font-medium mb-2 block" style={{color: 'var(--color-text-subtle)'}}>
                          生成数量
                        </label>
                        <p className="text-sm font-semibold" style={{color: 'var(--color-text)'}}>
                          {selectedGeneration.n || 1} 张
                        </p>
                      </div>
                      <div className="stat-card text-left p-4" style={{background: 'linear-gradient(135deg, rgba(139, 115, 85, 0.1) 0%, rgba(139, 115, 85, 0.05) 100%)'}}>
                        <label className="text-xs font-medium mb-2 block" style={{color: 'var(--color-text-subtle)'}}>
                          消耗积分
                        </label>
                        <p className="text-sm font-bold" style={{color: 'var(--color-accent)'}}>
                          {selectedGeneration.credits_cost || 0} 积分
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4" style={{borderTop: '1px solid var(--color-border)'}}>
                      <div className="flex items-center gap-2 text-sm" style={{color: 'var(--color-text-muted)'}}>
                        <SparklesIcon className="w-4 h-4" />
                        <span>
                          {new Date(selectedGeneration.created_at).toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex gap-3">
                        {selectedGeneration.status === 'completed' && (
                          <>
                            <button
                              onClick={() => handleDownloadAll(selectedGeneration.id, selectedGeneration.images)}
                              className="btn btn-primary flex items-center gap-2"
                            >
                              <ArrowDownTrayIcon className="w-4 h-4" />
                              下载全部 ({getImageUrls(selectedGeneration.images).length})
                            </button>
                            <button
                              onClick={() => handleTogglePublic(selectedGeneration.id, !!selectedGeneration.is_public)}
                              disabled={updatingId === selectedGeneration.id}
                              className={selectedGeneration.is_public ? 'btn flex items-center gap-2' : 'btn btn-secondary flex items-center gap-2'}
                              style={selectedGeneration.is_public ? {background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: 'white'} : {}}
                            >
                              {updatingId === selectedGeneration.id ? (
                                <span className="animate-pulse">处理中...</span>
                              ) : selectedGeneration.is_public ? (
                                <>
                                  <CheckIcon className="w-4 h-4" />
                                  已公开
                                </>
                              ) : (
                                <>
                                  <GlobeAltIcon className="w-4 h-4" />
                                  公开到画廊
                                </>
                              )}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            if (window.confirm('确定要删除吗?')) {
                              handleDelete(selectedGeneration.id);
                              setSelectedGeneration(null);
                            }
                          }}
                          className="btn btn-ghost"
                          style={{color: 'var(--color-danger)'}}
                        >
                          <TrashIcon className="w-4 h-4" />
                          删除
                        </button>
                      </div>
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
