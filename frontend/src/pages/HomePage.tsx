import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  SparklesIcon, 
  PhotoIcon, 
  AdjustmentsHorizontalIcon, 
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const UploadIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
  </svg>
);

const STYLE_PRESETS = [
  { name: '写实摄影', prompt: 'photorealistic, detailed, 8K, professional photography', icon: '📷' },
  { name: '艺术油画', prompt: 'oil painting, artistic, masterpiece, gallery quality', icon: '🎨' },
  { name: '动漫风格', prompt: 'anime style, vibrant colors, detailed illustration', icon: '✨' },
  { name: '赛博朋克', prompt: 'cyberpunk, neon lights, futuristic cityscape', icon: '🌃' },
  { name: '水墨国画', prompt: 'chinese ink painting, traditional brush strokes', icon: '🖌️' },
  { name: '3D渲染', prompt: '3D render, octane render, detailed textures', icon: '🎮' },
  { name: '插画风格', prompt: 'digital illustration, flat design, vector art', icon: '✏️' },
  { name: '抽象艺术', prompt: 'abstract art, modern art, contemporary', icon: '🎭' },
  { name: '建筑设计', prompt: 'architectural rendering, modern building, exterior design', icon: '🏛️' },
  { name: '产品摄影', prompt: 'product photography, commercial, studio lighting', icon: '📦' },
];

const QUALITY_OPTIONS = [
  { value: 'low', label: '快速模式', credits: 1, desc: '速度最快' },
  { value: 'standard', label: '标准质量', credits: 10, desc: '平衡速度与质量' },
  { value: 'hd', label: '高清品质', credits: 40, desc: '最佳质量' },
];

const SIZE_OPTIONS = [
  { value: '1024x1024', label: '1024×1024' },
  { value: '1024x1536', label: '1024×1536' },
  { value: '1536x1024', label: '1536×1024' },
  { value: 'auto', label: '自适应' },
];

const COUNT_OPTIONS = [1, 2, 4];

const calculateCredits = (quality: string, n: number): number => {
  const map: Record<string, number> = { low: 1, standard: 10, hd: 40 };
  return (map[quality] || 10) * n;
};

interface GenerationStatus {
  id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
  progress?: number;
}

interface HistoryPrompt {
  prompt: string;
  count: number;
  lastUsed: string;
}

