import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import toast from 'react-hot-toast';

export const ResultPage: React.FC = () => {
  const { currentGeneration, fetchGeneration, error } = useStore();
  const navigate = useNavigate();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!currentGeneration || currentGeneration.status === 'completed' || currentGeneration.status === 'failed') {
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('token');
    if (!token) return;

    const eventSource = new EventSource(
      `${API_URL}/api/v1/events/generation/${currentGeneration.id}?token=${token}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'completed') {
          toast.success('图片生成成功！');
          fetchGeneration(currentGeneration.id);
        } else if (data.status === 'failed') {
          toast.error(data.error || '图片生成失败');
          fetchGeneration(currentGeneration.id);
        }
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    eventSource.onerror = () => {
      console.log('SSE connection error, falling back to polling');
      eventSource.close();
    };

    eventSourceRef.current = eventSource;

    const pollInterval = setInterval(() => {
      if (currentGeneration && currentGeneration.status !== 'completed' && currentGeneration.status !== 'failed') {
        fetchGeneration(currentGeneration.id);
      }
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      eventSource.close();
    };
  }, [currentGeneration?.id, currentGeneration?.status]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (currentGeneration?.status === 'completed') {
      toast.success('图片生成成功！');
    } else if (currentGeneration?.status === 'failed') {
      toast.error(currentGeneration.error_message || '生成失败');
    }
  }, [currentGeneration?.status]);

  if (!currentGeneration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">未找到生成记录</p>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-medium rounded-full">
            返回主页
          </button>
        </div>
      </div>
    );
  }

  const getStatusMessage = () => {
    switch (currentGeneration.status) {
      case 'pending':
        return '等待中...';
      case 'processing':
        return '图片生成中，请稍候...';
      case 'completed':
        return '生成成功！';
      case 'failed':
        return currentGeneration.error_message || '生成失败，请重试';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100">
      <header className="bg-white/80 backdrop-blur-xl border-b">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">生成结果</h1>
          <div className="w-9"></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">生成状态</h2>
            <p className="text-gray-600">
              {currentGeneration.status === 'processing' || currentGeneration.status === 'pending' ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full"></span>
                  {getStatusMessage()}
                </span>
              ) : getStatusMessage()}
            </p>
          </div>

          {currentGeneration.status === 'failed' && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
              {currentGeneration.error_message || '生成失败，请重试'}
            </div>
          )}

          {(currentGeneration.status === 'pending' || currentGeneration.status === 'processing') && (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-500">图片生成中，请稍候...</p>
              </div>
            </div>
          )}

          {currentGeneration.status === 'completed' && currentGeneration.images && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentGeneration.images.map((image: any, index: number) => (
                <div key={index} className="relative group">
                  <img
                    src={typeof image === 'string' ? image : image.url}
                    alt={`Generated image ${index + 1}`}
                    className="w-full h-auto rounded-xl shadow-lg"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <a
                      href={typeof image === 'string' ? image : image.url}
                      download={`generated-image-${index + 1}.png`}
                      className="px-4 py-2 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                    >
                      下载图片
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentGeneration.status === 'completed' && (
            <div className="mt-6 flex gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-xl hover:shadow-lg transition-all"
              >
                再生成一张
              </button>
              <button
                onClick={() => navigate('/history')}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
              >
                查看历史
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};