import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  PhotoIcon,
  ArrowsPointingOutIcon,
  CogIcon,
  SparklesIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useStore } from '../store';

export const ImageToImagePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useStore();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">请先登录</h2>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-medium rounded-full"
          >
            前往登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">图生图</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Coming Soon Banner */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-6 mb-8 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <SparklesIcon className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">图生图功能开发中</h2>
              <p className="text-amber-100">即将推出，敬请期待！</p>
            </div>
          </div>
        </div>

        {/* Feature Preview */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-gray-200/50 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">即将上线功能</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <ArrowsPointingOutIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-1">风格迁移</h4>
                <p className="text-sm text-gray-500">将图片转换为不同的艺术风格</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <CogIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-1">细节增强</h4>
                <p className="text-sm text-gray-500">提升图片清晰度和细节质量</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <PhotoIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-1">画面扩展</h4>
                <p className="text-sm text-gray-500">AI智能扩展图片画布范围</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <ExclamationTriangleIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-1">背景替换</h4>
                <p className="text-sm text-gray-500">智能识别并替换图片背景</p>
              </div>
            </div>
          </div>
        </div>

        {/* Placeholder Upload Area */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-gray-200/50 border-dashed border-2">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PhotoIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">上传图片</h3>
            <p className="text-gray-500 mb-4">功能开发完成后可上传图片进行转换</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-md mx-auto">
              <p className="text-sm text-amber-700">
                图生图功能正在紧张开发中，预计将在下个版本推出。
              </p>
            </div>
          </div>
        </div>

        {/* Back to Create */}
        <div className="mt-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-full hover:shadow-lg hover:shadow-purple-500/30 transition-all"
          >
            <SparklesIcon className="w-5 h-5" />
            前往文生图
          </Link>
        </div>
      </main>
    </div>
  );
};