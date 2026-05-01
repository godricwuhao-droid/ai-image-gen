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
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const STYLE_PRESETS = [
  { name: '写实摄影', prompt: 'photorealistic, detailed, 8K, professional photography', icon: '📷' },
  { name: '艺术油画', prompt: 'oil painting, artistic, masterpiece, gallery quality', icon: '🎨' },
  { name: '动漫风格', prompt: 'anime style, vibrant colors, detailed illustration', icon: '✨' },
  { name: '赛博朋克', prompt: 'cyberpunk, neon lights, futuristic cityscape', icon: '🌃' },
  { name: '水墨国画', prompt: 'chinese ink painting, traditional brush strokes', icon: '🖌️' },
  { name: '3D渲染', prompt: '3D render, octane render, detailed textures', icon: '🎮' },
  { name: '插画风格', prompt: 'digital illustration, flat design, vector art', icon: '✏️' },
  { name: '抽象艺术', prompt: 'abstract art, modern art, contemporary', icon: '🎭' },
];

const SIZE_OPTIONS = [
  { value: '1024x1024', label: '1024²', pixels: '1M' },
  { value: '1024x1536', label: '1024×1536', pixels: '1.5M' },
  { value: '1536x1024', label: '1536×1024', pixels: '1.5M' },
  { value: '2048x2048', label: '2048²', pixels: '4M' },
  { value: '2048x1152', label: '2048×1152', pixels: '2.3M' },
  { value: '3840x2160', label: '4K', pixels: '8.3M' },
  { value: '2160x3840', label: '4K竖版', pixels: '8.3M' },
];

const QUALITY_OPTIONS = [
  { value: 'low', label: '快速', credits: 1, desc: '预览' },
  { value: 'medium', label: '标准', credits: 10, desc: '推荐' },
  { value: 'high', label: '高清', credits: 40, desc: '最佳' },
];

const COUNT_OPTIONS = [1, 2, 4];

const OUTPUT_FORMAT_OPTIONS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
];

const BACKGROUND_OPTIONS = [
  { value: 'auto', label: '自动' },
  { value: 'transparent', label: '透明' },
  { value: 'opaque', label: '不透明' },
];

const MODERATION_OPTIONS = [
  { value: 'auto', label: '自动审核' },
  { value: 'low', label: '低审核' },
];

