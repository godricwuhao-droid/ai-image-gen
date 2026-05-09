import axios from 'axios';
import type { User, Generation, GenerationRequest, AuthResponse } from '../types';

const api = axios.create({
  baseURL: '/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  
  return config;
});

// 响应拦截器：401 跳转登录页
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // 避免登录页重复跳转
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface GalleryImage {
  id: number;
  user_id: number;
  prompt: string;
  size: string;
  quality: string;
  status: string;
  images: Array<{url: string; width: number; height: number}> | null;
  likes_count: number;
  views_count: number;
  username: string;
  user_email: string;
  created_at: string;
}

export interface Template {
  id: number;
  user_id?: number;
  name: string;
  prompt: string;
  category: string;
  description?: string;
  is_public: boolean;
  usage_count: number;
  created_at: string;
}

export interface Favorite {
  id: number;
  user_id: number;
  generation_id: number;
  created_at: string;
}

export const authService = {
  register: async (email: string, username: string, password: string): Promise<User> => {
    const response = await api.post('/auth/register', { email, username, password });
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', response.data.access_token);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
  },

  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const generationService = {
  create: async (data: GenerationRequest): Promise<Generation> => {
    const response = await api.post('/generations', data);
    return response.data;
  },

  get: async (id: number): Promise<Generation> => {
    const response = await api.get(`/generations/${id}`);
    return response.data;
  },

  list: async (page: number = 1, pageSize: number = 20): Promise<{
    generations: Generation[];
    total: number;
    page: number;
    page_size: number;
  }> => {
    const response = await api.get('/generations', { params: { page, page_size: pageSize } });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/generations/${id}`);
  },

  update: async (id: number, data: { is_public?: boolean }): Promise<Generation> => {
    const response = await api.patch(`/generations/${id}`, data);
    return response.data;
  },

  publish: async (id: number, isPublic: boolean = true): Promise<void> => {
    await api.post(`/galleries/${id}/publish`, { is_public: isPublic });
  },

  toggleLike: async (id: number): Promise<{ success: boolean; liked: boolean; likes_count: number }> => {
    const response = await api.post(`/generations/${id}/like`);
    return response.data;
  },
};

export const galleryService = {
  getList: async (page: number = 1, pageSize: number = 20, sort: string = 'latest'): Promise<{
    images: GalleryImage[];
    total: number;
    page: number;
    page_size: number;
  }> => {
    const params: any = { page, page_size: pageSize, sort };
    const response = await api.get('/galleries', { params });
    return response.data;
  },

  getPopular: async (limit: number = 8): Promise<GalleryImage[]> => {
    const response = await api.get('/galleries/popular', { params: { limit } });
    return response.data;
  },

  getDetail: async (id: number): Promise<GalleryImage> => {
    const response = await api.get(`/galleries/${id}`);
    return response.data;
  },
};

export const favoriteService = {
  getList: async (page: number = 1, pageSize: number = 20): Promise<{
    favorites: Favorite[];
    total: number;
    page: number;
    page_size: number;
  }> => {
    const response = await api.get('/favorites', { params: { page, page_size: pageSize } });
    return response.data;
  },

  add: async (generationId: number): Promise<Favorite> => {
    const response = await api.post('/favorites', null, { params: { generation_id: generationId } });
    return response.data;
  },

  remove: async (favoriteId: number): Promise<void> => {
    await api.delete(`/favorites/${favoriteId}`);
  },

  removeByGeneration: async (generationId: number): Promise<void> => {
    await api.delete(`/favorites/by-generation/${generationId}`);
  },
};

export const creditsService = {
  getBalance: async (): Promise<{ credits: number }> => {
    const response = await api.get('/credits');
    return response.data;
  },

  addCredits: async (credits: number): Promise<{ credits: number }> => {
    const response = await api.post('/credits/add', { credits });
    return response.data;
  },
};

/** 积分配置：quality -> size -> credits */
export interface CreditsConfig {
  low: Record<string, number>;
  medium: Record<string, number>;
  high: Record<string, number>;
  [key: string]: Record<string, number>;
}

export const creditsConfigService = {
  getConfig: async (): Promise<CreditsConfig> => {
    const response = await api.get('/credits-config');
    return response.data;
  },
};

export interface Package {
  id: number;
  name: string;
  credits: number;
  price: number;
  description?: string;
}

export interface Order {
  id: number;
  package_id?: number;
  amount: number;
  credits: number;
  payment_status: string;
  stripe_session_id?: string;
  created_at: string;
}

export const paymentService = {
  getPackages: async (): Promise<Package[]> => {
    const response = await api.get('/payment/packages');
    return response.data;
  },

  createCheckout: async (packageId: number): Promise<{ session_id: string; url: string }> => {
    const baseUrl = window.location.origin;
    const response = await api.post('/payment/checkout', {
      package_id: packageId,
      success_url: `${baseUrl}/payment/success`,
      cancel_url: `${baseUrl}/pricing`,
    });
    return response.data;
  },

  getMyOrders: async (page = 1, pageSize = 20): Promise<{
    orders: Order[];
    total: number;
    page: number;
    page_size: number;
  }> => {
    const response = await api.get('/payment/my-orders', {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  completeDemo: async (orderId: number): Promise<{ success: boolean; credits_added: number; new_balance: number; message: string }> => {
    const response = await api.post('/payment/confirm-demo', null, { params: { order_id: orderId } });
    return response.data;
  },
};

export const templateService = {
  getPublic: async (page: number = 1, pageSize: number = 20, category?: string): Promise<{
    templates: Template[];
    total: number;
    page: number;
    page_size: number;
  }> => {
    const params: any = { page, page_size: pageSize };
    if (category) params.category = category;
    const response = await api.get('/templates', { params });
    return response.data;
  },

  getMy: async (page: number = 1, pageSize: number = 20): Promise<{
    templates: Template[];
    total: number;
    page: number;
    page_size: number;
  }> => {
    const response = await api.get('/my-templates', { params: { page, page_size: pageSize } });
    return response.data;
  },

  create: async (data: { name: string; prompt: string; category?: string; description?: string; is_public?: boolean }): Promise<Template> => {
    const response = await api.post('/templates', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Template>): Promise<Template> => {
    const response = await api.put(`/my-templates/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/my-templates/${id}`);
  },
};

export default api;
