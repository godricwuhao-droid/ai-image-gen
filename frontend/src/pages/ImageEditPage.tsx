import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  PhotoIcon, 
  SparklesIcon, 
  ArrowPathIcon, 
  XMarkIcon, 
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';
import toast from 'react-hot-toast';

const SIZE_OPTIONS = [
  { value: '1024x1024', label: '1024×1024' },
  { value: '1024x1536', label: '1024×1536' },
  { value: '1536x1024', label: '1536×1024' },
];

const QUALITY_OPTIONS = [
  { value: 'low', label: 'Low 快速', credits: 1 },
  { value: 'medium', label: 'Medium 标准', credits: 2 },
  { value: 'high', label: 'High 高清', credits: 3 },
];

interface GenerationStatus {
  id: number;
  status: string;
  message?: string;
  progress?: number;
}

export const ImageEditPage = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [quality, setQuality] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<GenerationStatus | null>(null);
  const [editResults, setEditResults] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过10MB');
      return;
    }
    
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setEditResults([]);
    setCurrentGeneration(null);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleImageSelect(files[0]);
    }
  }, [handleImageSelect]);

  const handleClearImage = () => {
    setSelectedImage(null);
    setPreviewUrl('');
    setEditResults([]);
    setCurrentGeneration(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const pollGenerationStatus = useCallback(async (generationId: number) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setCurrentGeneration({ id: generationId, status: 'failed', message: '处理超时' });
        setIsSubmitting(false);
        return;
      }

      try {
        const response = await api.get(`/generations/${generationId}`);
        const generation = response.data;

        if (generation.status === 'processing' || generation.status === 'pending') {
          setCurrentGeneration({
            id: generationId,
            status: 'processing',
            message: 'AI正在处理中...',
            progress: Math.min(attempts * 5, 90)
          });
          attempts++;
          setTimeout(poll, 2000);
        } else if (generation.status === 'completed') {
          const images = generation.images || [];
          if (Array.isArray(images) && images.length > 0) {
            const imageUrls = images.map((img: any) => 
              typeof img === 'string' ? img : img.url || img.image_url
            ).filter(Boolean);
            
            setEditResults(imageUrls);
            setCurrentGeneration({
              id: generationId,
              status: 'completed',
              message: '处理完成',
              progress: 100
            });
            toast.success('图片编辑成功！');
          } else {
            setCurrentGeneration({
              id: generationId,
              status: 'failed',
              message: '未获取到处理结果'
            });
            toast.error('未获取到处理结果');
          }
          setIsSubmitting(false);
        } else if (generation.status === 'failed') {
          setCurrentGeneration({
            id: generationId,
            status: 'failed',
            message: generation.error_message || '处理失败'
          });
          toast.error(generation.error_message || '处理失败');
          setIsSubmitting(false);
        }
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setCurrentGeneration({
            id: generationId,
            status: 'failed',
            message: '状态查询失败'
          });
          setIsSubmitting(false);
        }
      }
    };

    poll();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedImage) {
      toast.error('请上传图片');
      return;
    }
    if (!prompt.trim()) {
      toast.error('请输入编辑描述');
      return;
    }

    setIsSubmitting(true);
    setCurrentGeneration({
      id: 0,
      status: 'pending',
      message: '正在提交...',
      progress: 5
    });
    
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('image', selectedImage);
    formData.append('size', size);
    formData.append('quality', quality);
    formData.append('n', '1');

    try {
      const response = await api.post('/image-edit', formData);

      const generationId = response.data.id;
      setCurrentGeneration({
        id: generationId,
        status: 'pending',
        message: '任务已提交，等待处理...',
        progress: 10
      });

      pollGenerationStatus(generationId);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || '提交失败，请稍后重试';
      toast.error(errorMsg);
      setCurrentGeneration({
        id: 0,
        status: 'failed',
        message: errorMsg
      });
      setIsSubmitting(false);
    }
  };

  const handleDownload = (imageUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `edited-image-${Date.now()}-${index + 1}.png`;
    link.click();
    toast.success('图片下载成功');
  };

  return (
    <div className="page-container">
      <header className="nav-bar">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeftIcon className="w-5 h-5" />
            <span className="text-lg font-bold gradient-text">AI创意工坊</span>
          </Link>
          <h1 className="text-xl font-bold gradient-text">图片编辑</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="card-elevated p-6 rounded-2xl">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{color: 'var(--color-text)'}}>
                <PhotoIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                上传图片
              </h2>
              
              <div
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragActive 
                    ? 'border-[var(--color-accent) bg-[var(--color-accent-light)]' 
                    : 'border-[var(--color-border) hover:border-[var(--color-accent)'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                
                {previewUrl ? (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full max-h-96 mx-auto rounded-xl shadow-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearImage();
                      }}
                      className="absolute top-2 right-2 p-2 rounded-full transition-all"
                      style={{backgroundColor: 'var(--color-danger)', color: 'white'}}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="py-12">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{backgroundColor: 'var(--color-accent-light)'}}>
                      <PhotoIcon className="w-10 h-10" style={{color: 'var(--color-accent)'}} />
                    </div>
                    <p className="text-lg font-medium mb-2" style={{color: 'var(--color-text)'}}>
                      点击上传或拖拽图片
                    </p>
                    <p className="text-sm" style={{color: 'var(--color-text-muted)'}}>
                      支持 PNG, JPG, GIF, WebP (最大10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="card-elevated p-6 rounded-2xl">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{color: 'var(--color-text)'}}>
                <SparklesIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                输出设置
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-3" style={{color: 'var(--color-text)'}}>
                    输出尺寸
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {SIZE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSize(opt.value)}
                        className="p-3 rounded-xl text-center transition-all font-medium"
                        style={
                          size === opt.value
                            ? {
                                border: '2px solid var(--color-accent)',
                                backgroundColor: 'var(--color-accent-light)',
                                color: 'var(--color-text)'
                              }
                            : {
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'var(--color-bg)',
                                color: 'var(--color-text)'
                              }
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3" style={{color: 'var(--color-text)'}}>
                    输出质量
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {QUALITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setQuality(opt.value)}
                        className="p-3 rounded-xl text-center transition-all"
                        style={
                          quality === opt.value
                            ? {
                                border: '2px solid var(--color-accent)',
                                backgroundColor: 'var(--color-accent-light)'
                              }
                            : {
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'var(--color-bg)'
                              }
                        }
                      >
                        <div className="font-medium text-sm" style={{color: 'var(--color-text)'}}>{opt.label}</div>
                        <div className="text-xs mt-1" style={{color: 'var(--color-text-muted)'}}>{opt.credits}积分</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card-elevated p-6 rounded-2xl">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{color: 'var(--color-text)'}}>
                <SparklesIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                编辑描述
              </h2>
              
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述你想要的效果，例如：将背景改为日落、添加光晕效果、去除背景..."
                className="input resize-none"
                rows={6}
                style={{minHeight: '200px'}}
              />
              
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedImage || !prompt.trim()}
                className={`btn w-full text-base py-4 mt-4 ${
                  !isSubmitting && selectedImage && prompt.trim() ? 'btn-primary' : 'opacity-50 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    提交中...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    开始编辑
                  </>
                )}
              </button>

              {currentGeneration && (
                <div className="mt-4">
                  <div className="w-full h-2 rounded-full" style={{backgroundColor: 'var(--color-border)'}}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${currentGeneration.progress || 0}%`,
                        backgroundColor: currentGeneration.status === 'failed' ? 'var(--color-danger)' : 'var(--color-accent)'
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {currentGeneration.status === 'processing' && (
                      <ClockIcon className="w-4 h-4 animate-pulse" style={{color: 'var(--color-accent)'}} />
                    )}
                    {currentGeneration.status === 'completed' && (
                      <CheckCircleIcon className="w-5 h-5" style={{color: 'var(--color-success)'}} />
                    )}
                    {currentGeneration.status === 'failed' && (
                      <ExclamationCircleIcon className="w-5 h-5" style={{color: 'var(--color-danger)'}} />
                    )}
                    <span className="text-sm" style={{color: 'var(--color-text-muted)'}}>
                      {currentGeneration.message}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {editResults.length > 0 && (
              <div className="card-elevated p-6 rounded-2xl">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{color: 'var(--color-text)'}}>
                  <CheckCircleIcon className="w-5 h-5" style={{color: 'var(--color-success)'}} />
                  编辑结果
                </h2>
                
                <div className="space-y-4">
                  {editResults.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`编辑结果 ${index + 1}`}
                        className="w-full rounded-xl shadow-md"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                        <button
                          onClick={() => handleDownload(url, index)}
                          className="px-4 py-2 rounded-lg font-medium text-white"
                          style={{backgroundColor: 'var(--color-accent)'}}
                        >
                          下载图片
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editResults.length === 0 && !isSubmitting && !currentGeneration && (
              <div className="card-elevated p-6 rounded-2xl text-center">
                <div className="py-12">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{backgroundColor: 'var(--color-accent-light)'}}>
                    <SparklesIcon className="w-10 h-10" style={{color: 'var(--color-accent)'}} />
                  </div>
                  <p className="text-lg font-medium mb-2" style={{color: 'var(--color-text)'}}>
                    上传图片开始编辑
                  </p>
                  <p className="text-sm" style={{color: 'var(--color-text-muted)'}}>
                    支持局部重绘、背景替换、风格转换等多种编辑功能
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