const CREDITS_MAP: Record<string, Record<string, number>> = {
  low: { '1024x1024': 1, '1024x1536': 1, '1536x1024': 1, '2048x2048': 2, '2048x1152': 1, '3840x2160': 2, '2160x3840': 2 },
  medium: { '1024x1024': 10, '1024x1536': 8, '1536x1024': 8, '2048x2048': 20, '2048x1152': 8, '3840x2160': 19, '2160x3840': 19 },
  high: { '1024x1024': 40, '1024x1536': 32, '1536x1024': 32, '2048x2048': 81, '2048x1152': 32, '3840x2160': 76, '2160x3840': 76 },
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [currentGeneration, setCurrentGeneration] = useState<GenerationStatus | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const userClosedModalRef = useRef(false);
  const [historyPrompts, setHistoryPrompts] = useState<{ prompt: string; count: number; lastUsed: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
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
            promptMap.set(gen.prompt, { count: 1, lastUsed: gen.created_at });
          }
        }
      });
      const prompts = Array.from(promptMap.entries())
        .map(([prompt, data]) => ({ prompt, count: data.count, lastUsed: data.lastUsed }))
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error('请上传图片文件');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('图片大小不能超过10MB');
        return;
      }
    }
    
    const newFiles = [...selectedImages, ...files].slice(0, 10);
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    
    if (imagePreviews.length > 0) {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    }
    
    setSelectedImages(newFiles);
    setImagePreviews(newPreviews);
  };

  const creditsCost = useMemo(() => calculateCredits(quality, size, n), [quality, size, n]);

  const pollGenerationStatus = useCallback(async (generationId: number) => {
    const maxAttempts = 120;
    let attempts = 0;
    const currentCreditsCost = calculateCredits(quality, size, n);

    const poll = async () => {
      if (userClosedModalRef.current) return;
      if (attempts >= maxAttempts) {
        setCurrentGeneration(prev => prev?.id === generationId ? { ...prev, status: 'failed', message: '生成超时' } : prev);
        return;
      }
      try {
        const response = await api.get(`/generations/${generationId}`);
        const gen = response.data;
        if (gen.status === 'pending') {
          setCurrentGeneration({ id: generationId, status: 'pending', message: '正在排队...', progress: 10 });
        } else if (gen.status === 'processing') {
          setCurrentGeneration({ id: generationId, status: 'processing', message: 'AI创作中...', progress: 50 });
        } else if (gen.status === 'completed') {
          setCurrentGeneration({ id: generationId, status: 'completed', message: '生成成功！', progress: 100 });
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
          setCurrentGeneration({ id: generationId, status: 'failed', message: gen.error_message || '生成失败', progress: 0 });
          const refundResponse = await api.post(`/generations/${generationId}/refund`);
          if (refundResponse.data.refunded) {
            setUserCredits(prev => prev + currentCreditsCost);
            toast.success(`积分已返还：${refundResponse.data.refunded_credits}`);
          }
          setTimeout(() => { setShowFeedback(false); setCurrentGeneration(null); }, 3000);
          return;
        }
        attempts++;
        setTimeout(poll, 2000);
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) setTimeout(poll, 2000);
        else { setCurrentGeneration({ id: generationId, status: 'failed', message: '状态查询失败' }); setTimeout(() => { setShowFeedback(false); setCurrentGeneration(null); }, 3000); }
      }
    };
    poll();
  }, [quality, size, n, navigate, fetchHistoryPrompts]);

  const handleClose = () => {
    userClosedModalRef.current = true;
    toast.success('任务已在后台运行');
    setShowFeedback(false);
    setCurrentGeneration(null);
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) { toast.error('请输入图片描述'); return; }
    if (!isAuthenticated) { toast.error('请先登录'); return; }

    const preset = STYLE_PRESETS.find(s => s.name === selectedStyle);
    const fullPrompt = preset ? `${prompt}, ${preset.prompt}` : prompt;

    setShowFeedback(true);

    if (selectedImages.length > 0) {
      setCurrentGeneration({ id: 0, status: 'pending', message: '正在提交图片编辑请求...', progress: 5 });
      const formData = new FormData();
      formData.append('prompt', fullPrompt);
      
      selectedImages.forEach(file => {
        formData.append('image', file);
      });
      
      formData.append('size', size);
      formData.append('quality', quality);
      formData.append('background', background);

      try {
        const response = await api.post('/image-to-image', formData);
        if (response.data.success) {
          const generationId = response.data.generation_id;
          setCurrentGeneration({ id: generationId, status: 'pending', message: '图片编辑任务已提交...', progress: 15 });
          pollGenerationStatus(generationId);
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.detail || '图片编辑失败';
        setCurrentGeneration({ id: 0, status: 'failed', message: errorMsg, progress: 0 });
        toast.error(errorMsg);
        setTimeout(() => { setShowFeedback(false); setCurrentGeneration(null); }, 3000);
      }
    } else {
      setCurrentGeneration({ id: 0, status: 'pending', message: '正在提交请求...', progress: 5 });
      try {
        const response = await api.post('/generations', {
          prompt: fullPrompt, size, quality, n,
          output_format: outputFormat,
          background,
          moderation,
          output_compression: outputFormat === 'jpeg' ? outputCompression : undefined,
        });
        const generation = response.data;
        setCurrentGeneration({ id: generation.id, status: 'pending', message: '请求已提交...', progress: 15 });
        pollGenerationStatus(generation.id);
        fetchHistoryPrompts();
      } catch (err: any) {
        const errorMsg = err.response?.data?.detail || '生成失败';
        setCurrentGeneration({ id: 0, status: 'failed', message: errorMsg, progress: 0 });
        toast.error(errorMsg);
        setTimeout(() => { setShowFeedback(false); setCurrentGeneration(null); }, 3000);
      }
    }
  };

  const getStatusIcon = () => {
    if (!currentGeneration) return null;
    switch (currentGeneration.status) {
      case 'pending': return <ClockIcon className="w-12 h-12 text-blue-500 animate-pulse" />;
      case 'processing': return <ArrowPathIcon className="w-12 h-12 text-amber-500 animate-spin" />;
      case 'completed': return <CheckCircleIcon className="w-12 h-12 text-green-500" />;
      case 'failed': return <XCircleIcon className="w-12 h-12 text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = () => {
    if (!currentGeneration) return 'var(--color-accent)';
    switch (currentGeneration.status) {
      case 'pending': return '#3B82F6';
      case 'processing': return '#F59E0B';
      case 'completed': return '#10B981';
      case 'failed': return '#EF4444';
      default: return 'var(--color-accent)';
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
                  <Link to="/history" className="nav-link">历史</Link>
                  <Link to="/profile" className="nav-link">个人中心</Link>
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

      {isAuthenticated && (
        <div className="border-b" style={{borderColor: 'var(--color-border)', background: 'var(--color-surface)'}}>
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
              <span className="text-sm" style={{color: 'var(--color-text-muted)'}}>我的积分</span>
              <span className="text-lg font-bold" style={{color: 'var(--color-accent)'}}>{userCredits}</span>
              <span className="text-sm" style={{color: 'var(--color-text-muted)'}}>积分</span>
            </div>
            <Link to="/history" className="flex items-center gap-2 text-sm hover:opacity-80" style={{color: 'var(--color-text-muted)'}}>
              <ArrowTrendingUpIcon className="w-4 h-4" />
              查看历史记录
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-4">
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim() || !isAuthenticated}
          className="btn btn-primary w-full py-4 text-lg max-w-2xl mx-auto flex items-center justify-center gap-2"
          style={{background: 'var(--color-accent-gradient)', color: 'white'}}
        >
          <SparklesIcon className="w-6 h-6" />
          <span>
            {isAuthenticated && prompt.trim() ? (
              selectedImages.length > 0 
                ? `编辑图片 (${creditsCost}积分)` 
                : `生成图片 (${creditsCost}积分)`
            ) : '请输入描述'}
          </span>
        </button>
      </div>

      {showFeedback && currentGeneration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)'}}>
          <div className="card-elevated p-8 max-w-md w-full text-center" style={{animation: 'slideUp 0.3s ease-out'}}>
            <div className="mb-6">{getStatusIcon()}</div>
            <h3 className="text-2xl font-bold mb-3" style={{color: getStatusColor()}}>
              {selectedImages.length > 0 ? (currentGeneration.status === 'completed' ? '编辑完成' : currentGeneration.status === 'failed' ? '编辑失败' : '编辑中') : (currentGeneration.status === 'completed' ? '生成成功' : currentGeneration.status === 'failed' ? '生成失败' : currentGeneration.status === 'pending' ? '等待开始' : '创作中')}
            </h3>
            <p className="text-lg mb-6" style={{color: 'var(--color-text-muted)'}}>{currentGeneration.message}</p>
            {currentGeneration.status !== 'failed' && currentGeneration.status !== 'completed' && (
              <>
                <div className="w-full h-2 rounded-full mb-4" style={{background: 'var(--color-border)'}}>
                  <div className="h-full rounded-full transition-all duration-500" style={{width: `${currentGeneration.progress || 0}%`, background: getStatusColor()}} />
                </div>
                <button onClick={handleClose} className="btn btn-secondary w-full">
                  <ArrowPathIcon className="w-5 h-5" /> 后台执行
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
              <button onClick={() => { setShowFeedback(false); setCurrentGeneration(null); navigate('/history'); }} className="btn btn-primary w-full">
                <PhotoIcon className="w-5 h-5" /> 查看我的作品
              </button>
            )}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          <div className="w-80 shrink-0 space-y-4">
            <div className="card-elevated p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <PhotoIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                <span className="font-medium">图像尺寸</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SIZE_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setSize(opt.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${size === opt.value ? 'border-2' : 'border hover:border-[var(--color-accent)]'}`}
                    style={size === opt.value ? {borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent-light)'} : {borderColor: 'var(--color-border)'}}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card-elevated p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <SparklesIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                <span className="font-medium">生成质量</span>
              </div>
              <div className="flex gap-2">
                {QUALITY_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setQuality(opt.value)}
                    className={`flex-1 p-3 rounded-xl text-center transition-all ${quality === opt.value ? 'border-2' : 'border hover:border-[var(--color-accent)]'}`}
                    style={quality === opt.value ? {borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent-light)'} : {borderColor: 'var(--color-border)'}}>
                    <div className="font-medium text-sm">{opt.label}</div>
                    <div className="text-xs" style={{color: 'var(--color-text-muted)'}}>{opt.credits}积分</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="card-elevated p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-medium">生成数量</span>
              </div>
              <div className="flex gap-2">
                {COUNT_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => setN(opt)}
                    className={`flex-1 p-3 rounded-xl text-center font-medium transition-all ${n === opt ? 'border-2' : 'border hover:border-[var(--color-accent)]'}`}
                    style={n === opt ? {borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent-light)'} : {borderColor: 'var(--color-border)'}}>
                    {opt} 张
                  </button>
                ))}
              </div>
            </div>

            <div className="card-elevated p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AdjustmentsHorizontalIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                  <span className="font-medium">高级选项</span>
                  {selectedImages.length > 0 && (
                    <span className="text-xs px-2 py-1 rounded" style={{background: 'var(--color-surface)', color: 'var(--color-text-muted)'}}>
                      图片编辑不支持
                    </span>
                  )}
                </div>
                {selectedImages.length > 0 ? (
                  <span style={{color: 'var(--color-text-muted)', opacity: 0.5}}>已禁用</span>
                ) : (
                  <span style={{color: 'var(--color-text-muted)'}}>点击展开</span>
                )}
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-xs mb-2" style={{color: 'var(--color-text-muted)'}}>输出格式</div>
                  <div className="flex gap-2">
                    {OUTPUT_FORMAT_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => selectedImages.length === 0 && setOutputFormat(opt.value)}
                        disabled={selectedImages.length > 0}
                        className={`flex-1 p-2 rounded-lg text-center text-sm ${outputFormat === opt.value ? 'border-2' : 'border'}`}
                        style={outputFormat === opt.value ? {borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent-light)'} : {borderColor: 'var(--color-border)', opacity: selectedImages.length > 0 ? 0.5 : 1, cursor: selectedImages.length > 0 ? 'not-allowed' : 'pointer'}}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedImages.length === 0 && outputFormat === 'jpeg' && (
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

                <div>
                  <div className="text-xs mb-2" style={{color: 'var(--color-text-muted)'}}>背景设置</div>
                  <div className="flex gap-2">
                    {BACKGROUND_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => selectedImages.length === 0 && setBackground(opt.value)}
                        disabled={selectedImages.length > 0}
                        className={`flex-1 p-2 rounded-lg text-center text-xs ${background === opt.value ? 'border-2' : 'border'}`}
                        style={background === opt.value ? {borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent-light)'} : {borderColor: 'var(--color-border)', opacity: selectedImages.length > 0 ? 0.5 : 1, cursor: selectedImages.length > 0 ? 'not-allowed' : 'pointer'}}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs mb-2" style={{color: 'var(--color-text-muted)'}}>内容审核</div>
                  <div className="flex gap-2">
                    {MODERATION_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => selectedImages.length === 0 && setModeration(opt.value)}
                        disabled={selectedImages.length > 0}
                        className={`flex-1 p-2 rounded-lg text-center text-xs ${moderation === opt.value ? 'border-2' : 'border'}`}
                        style={moderation === opt.value ? {borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent-light)'} : {borderColor: 'var(--color-border)', opacity: selectedImages.length > 0 ? 0.5 : 1, cursor: selectedImages.length > 0 ? 'not-allowed' : 'pointer'}}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="card-elevated p-6 rounded-xl">
              <div className="mb-4">
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="描述你想要生成的图片..."
                    className="w-full h-40 p-4 rounded-xl text-base resize-none focus:outline-none focus:ring-2"
                    style={{background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)'}}
                  />

                  <input ref={fileInputRef} type="file" accept="image/*" multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <button onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-lg hover:bg-[var(--color-accent-light)] transition-colors"
                      style={{color: 'var(--color-text-muted)'}} title="上传图片编辑（支持多张）">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                      </svg>
                    </button>
                    <button onClick={() => setShowHistory(!showHistory)}
                      className="p-2 rounded-lg hover:bg-[var(--color-accent-light)] transition-colors"
                      style={{color: 'var(--color-text-muted)'}} title="历史提示词">
                      <ClipboardDocumentListIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {selectedImages.length > 0 && (
                <div className="mb-4 p-3 rounded-lg" style={{background: 'var(--color-surface)'}}>
                  <div className="flex items-center gap-2 mb-3">
                    <PhotoIcon className="w-4 h-4" style={{color: 'var(--color-accent)'}} />
                    <span className="text-sm font-medium">已选 {selectedImages.length} 张图片</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative">
                        <img src={preview} alt={`预览 ${idx + 1}`} className="w-16 h-16 object-cover rounded-lg" />
                        <button 
                          onClick={() => {
                            const newFiles = selectedImages.filter((_, i) => i !== idx);
                            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
                            URL.revokeObjectURL(preview);
                            setSelectedImages(newFiles);
                            setImagePreviews(newPreviews);
                          }}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-16 h-16 border-2 border-dashed rounded-lg flex items-center justify-center"
                      style={{borderColor: 'var(--color-border)'}}
                    >
                      <span style={{color: 'var(--color-text-muted)'}}>+</span>
                    </button>
                  </div>
                </div>
              )}

              {showHistory && (
                <div className="mb-4 p-3 rounded-lg" style={{background: 'var(--color-surface)'}}>
                  <div className="text-sm font-medium mb-2">历史提示词</div>
                  {historyPrompts.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {historyPrompts.map((item, idx) => (
                        <button key={idx} onClick={() => { setPrompt(item.prompt); setShowHistory(false); }}
                          className="badge badge-secondary truncate max-w-[150px]" title={item.prompt}>
                          {item.prompt.slice(0, 20)}...
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm" style={{color: 'var(--color-text-muted)'}}>暂无历史记录</div>
                  )}
                </div>
              )}

              {prompt && (
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="text-sm" style={{color: 'var(--color-text-muted)'}}>风格：</span>
                  {STYLE_PRESETS.map(opt => (
                    <button key={opt.name} onClick={() => setSelectedStyle(selectedStyle === opt.name ? '' : opt.name)}
                      className={`filter-tag ${selectedStyle === opt.name ? 'filter-tag-active' : ''}`}>
                      <span className="mr-1">{opt.icon}</span>{opt.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 mb-4" style={{color: 'var(--color-text-muted)'}}>
                <DocumentTextIcon className="w-5 h-5" />
                <span className="text-sm">提示词指南</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 rounded-lg" style={{background: 'var(--color-surface)'}}>
                  <div className="font-medium mb-2">✓ 推荐写法</div>
                  <div className="text-sm space-y-1" style={{color: 'var(--color-text-muted)'}}>
                    <div>• 具体描述主体、场景、动作</div>
                    <div>• 添加风格关键词</div>
                    <div>• 说明光线、色彩、氛围</div>
                    <div>• 使用英文关键词效果更佳</div>
                  </div>
                </div>
                <div className="p-4 rounded-lg" style={{background: 'var(--color-surface)'}}>
                  <div className="font-medium mb-2">✗ 避免写法</div>
                  <div className="text-sm space-y-1" style={{color: 'var(--color-text-muted)'}}>
                    <div>• 过于简单或模糊的描述</div>
                    <div>• 多个相互冲突的指令</div>
                    <div>• 要求生成特定文字</div>
                    <div>• 提及真实人物姓名</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg" style={{background: 'var(--color-accent-light)'}}>
                <div className="flex items-center gap-2 mb-3">
                  <SparklesIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                  <span className="font-medium">当前设置</span>
                </div>
                <div className="flex items-center gap-6 text-sm flex-wrap">
                  <div>
                    <span style={{color: 'var(--color-text-muted)'}}>尺寸：</span>
                    <span className="font-medium">{size}</span>
                  </div>
                  <div>
                    <span style={{color: 'var(--color-text-muted)'}}>质量：</span>
                    <span className="font-medium">{QUALITY_OPTIONS.find(q => q.value === quality)?.label}</span>
                  </div>
                  <div>
                    <span style={{color: 'var(--color-text-muted)'}}>格式：</span>
                    <span className="font-medium">{outputFormat.toUpperCase()}</span>
                  </div>
                  <div>
                    <span style={{color: 'var(--color-text-muted)'}}>数量：</span>
                    <span className="font-medium">{n}张</span>
                  </div>
                  <div>
                    <span style={{color: 'var(--color-text-muted)'}}>消耗：</span>
                    <span className="font-bold" style={{color: 'var(--color-accent)'}}>{creditsCost}积分</span>
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