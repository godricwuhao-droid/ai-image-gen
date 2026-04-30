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
  ClipboardDocumentListIcon,
  ArrowDownTrayIcon
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

// =====================================================
// 质量选项（使用标准值：low/medium/high）
// =====================================================
const QUALITY_OPTIONS = [
  { value: 'low', label: '快速模式', credits: 1, desc: '速度最快，适合预览' },
  { value: 'medium', label: '标准质量', credits: 10, desc: '平衡速度与质量（推荐）' },
  { value: 'high', label: '高清品质', credits: 40, desc: '最佳质量，适合最终产出' },
];

// =====================================================
// 尺寸选项（7种标准尺寸）
// =====================================================
const SIZE_OPTIONS = [
  { value: '1024x1024', label: '1024×1024', pixels: '1M', ratio: '1:1' },
  { value: '1024x1536', label: '1024×1536', pixels: '1.5M', ratio: '2:3' },
  { value: '1536x1024', label: '1536×1024', pixels: '1.5M', ratio: '3:2' },
  { value: '2048x2048', label: '2048×2048', pixels: '4M', ratio: '1:1' },
  { value: '2048x1152', label: '2048×1152', pixels: '2.3M', ratio: '16:9' },
  { value: '3840x2160', label: '3840×2160', pixels: '8.3M', ratio: '16:4' },
  { value: '2160x3840', label: '2160×3840', pixels: '8.3M', ratio: '9:16' },
];

const COUNT_OPTIONS = [1, 2, 4];

// =====================================================
// 输出格式选项
// =====================================================
const OUTPUT_FORMAT_OPTIONS = [
  { value: 'png', label: 'PNG', desc: '无损质量，支持透明背景', icon: '📦' },
  { value: 'jpeg', label: 'JPEG', desc: '文件较小，不支持透明', icon: '🗜️' },
];

// =====================================================
// 背景设置选项
// =====================================================
const BACKGROUND_OPTIONS = [
  { value: 'auto', label: '自动检测', desc: 'AI自动判断背景' },
  { value: 'transparent', label: '透明背景', desc: '仅 PNG 支持' },
  { value: 'opaque', label: '不透明背景', desc: '白色背景' },
];

// =====================================================
// 内容审核选项
// =====================================================
const MODERATION_OPTIONS = [
  { value: 'auto', label: '自动审核', desc: '标准内容过滤' },
  { value: 'low', label: '低审核', desc: '可能通过更多内容' },
];

// =====================================================
// 积分计算（基于质量 × 尺寸）
// =====================================================
const CREDITS_MAP: Record<string, Record<string, number>> = {
  low: {
    '1024x1024': 1, '1024x1536': 1, '1536x1024': 1,
    '2048x2048': 2, '2048x1152': 1, '3840x2160': 2, '2160x3840': 2
  },
  medium: {
    '1024x1024': 10, '1024x1536': 8, '1536x1024': 8,
    '2048x2048': 20, '2048x1152': 8, '3840x2160': 19, '2160x3840': 19
  },
  high: {
    '1024x1024': 40, '1024x1536': 32, '1536x1024': 32,
    '2048x2048': 81, '2048x1152': 32, '3840x2160': 76, '2160x3840': 76
  },
};

