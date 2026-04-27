import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { paymentService } from '../services/api';
import toast from 'react-hot-toast';

export const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'error' | 'pending'>('pending');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const paymentStatus = searchParams.get('payment_status');

    if (sessionId && sessionId.startsWith('demo_')) {
      const orderId = parseInt(sessionId.replace('demo_', ''));
      paymentService.completeDemo(orderId)
        .then(() => {
          setStatus('success');
          toast.success('购买成功！积分已到账');
        })
        .catch(() => {
          setStatus('error');
        })
        .finally(() => setLoading(false));
    } else if (paymentStatus === 'completed') {
      setStatus('success');
      toast.success('购买成功！积分已到账');
      setLoading(false);
    } else {
      setStatus('success');
      setLoading(false);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">处理中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl">
          {status === 'success' ? (
            <>
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircleIcon className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                购买成功！
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                您的积分已成功到账，现在可以开始创作了
              </p>
              <div className="space-y-3">
                <Link
                  to="/"
                  className="block w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-2xl font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all"
                >
                  开始创作
                </Link>
                <Link
                  to="/profile"
                  className="block w-full py-3 px-6 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  查看订单
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                支付遇到问题
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                请稍后重试或联系客服
              </p>
              <Link
                to="/pricing"
                className="block w-full py-3 px-6 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                返回定价页
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};