import axios from 'axios';

const isProduction = process.env.NODE_ENV === 'production';

const API_BASE_URL = isProduction 
  ? '/api/v1' 
  : 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  is_superuser: boolean;
  credits: number;
  daily_generation_count: number;
  total_generations: number;
  created_at: string;
}

export interface Generation {
  id: number;
  user_id: number;
  prompt: string;
  size: string;
  quality: string;
  n: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  images?: string[] | null;
  error_message?: string | null;
  cost_usd: number;
  credits_cost: number;
  provider: string;
  is_public: boolean;
  refunded: boolean;
  likes_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    username: string;
    email: string;
  };
}

export interface Order {
  id: number;
  user_id: number;
  subscription_id?: number;
  package_id?: number;
  amount: number;
  credits?: number;
  payment_method?: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_id?: string;
  stripe_session_id?: string;
  stripe_payment_intent_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreditTransaction {
  id: number;
  user_id: number;
  amount: number;
  balance_after: number;
  transaction_type: string;
  reference_type?: string;
  reference_id?: number;
  description?: string;
  created_at: string;
}

export interface UserCredit {
  id: number;
  email: string;
  username: string;
  credits: number;
  daily_generation_count: number;
  total_generations: number;
  created_at: string;
}

export interface Stats {
  total_users: number;
  total_generations: number;
  total_orders: number;
  completed_orders: number;
  total_revenue: number;
  pending_generations: number;
  processing_generations: number;
  completed_generations: number;
  failed_generations: number;
  monthly_new_users: number;
  growth_rate: number;
}

export const authService = {
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/admin/login', { email: username, password });
    localStorage.setItem('admin_token', response.data.access_token);
    if (response.data.user) {
      localStorage.setItem('admin_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  },
  
  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const userService = {
  getList: async (
    page = 1, 
    pageSize = 20, 
    params?: { email?: string; username?: string; is_active?: boolean }
  ): Promise<{ users: User[]; total: number }> => {
    const response = await api.get('/admin/users', { 
      params: { page, page_size: pageSize, ...params } 
    });
    return response.data;
  },
  
  getById: async (id: number): Promise<User> => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },
  
  updateStatus: async (id: number, isActive: boolean): Promise<User> => {
    const response = await api.patch(`/admin/users/${id}`, { is_active: isActive });
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },
};

export const configService = {
  getAll: async (): Promise<{ configs: Array<{ key: string; value: string; description?: string }> }> => {
    const response = await api.get('/admin/config');
    return response.data;
  },
  createOrUpdate: async (key: string, value: string, description?: string) => {
    const response = await api.post('/admin/config', { key, value, description });
    return response.data;
  },
  batchUpdate: async (configs: Array<{ key: string; value: string; description?: string }>) => {
    const response = await api.post('/admin/config/batch', configs);
    return response.data;
  },
  initDefaults: async () => {
    const response = await api.post('/admin/config/init');
    return response.data;
  },
};

export const generationService = {
  getAdminList: async (
    page = 1, 
    pageSize = 20, 
    filters?: {
      user_id?: number;
      status?: string;
      provider?: string;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<{ generations: Generation[]; total: number; page: number; page_size: number }> => {
    const response = await api.get('/admin/generations', { 
      params: { page, page_size: pageSize, ...filters } 
    });
    return response.data;
  },
  
  getAdminById: async (id: number): Promise<Generation> => {
    const response = await api.get(`/admin/generations/${id}`);
    return response.data;
  },
  
  update: async (id: number, data: { is_public?: boolean }): Promise<Generation> => {
    const response = await api.patch(`/admin/generations/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/generations/${id}`);
  },
  
  retry: async (id: number): Promise<{ message: string }> => {
    const response = await api.post(`/admin/generations/${id}/retry`);
    return response.data;
  },
};

export const orderService = {
  getList: async (
    page = 1, 
    pageSize = 20,
    filters?: { payment_status?: string; user_id?: number }
  ): Promise<{ orders: Order[]; total: number; page: number; page_size: number }> => {
    const response = await api.get('/admin/orders', { 
      params: { page, page_size: pageSize, ...filters } 
    });
    return response.data;
  },
  
  getById: async (id: number): Promise<Order> => {
    const response = await api.get(`/admin/orders/${id}`);
    return response.data;
  },
  
  updateStatus: async (id: number, status: string, transactionId?: string): Promise<Order> => {
    const response = await api.patch(`/admin/orders/${id}`, { 
      payment_status: status,
      transaction_id: transactionId 
    });
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/orders/${id}`);
  },
};

export const creditService = {
  getUserCredits: async (
    page = 1, 
    pageSize = 20
  ): Promise<{ users: UserCredit[]; total: number; page: number; page_size: number }> => {
    const response = await api.get('/admin/credits', { 
      params: { page, page_size: pageSize } 
    });
    return response.data;
  },
  
  getUserCreditDetail: async (userId: number): Promise<{
    user: UserCredit;
    recent_transactions: CreditTransaction[];
  }> => {
    const response = await api.get(`/admin/credits/user/${userId}`);
    return response.data;
  },
  
  getTransactions: async (
    page = 1, 
    pageSize = 20,
    filters?: {
      user_id?: number;
      transaction_type?: string;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<{ transactions: CreditTransaction[]; total: number; page: number; page_size: number }> => {
    const response = await api.get('/admin/credits/transactions', { 
      params: { page, page_size: pageSize, ...filters } 
    });
    return response.data;
  },
  
  recharge: async (
    userId: number, 
    amount: number, 
    description?: string
  ): Promise<{
    message: string;
    user_id: number;
    old_credits: number;
    new_credits: number;
    amount_added: number;
  }> => {
    const response = await api.post('/admin/credits/recharge', { 
      user_id: userId, 
      amount, 
      description 
    });
    return response.data;
  },
  
  deduct: async (
    userId: number, 
    amount: number, 
    description?: string
  ): Promise<{
    message: string;
    user_id: number;
    old_credits: number;
    new_credits: number;
    amount_deducted: number;
  }> => {
    const response = await api.post('/admin/credits/deduct', { 
      user_id: userId, 
      amount, 
      description 
    });
    return response.data;
  },
};

export const statsService = {
  getDashboard: async (): Promise<Stats> => {
    const response = await api.get('/admin/stats');
    return response.data;
  },
};

export default api;