export const HomePage = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [quality, setQuality] = useState('standard');
  const [n, setN] = useState(1);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [currentGeneration, setCurrentGeneration] = useState<GenerationStatus | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const userClosedModalRef = useRef(false);
  const [historyPrompts, setHistoryPrompts] = useState<HistoryPrompt[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHistoryPrompts = useCallback(async () => {
    try {
      const response = await api.get('/generations?page=1&page_size=50');
      const generations = response.data.generations || [];
      
      const promptMap = new Map<string, { count: number; lastUsed: string }>();
      
      generations.forEach((gen: any) => {
        if (gen.prompt && gen.status === 'completed') {
          const existing = promptMap.get(gen.prompt);
          if (existing) {
            existing.count += 1;
            if (new Date(gen.created_at) > new Date(existing.lastUsed)) {
              existing.lastUsed = gen.created_at;
            }
          } else {
            promptMap.set(gen.prompt, {
              count: 1,
              lastUsed: gen.created_at
            });
          }
        }
      });
      
      const prompts: HistoryPrompt[] = Array.from(promptMap.entries())
        .map(([prompt, data]) => ({
          prompt,
          count: data.count,
          lastUsed: data.lastUsed
        }))
        .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
        .slice(0, 10);
      
      setHistoryPrompts(prompts);
    } catch (error) {
      console.error('Failed to fetch history prompts:', error);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      api.get('/auth/me').then(res => {
        setUserCredits(res.data.credits || 0);
      }).catch(() => {});
      fetchHistoryPrompts();
    }
  }, [fetchHistoryPrompts]);

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
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const creditsCost = useMemo(() => calculateCredits(quality, n), [quality, n]);

  const pollGenerationStatus = useCallback(async (generationId: number) => {
    const maxAttempts = 60;
    let attempts = 0;
    const currentCreditsCost = calculateCredits(quality, n);

    const poll = async () => {
      if (userClosedModalRef.current) {
        return;
      }
      
      if (attempts >= maxAttempts) {
        setCurrentGeneration(prev => prev?.id === generationId ? {
          ...prev,
          status: 'failed',
          message: '生成超时，请稍后查看历史记录'
        } : prev);
        return;
      }

      try {
        const response = await api.get(`/generations/${generationId}`);
        const gen = response.data;
        
        if (gen.status === 'pending') {
          setCurrentGeneration({
            id: generationId,
            status: 'pending',
            message: '正在排队等待...',
            progress: 10
          });
        } else if (gen.status === 'processing') {
          setCurrentGeneration({
            id: generationId,
            status: 'processing',
            message: 'AI正在创作中...',
            progress: 50
          });
        } else if (gen.status === 'completed') {
          setCurrentGeneration({
            id: generationId,
            status: 'completed',
            message: '生成成功！',
            progress: 100
          });
          
          setUserCredits(prev => prev - currentCreditsCost);
          toast.success('图片生成成功！');
          
          setTimeout(() => {
            setShowFeedback(false);
            setCurrentGeneration(null);
            fetchHistoryPrompts();
            navigate('/history');
          }, 2000);
          return;
        } else if (gen.status === 'failed') {
          setCurrentGeneration({
            id: generationId,
            status: 'failed',
            message: gen.error_message || '生成失败',
            progress: 0
          });
          
          const refundResponse = await api.post(`/generations/${generationId}/refund`);
          if (refundResponse.data.refunded) {
            setUserCredits(prev => prev + currentCreditsCost);
            toast.success(`积分已返还：${refundResponse.data.refunded_credits} 积分已退回账户`);
          }
          
          setTimeout(() => {
            setShowFeedback(false);
            setCurrentGeneration(null);
          }, 3000);
          return;
        }

        attempts++;
        setTimeout(poll, 2000);
      } catch (error: any) {
        if (userClosedModalRef.current) {
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setCurrentGeneration({
            id: generationId,
            status: 'failed',
            message: '状态查询失败',
            progress: 0
          });
          setTimeout(() => {
            setShowFeedback(false);
            setCurrentGeneration(null);
          }, 3000);
        }
      }
    };

    poll();
  }, [quality, n, navigate, fetchHistoryPrompts]);

  const handleClose = () => {
    userClosedModalRef.current = true;
    toast.success('任务已在后台运行，请稍后查看历史记录');
    setShowFeedback(false);
    setCurrentGeneration(null);
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) { toast.error('请输入图片描述'); return; }
    if (!isAuthenticated) { toast.error('请先登录'); return; }
    
    const preset = STYLE_PRESETS.find(s => s.name === selectedStyle);
    const fullPrompt = preset ? `${prompt}, ${preset.prompt}` : prompt;
    
    setShowFeedback(true);
    
    if (selectedImage) {
      setCurrentGeneration({
        id: 0,
        status: 'pending',
        message: '正在提交图片编辑请求...',
        progress: 5
      });
      
      const formData = new FormData();
      formData.append('prompt', fullPrompt);
      formData.append('image', selectedImage);
      formData.append('size', size);
      formData.append('quality', quality);
      formData.append('n', String(n));
      
      try {
        const response = await api.post('/image-edit/upload', formData);
        
        if (response.data.success) {
          setCurrentGeneration({
            id: response.data.generation_id,
            status: 'completed',
            message: '图片编辑成功！',
            progress: 100
          });
          
          setUserCredits(prev => prev - creditsCost);
          toast.success('图片编辑成功！');
          
          setTimeout(() => {
            setShowFeedback(false);
            setCurrentGeneration(null);
            handleClearImage();
            fetchHistoryPrompts();
            navigate('/history');
          }, 2000);
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.detail || '图片编辑失败';
        
        setCurrentGeneration({
          id: 0,
          status: 'failed',
          message: errorMsg,
          progress: 0
        });
        
        toast.error(errorMsg);
        
        setTimeout(() => {
          setShowFeedback(false);
          setCurrentGeneration(null);
        }, 3000);
      }
    } else {
      setCurrentGeneration({
        id: 0,
        status: 'pending',
        message: '正在提交请求...',
        progress: 5
      });
      
      try {
        const response = await api.post('/generations', { 
          prompt: fullPrompt, 
          size, 
          quality, 
          n 
        });
        
        const generation = response.data;
        setCurrentGeneration({
          id: generation.id,
          status: 'pending',
          message: '请求已提交，等待处理...',
          progress: 15
        });
        
        pollGenerationStatus(generation.id);
        fetchHistoryPrompts();
        
      } catch (err: any) {
        const errorMsg = err.response?.data?.detail || '生成失败';
        
        if (err.response?.status === 402) {
          setCurrentGeneration({
            id: 0,
            status: 'failed',
            message: '积分不足：' + errorMsg,
            progress: 0
          });
        } else {
          setCurrentGeneration({
            id: 0,
            status: 'failed',
            message: errorMsg,
            progress: 0
          });
        }
        
        toast.error(errorMsg);
        
        setTimeout(() => {
          setShowFeedback(false);
          setCurrentGeneration(null);
        }, 3000);
      }
    }
  };

  const handleSelectHistoryPrompt = (historyPrompt: HistoryPrompt) => {
    setPrompt(historyPrompt.prompt);
    setShowHistory(false);
    toast.success('已选择历史提示词');
  };

  const getStatusIcon = () => {
    if (!currentGeneration) return null;
    
    switch (currentGeneration.status) {
      case 'pending':
        return <ClockIcon className="w-12 h-12 text-blue-500 animate-pulse" />;
      case 'processing':
        return <ArrowPathIcon className="w-12 h-12 text-amber-500 animate-spin" />;
      case 'completed':
        return <CheckCircleIcon className="w-12 h-12 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="w-12 h-12 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    if (!currentGeneration) return 'var(--color-accent)';
    
    switch (currentGeneration.status) {
      case 'pending':
        return '#3B82F6';
      case 'processing':
        return '#F59E0B';
      case 'completed':
        return '#10B981';
      case 'failed':
        return '#EF4444';
      default:
        return 'var(--color-accent)';
    }
  };

  return (
    <div className="page-container">
      <header className="nav-bar">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-3">
                <div className="nav-logo-icon">AI</div>
                <span className="text-xl font-bold gradient-text">创意工坊</span>
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <Link to="/gallery" className="nav-link">画廊</Link>
                <Link to="/templates" className="nav-link">模板</Link>
                <Link to="/pricing" className="nav-link">定价</Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="badge flex items-center gap-1">
                      <SparklesIcon className="w-4 h-4" />
                      {userCredits} 积分
                    </span>
                    <Link to="/history" className="nav-link">历史</Link>
                    <Link to="/profile" className="nav-link">个人中心</Link>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" className="nav-link">登录</Link>
                  <Link to="/register" className="btn btn-primary">注册</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {showFeedback && currentGeneration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)'}}>
          <div className="card-elevated p-8 max-w-md w-full text-center" style={{animation: 'slideUp 0.3s ease-out'}}>
            <div className="mb-6">
              {getStatusIcon()}
            </div>
            
            <h3 className="text-2xl font-bold mb-3" style={{color: getStatusColor()}}>
              {selectedImage ? (
                <>
                  {currentGeneration.status === 'pending' && '编辑中'}
                  {currentGeneration.status === 'processing' && '编辑中'}
                  {currentGeneration.status === 'completed' && '编辑完成'}
                  {currentGeneration.status === 'failed' && '编辑失败'}
                </>
              ) : (
                <>
                  {currentGeneration.status === 'pending' && '等待开始'}
                  {currentGeneration.status === 'processing' && '创作中'}
                  {currentGeneration.status === 'completed' && '生成成功'}
                  {currentGeneration.status === 'failed' && '生成失败'}
                </>
              )}
            </h3>
            
            <p className="text-lg mb-6" style={{color: 'var(--color-text-muted)'}}>
              {currentGeneration.message}
            </p>
            
            {currentGeneration.status !== 'failed' && currentGeneration.status !== 'completed' && (
              <>
                <div className="w-full h-2 rounded-full mb-4" style={{background: 'var(--color-border)'}}>
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{width: `${currentGeneration.progress || 0}%`, background: getStatusColor()}}
                  />
                </div>
                
                <div className="flex items-center justify-between text-sm mb-6" style={{color: 'var(--color-text-muted)'}}>
                  <span>进度 {currentGeneration.progress || 0}%</span>
                  <span>预计需要 10-30 秒</span>
                </div>
                
                <button
                  onClick={handleClose}
                  className="btn btn-secondary w-full"
                >
                  <ArrowPathIcon className="w-5 h-5" />
                  后台执行
                </button>
              </>
            )}
            
            {currentGeneration.status === 'failed' && (
              <div className="flex items-center justify-center gap-2 p-4 rounded-xl mb-4" style={{background: 'rgba(239, 68, 68, 0.1)'}}>
                <ExclamationTriangleIcon className="w-5 h-5" style={{color: 'var(--color-danger)'}} />
                <span className="text-sm" style={{color: 'var(--color-danger)'}}>积分将自动返还</span>
              </div>
            )}
            
            {currentGeneration.status === 'completed' && (
              <button
                onClick={() => {
                  setShowFeedback(false);
                  setCurrentGeneration(null);
                  navigate('/history');
                }}
                className="btn btn-primary w-full"
              >
                <PhotoIcon className="w-5 h-5" />
                查看我的作品
              </button>
            )}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 sm:px-8 pt-24 pb-20">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3" style={{color: 'var(--color-text)'}}>
            用文字描绘想象
          </h1>
          <p className="text-base sm:text-lg" style={{color: 'var(--color-text-muted)'}}>
            用AI实现你的创意愿景
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-5">
            <div className="card-elevated p-6 rounded-2xl">
              <label className="flex items-center gap-2 text-base font-medium mb-5" style={{color: 'var(--color-text)'}}>
                <PhotoIcon className="w-6 h-6" style={{color: 'var(--color-accent)'}} />
                图像尺寸
              </label>
              <div className="grid grid-cols-2 gap-3">
                {SIZE_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setSize(opt.value)}
                    className={size === opt.value ? 'filter-tag filter-tag-active' : 'filter-tag'}
                    style={{fontSize: '0.75rem', padding: '0.5rem 0.75rem'}}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card-elevated p-6 rounded-2xl">
              <label className="flex items-center gap-2 text-sm font-medium mb-4" style={{color: 'var(--color-text)'}}>
                <SparklesIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                生成质量
              </label>
              <div className="space-y-2">
                {QUALITY_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setQuality(opt.value)}
                    className={`w-full p-3 rounded-xl text-left text-sm transition-all ${quality === opt.value ? 'border-2 shadow-md' : 'hover:shadow-md'}`}
                    style={quality === opt.value ? {borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent-light)'} : {backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)'}}>
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-xs" style={{color: 'var(--color-text-muted)'}}>{opt.credits}积分 · {opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {!isAuthenticated && (
              <div className="card-elevated p-6 rounded-2xl text-center">
                <p className="text-sm mb-4" style={{color: 'var(--color-text-muted)'}}>登录后开始创作</p>
                <Link to="/login" className="btn btn-primary text-sm py-3 w-full rounded-xl">
                  立即登录
                </Link>
                <p className="mt-3 text-xs" style={{color: 'var(--color-text-subtle)'}}>
                  没有账户？<Link to="/register" className="font-medium" style={{color: 'var(--color-accent)'}}>注册</Link>
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-8 space-y-5">
            <div className="card-elevated p-6 rounded-2xl">
              <div className="relative mb-5">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 text-base font-medium" style={{color: 'var(--color-text)'}}>
                    <div className="flex items-center gap-2">
                      <DocumentTextIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                      <span>{selectedImage ? '编辑描述' : '描述你的创意'}</span>
                    </div>
                    {isAuthenticated && (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs" style={{background: 'var(--color-accent-light)', color: 'var(--color-accent)'}}>
                        <span>消耗 {creditsCost} 积分</span>
                      </div>
                    )}
                  </label>
                  {isAuthenticated && historyPrompts.length > 0 && !selectedImage && (
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-medium"
                      style={{
                        background: showHistory ? 'var(--color-accent)' : 'transparent',
                        color: showHistory ? 'white' : 'var(--color-accent)',
                        border: '1px solid var(--color-accent)'
                      }}
                    >
                      <ClipboardDocumentListIcon className="w-4 h-4" />
                      {showHistory ? '关闭' : `历史 (${historyPrompts.length})`}
                    </button>
                  )}
                </div>
                
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder={selectedImage ? "描述你想要的效果，例如：将背景改为日落、添加光晕效果..." : "输入你的创意描述，例如：一只可爱的橘猫躺在阳光下的窗台上..."}
                    className="input resize-none pr-20"
                    rows={6}
                    style={{minHeight: '160px', fontSize: '1rem', width: '100%', paddingBottom: '48px'}}
                  />
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 rounded-lg transition-all flex items-center gap-2"
                      style={{
                        backgroundColor: selectedImage 
                          ? 'var(--color-accent-light)' 
                          : 'var(--color-surface)',
                        border: selectedImage 
                          ? '1px solid var(--color-accent)' 
                          : '1px solid var(--color-border)',
                        color: 'var(--color-accent)'
                      }}
                      title={selectedImage ? '已上传图片，点击可重新上传' : '上传图片进行编辑'}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-accent)';
                        e.currentTarget.style.backgroundColor = 'var(--color-accent-light)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 115, 85, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = selectedImage ? 'var(--color-accent)' : 'var(--color-border)';
                        e.currentTarget.style.backgroundColor = selectedImage ? 'var(--color-accent-light)' : 'var(--color-surface)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <UploadIcon className="w-5 h-5" />
                      <span className="text-xs font-medium" style={{color: selectedImage ? 'var(--color-accent)' : 'var(--color-text-muted)'}}>
                        {selectedImage ? '已上传' : '上传图片'}
                      </span>
                    </button>
                    {selectedImage && (
                      <button
                        onClick={handleClearImage}
                        className="p-2.5 rounded-lg transition-all flex items-center gap-2"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid var(--color-danger)',
                          color: 'var(--color-danger)'
                        }}
                        title="移除图片"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                        }}
                      >
                        <XCircleIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                {selectedImage && (
                  <div className="mt-3 p-3 rounded-lg flex items-center gap-3" style={{background: 'var(--color-bg)', border: '1px solid var(--color-accent)'}}>
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{border: '1px solid var(--color-border)'}}>
                      <img 
                        src={URL.createObjectURL(selectedImage)}
                        alt="预览"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{color: 'var(--color-text)'}}>{selectedImage.name}</p>
                      <p className="text-xs" style={{color: 'var(--color-text-muted)'}}>{(selectedImage.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              {showHistory && historyPrompts.length > 0 && (
                <div className="mb-5 p-5 rounded-xl" style={{background: 'var(--color-bg)', border: '1px solid var(--color-border)'}}>
                  <div className="flex items-center gap-3 mb-4">
                    <ClipboardDocumentListIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                    <span className="text-base font-medium" style={{color: 'var(--color-text)'}}>历史提示词</span>
                  </div>
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-3">
                    {historyPrompts.slice(0, 5).map((item, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectHistoryPrompt(item)}
                        className="w-full text-left p-4 rounded-lg transition-all hover:shadow-md group"
                        style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
                      >
                        <p className="text-sm line-clamp-2" style={{color: 'var(--color-text)'}}>{item.prompt}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-5 p-5 rounded-xl" style={{background: 'var(--color-bg)', border: '1px solid var(--color-border)'}}>
                <label className="flex items-center gap-2 text-base font-medium mb-4" style={{color: 'var(--color-text)'}}>
                  <AdjustmentsHorizontalIcon className="w-6 h-6" style={{color: 'var(--color-accent)'}} />
                  <span>{selectedImage ? '编辑数量' : '生成数量'}</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {COUNT_OPTIONS.map(num => (
                    <button key={num} onClick={() => setN(num)}
                      className="p-3 rounded-xl text-center text-sm transition-all hover:shadow-md"
                      style={n === num ? {borderColor: 'var(--color-accent)', border: '2px solid', backgroundColor: 'var(--color-accent-light)'} : {backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
                      <div className="font-medium">{num}{selectedImage ? '张' : '张'}</div>
                    </button>
                  ))}
                </div>
                {selectedImage && (
                  <p className="mt-2 text-xs" style={{color: 'var(--color-text-muted)'}}>
                    每次编辑消耗 {creditsCost} 积分
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-base font-medium mb-4" style={{color: 'var(--color-text)'}}>
                  <SparklesIcon className="w-6 h-6" style={{color: 'var(--color-accent)'}} />
                  <span>艺术风格</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {STYLE_PRESETS.slice(0, 6).map(style => (
                    <button
                      key={style.name}
                      onClick={() => setSelectedStyle(prev => prev === style.name ? '' : style.name)}
                      className={`filter-tag text-sm px-4 py-2.5 rounded-lg ${selectedStyle === style.name ? 'filter-tag-active' : ''}`}
                    >
                      <span className="text-base">{style.icon}</span>
                      <span>{style.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={showFeedback || !prompt.trim() || !isAuthenticated}
              className={`btn w-full text-lg py-5 rounded-xl ${prompt.trim() && isAuthenticated && !showFeedback ? 'btn-primary' : 'opacity-50 cursor-not-allowed'}`}
            >
              {showFeedback ? (
                <>
                  <ArrowPathIcon className="w-6 h-6 animate-spin" />
                  {selectedImage ? '编辑中...' : '生成中...'}
                </>
              ) : !isAuthenticated ? (
                '请先登录'
              ) : prompt.trim() ? (
                <>
                  <SparklesIcon className="w-6 h-6" />
                  {selectedImage ? '开始编辑' : '开始生成'} · {creditsCost} 积分
                </>
              ) : (
                '请输入描述'
              )}
            </button>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="card-elevated p-8 rounded-2xl text-center hover:shadow-xl transition-all hover:-translate-y-2">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{background: 'linear-gradient(135deg, #8B7355 0%, #A08060 100%)'}}>
              <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-xl mb-3" style={{color: 'var(--color-text)'}}>AI智能生成</h3>
            <p className="text-base" style={{color: 'var(--color-text-muted)'}}>输入描述，AI自动创作</p>
          </div>
          <div className="card-elevated p-8 rounded-2xl text-center hover:shadow-xl transition-all hover:-translate-y-2">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{background: 'linear-gradient(135deg, #8B7355 0%, #A08060 100%)'}}>
              <PhotoIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-xl mb-3" style={{color: 'var(--color-text)'}}>多种尺寸</h3>
            <p className="text-base" style={{color: 'var(--color-text-muted)'}}>支持多种比例</p>
          </div>
          <div className="card-elevated p-8 rounded-2xl text-center hover:shadow-xl transition-all hover:-translate-y-2">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{background: 'linear-gradient(135deg, #8B7355 0%, #A08060 100%)'}}>
              <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-xl mb-3" style={{color: 'var(--color-text)'}}>高清输出</h3>
            <p className="text-base" style={{color: 'var(--color-text-muted)'}}>高质量图像输出</p>
          </div>
        </div>
      </main>
    </div>
  );
};
