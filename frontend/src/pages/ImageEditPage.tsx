import { useState, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PhotoIcon,
  SparklesIcon,
  ArrowPathIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';
import toast from 'react-hot-toast';

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

// =====================================================
// 质量选项（使用标准值：low/medium/high）
// =====================================================
const QUALITY_OPTIONS = [
  { value: 'low', label: '快速模式', credits: 1, desc: '速度最快' },
  { value: 'medium', label: '标准质量', credits: 10, desc: '平衡速度与质量' },
  { value: 'high', label: '高清品质', credits: 40, desc: '最佳质量' },
];

// =====================================================
// 输出格式选项
// =====================================================
const OUTPUT_FORMAT_OPTIONS = [
  { value: 'png', label: 'PNG', desc: '无损质量，支持透明' },
  { value: 'jpeg', label: 'JPEG', desc: '文件较小' },
];

// =====================================================
// 背景设置选项
// =====================================================
const BACKGROUND_OPTIONS = [
  { value: 'auto', label: '自动' },
  { value: 'transparent', label: '透明' },
  { value: 'opaque', label: '不透明' },
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

const calculateCredits = (quality: string, size: string): number => {
  const creditsMap = CREDITS_MAP[quality] || CREDITS_MAP['medium'];
  return creditsMap[size] || creditsMap['1024x1024'] || 10;
};

interface GenerationStatus {
  id: number;
  status: string;
  message?: string;
  progress?: number;
}

export const ImageEditPage = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedMask, setSelectedMask] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [maskPreviewUrl, setMaskPreviewUrl] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [quality, setQuality] = useState('medium');
  const [outputFormat, setOutputFormat] = useState('png');
  const [outputCompression, setOutputCompression] = useState(80);
  const [background, setBackground] = useState('auto');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<GenerationStatus | null>(null);
  const [editResults, setEditResults] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [dragActiveMask, setDragActiveMask] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maskInputRef = useRef<HTMLInputElement>(null);

  const creditsCost = useMemo(() => calculateCredits(quality, size), [quality, size]);

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

  const handleMaskSelect = useCallback((file: File) => {
    if (!file.type.includes('png')) {
      toast.error('遮罩图片必须为 PNG 格式');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过10MB');
      return;
    }

    setSelectedMask(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setMaskPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleMaskInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleMaskSelect(file);
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

  const handleDragMask = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveMask(true);
    } else if (e.type === "dragleave") {
      setDragActiveMask(false);
    }
  }, []);

  const handleDropMask = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveMask(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleMaskSelect(files[0]);
    }
  }, [handleMaskSelect]);

  const handleClearImage = () => {
    setSelectedImage(null);
    setPreviewUrl('');
    setSelectedMask(null);
    setMaskPreviewUrl('');
    setEditResults([]);
    setCurrentGeneration(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (maskInputRef.current) {
      maskInputRef.current.value = '';
    }
  };

  const handleClearMask = () => {
    setSelectedMask(null);
    setMaskPreviewUrl('');
    if (maskInputRef.current) {
      maskInputRef.current.value = '';
    }
  };

  const pollGenerationStatus = useCallback(async (generationId: number) => {
    const maxAttempts = 120;
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
            progress: Math.min(attempts * 2, 90)
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
    formData.append('output_format', outputFormat);
    formData.append('background', background);

    if (selectedMask) {
      formData.append('mask', selectedMask);
    }

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

  const formatInfo = SIZE_OPTIONS.find(s => s.value === size);

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
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-accent)]'
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
                      className="w-full max-h-80 mx-auto rounded-xl shadow-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearImage();
                      }}
                      className="absolute top-2 right-2 p-2 rounded-full transition-all"
                      style={{backgroundColor: 'var(--color-danger)', color: 'white'}}
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
                <ArrowUpTrayIcon className="w-5 h-5" style={{color: 'var(--color-accent)'}} />
                上传遮罩 (可选)
              </h2>

              <div
                className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  dragActiveMask
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-accent)]'
                }`}
                onDragEnter={handleDragMask}
                onDragLeave={handleDragMask}
                onDragOver={handleDragMask}
                onDrop={handleDropMask}
                onClick={() => maskInputRef.current?.click()}
              >
                <input
                  ref={maskInputRef}
                  type="file"
                  accept="image/png"
                  onChange={handleMaskInputChange}
                  className="hidden"
                />

                {maskPreviewUrl ? (
                  <div className="relative">
                    <img
                      src={maskPreviewUrl}
                      alt="Mask Preview"
                      className="w-full max-h-40 mx-auto rounded-xl"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearMask();
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full"
                      style={{backgroundColor: 'var(--color-danger)', color: 'white'}}
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                    <div className="mt-2 text-sm" style={{color: 'var(--color-text-muted)'}}>
                      透明区域表示需要编辑的位置
                    </div>
                  </div>
                ) : (
                  <div className="py-6">
                    <p className="text-sm font-medium mb-1" style={{color: 'var(--color-text)'}}>
                      点击上传 PNG 遮罩 (带 alpha 通道)
                    </p>
                    <p className="text-xs" style={{color: 'var(--color-text-muted)'}}>
                      不上传则编辑整张图片
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
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text)'}}>
                    输出尺寸
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {SIZE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSize(opt.value)}
                        className={`p-2 rounded-lg text-center transition-all ${size === opt.value ? 'border-2' : 'border'}`}
                        style={size === opt.value
                          ? {borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent-light)'}
                          : {borderColor: 'var(--color-border)'}
                        }
                      >
                        <div className="text-xs font-medium">{opt.label}</div>
                        <div className="text-xs opacity-60">{opt.pixels}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text)'}}>
                    输出质量
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {QUALITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setQuality(opt.value)}
                        className={`p-2 rounded-lg text-center transition-all ${quality === opt.value ? 'border-2' : 'border'}`}
                        style={quality === opt.value
                          ? {borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent-light)'}
                          : {borderColor: 'var(--color-border)'}
                        }
                      >
                        <div className="text-xs font-medium">{opt.label}</div>
                        <div className="text-xs opacity-60">{opt.credits}积分</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text)'}}>
                    输出格式
                  </label>
                  <div className="flex gap-2">
                    {OUTPUT_FORMAT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setOutputFormat(opt.value)}
                        className={`flex-1 p-2 rounded-lg text-center text-xs transition-all ${outputFormat === opt.value ? 'border-2' : 'border'}`}
                        style={outputFormat === opt.value
                          ? {borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent-light)'}
                          : {borderColor: 'var(--color-border)'}
                        }
                      >
                        <div className="font-medium">{opt.label}</div>
                        <div className="opacity-60">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {outputFormat === 'png' && (
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text)'}}>
                      背景设置
                    </label>
                    <div className="flex gap-2">
                      {BACKGROUND_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setBackground(opt.value)}
                          className={`flex-1 p-2 rounded-lg text-center text-xs transition-all ${background === opt.value ? 'border-2' : 'border'}`}
                          style={background === opt.value
                            ? {borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent-light)'}
                            : {borderColor: 'var(--color-border)'}
                          }
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t" style={{borderColor: 'var(--color-border)'}}>
                  <div className="flex justify-between text-sm">
                    <span style={{color: 'var(--color-text-muted)'}}>预计消耗</span>
                    <span className="font-bold" style={{color: 'var(--color-accent)'}}>{creditsCost} 积分</span>
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
                    开始编辑 ({creditsCost} 积分)
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