const calculateCredits = (quality: string, size: string, n: number): number => {
  const creditsMap = CREDITS_MAP[quality] || CREDITS_MAP['medium'];
  const creditsPerImage = creditsMap[size] || creditsMap['1024x1024'] || 10;
  return creditsPerImage * n;
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
  const [quality, setQuality] = useState('medium');
  const [n, setN] = useState(1);
  const [outputFormat, setOutputFormat] = useState('png');
  const [outputCompression, setOutputCompression] = useState(80);
  const [background, setBackground] = useState('auto');
  const [moderation, setModeration] = useState('auto');
  const [showAdvanced, setShowAdvanced] = useState(false);
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

  const creditsCost = useMemo(() => calculateCredits(quality, size, n), [quality, size, n]);

  const pollGenerationStatus = useCallback(async (generationId: number) => {
    const maxAttempts = 120;
    let attempts = 0;
    const currentCreditsCost = calculateCredits(quality, size, n);

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
  }, [quality, size, n, navigate, fetchHistoryPrompts]);

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
      formData.append('output_format', outputFormat);
      formData.append('background', background);

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
          n,
          output_format: outputFormat,
          background,
          moderation,
          output_compression: outputFormat === 'jpeg' ? outputCompression : undefined,
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

  const formatInfo = SIZE_OPTIONS.find(s => s.value === size);

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
                  <span>预计需要 10-60 秒</span>
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
                    style={{fontSize: '0.7rem', padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'}}>
                    <span>{opt.label}</span>
                    <span style={{opacity: 0.6, fontSize: '0.6rem'}}>{opt.pixels} {opt.ratio}</span>
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

            <div className="card-elevated p-6 rounded-2xl">
              <label className="flex items-center gap-2 text-sm font-medium mb-4" style={{color: 'var(--color-text)'}}>
                <AdjustmentsHorizontalIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                输出设置
              </label>

              <div className="space-y-4">
                <div>
                  <div className="text-xs font-medium mb-2" style={{color: 'var(--color-text-muted)'}}>输出格式</div>
                  <div className="flex gap-2">
                    {OUTPUT_FORMAT_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setOutputFormat(opt.value)}
                        className={`flex-1 p-2 rounded-lg text-sm transition-all ${outputFormat === opt.value ? 'border-2' : 'hover:border'}`}
                        style={outputFormat === opt.value ? {borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent-light)'} : {border: '1px solid var(--color-border)'}}>
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-xs" style={{color: 'var(--color-text-muted)'}}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {outputFormat === 'jpeg' && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2" style={{color: 'var(--color-text-muted)'}}>
                      <span>压缩等级</span>
                      <span>{outputCompression}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={outputCompression}
                      onChange={(e) => setOutputCompression(Number(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      style={{background: 'var(--color-border)'}} />
                  </div>
                )}

                {outputFormat === 'png' && (
                  <div>
                    <div className="text-xs font-medium mb-2" style={{color: 'var(--color-text-muted)'}}>背景设置</div>
                    <div className="space-y-1">
                      {BACKGROUND_OPTIONS.map(opt => (
                        <button key={opt.value} onClick={() => setBackground(opt.value)}
                          className={`w-full p-2 rounded-lg text-left text-xs transition-all ${background === opt.value ? 'border-2' : 'hover:border'}`}
                          style={background === opt.value ? {borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent-light)'} : {border: '1px solid var(--color-border)'}}>
                          <div className="font-medium">{opt.label}</div>
                          <div style={{color: 'var(--color-text-muted)'}}>{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs font-medium mb-2" style={{color: 'var(--color-text-muted)'}}>内容审核</div>
                  <div className="space-y-1">
                    {MODERATION_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setModeration(opt.value)}
                        className={`w-full p-2 rounded-lg text-left text-xs transition-all ${moderation === opt.value ? 'border-2' : 'hover:border'}`}
                        style={moderation === opt.value ? {borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent-light)'} : {border: '1px solid var(--color-border)'}}>
                        <div className="font-medium">{opt.label}</div>
                        <div style={{color: 'var(--color-text-muted)'}}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="card-elevated p-6 rounded-2xl">
              <label className="flex items-center gap-2 text-sm font-medium mb-5" style={{color: 'var(--color-text)'}}>
                <SparklesIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                生成数量
              </label>
              <div className="grid grid-cols-3 gap-3">
                {COUNT_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => setN(opt)}
                    className={n === opt ? 'filter-tag filter-tag-active' : 'filter-tag'}>
                    {opt} 张
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || !isAuthenticated}
              className="btn btn-primary w-full py-4 text-lg"
              style={{background: 'var(--gradient-primary)'}}
            >
              <SparklesIcon className="w-6 h-6 mr-2" />
              生成图片 ({creditsCost} 积分)
            </button>
          </div>

          <div className="lg:col-span-8">
            <div className="card-elevated p-8 rounded-2xl min-h-[600px]">
              <div className="relative mb-6">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="描述你想要生成的图片...&#10;&#10;例如：一只橙色虎斑猫坐在花园里，阳光透过树叶洒落"
                  className="w-full h-48 p-4 rounded-xl text-lg resize-none focus:outline-none focus:ring-2 focus:ring-2"
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                    '--tw-ring-color': 'var(--color-accent)'
                  } as React.CSSProperties}
                />

                <div className="absolute bottom-4 right-4 flex gap-2">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="p-2 rounded-lg hover:bg-[color:var(--color-accent-light)] transition-colors"
                    style={{color: 'var(--color-text-muted)'}}
                    title="历史提示词"
                  >
                    <ClipboardDocumentListIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="p-2 rounded-lg hover:bg-[color:var(--color-accent-light)] transition-colors"
                    style={{color: 'var(--color-text-muted)'}}
                    title="高级选项"
                  >
                    <AdjustmentsHorizontalIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {showHistory && (
                <div className="mb-6 p-4 rounded-xl animate-fade-in" style={{background: 'var(--color-surface)'}}>
                  <div className="text-sm font-medium mb-3" style={{color: 'var(--color-text)'}}>历史提示词</div>
                  {historyPrompts.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {historyPrompts.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectHistoryPrompt(item)}
                          className="badge badge-secondary truncate max-w-[200px]"
                          title={item.prompt}
                        >
                          {item.prompt.slice(0, 30)}...
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm" style={{color: 'var(--color-text-muted)'}}>暂无历史记录</div>
                  )}
                </div>
              )}

              {prompt && (
                <div className="mb-6 flex flex-wrap gap-2">
                  <div className="text-sm font-medium" style={{color: 'var(--color-text-muted)'}}>风格：</div>
                  {STYLE_PRESETS.map(opt => (
                    <button
                      key={opt.name}
                      onClick={() => setSelectedStyle(selectedStyle === opt.name ? '' : opt.name)}
                      className={`filter-tag ${selectedStyle === opt.name ? 'filter-tag-active' : ''}`}
                    >
                      <span className="mr-1">{opt.icon}</span>
                      {opt.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 mb-6" style={{color: 'var(--color-text-muted)'}}>
                <DocumentTextIcon className="w-5 h-5" />
                <span className="text-sm">提示词指南</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="p-5 rounded-xl" style={{background: 'var(--color-surface)'}}>
                  <div className="text-base font-medium mb-3" style={{color: 'var(--color-text)'}}>推荐写法</div>
                  <div className="space-y-2">
                    <div className="text-sm" style={{color: 'var(--color-text-muted)'}}>✓ 具体描述主体、场景、动作</div>
                    <div className="text-sm" style={{color: 'var(--color-text-muted)'}}>✓ 添加风格关键词（摄影/油画/动漫）</div>
                    <div className="text-sm" style={{color: 'var(--color-text-muted)'}}>✓ 说明光线、色彩、氛围</div>
                    <div className="text-sm" style={{color: 'var(--color-text-muted)'}}>✓ 使用英文关键词效果更佳</div>
                  </div>
                </div>

                <div className="p-5 rounded-xl" style={{background: 'var(--color-surface)'}}>
                  <div className="text-base font-medium mb-3" style={{color: 'var(--color-text)'}}>避免写法</div>
                  <div className="space-y-2">
                    <div className="text-sm" style={{color: 'var(--color-text-muted)'}}>✗ 过于简单或模糊的描述</div>
                    <div className="text-sm" style={{color: 'var(--color-text-muted)'}}>✗ 包含多个相互冲突的指令</div>
                    <div className="text-sm" style={{color: 'var(--color-text-muted)'}}>✗ 要求生成文字或特定品牌</div>
                    <div className="text-sm" style={{color: 'var(--color-text-muted)'}}>✗ 提及真实人物姓名</div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl" style={{background: 'var(--color-accent-light)'}}>
                <div className="flex items-start gap-3">
                  <SparklesIcon className="w-6 h-6 mt-1" style={{color: 'var(--color-accent)'}} />
                  <div>
                    <div className="text-base font-medium mb-2" style={{color: 'var(--color-text)'}}>
                      当前设置预览
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-xs" style={{color: 'var(--color-text-muted)'}}>尺寸</div>
                        <div className="font-medium" style={{color: 'var(--color-text)'}}>
                          {formatInfo?.label} ({formatInfo?.pixels})
                        </div>
                      </div>
                      <div>
                        <div className="text-xs" style={{color: 'var(--color-text-muted)'}}>质量</div>
                        <div className="font-medium" style={{color: 'var(--color-text)'}}>
                          {QUALITY_OPTIONS.find(q => q.value === quality)?.label}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs" style={{color: 'var(--color-text-muted)'}}>格式</div>
                        <div className="font-medium" style={{color: 'var(--color-text)'}}>
                          {outputFormat.toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs" style={{color: 'var(--color-text-muted)'}}>数量</div>
                        <div className="font-medium" style={{color: 'var(--color-text)'}}>{n} 张</div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t" style={{borderColor: 'var(--color-border)'}}>
                      <div className="text-sm" style={{color: 'var(--color-text-muted)'}}>
                        预计消耗：<span className="font-bold" style={{color: 'var(--color-accent)'}}>{creditsCost} 积分</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};