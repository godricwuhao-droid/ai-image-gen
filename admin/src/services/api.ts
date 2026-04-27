import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

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
  is_admin: boolean;
  daily_generation_limit: number;
  daily_generation_count: number;
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
  images?: string[];
  error_message?: string;
  cost_usd?: number;
  provider?: string;
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
  package_id?: number;
  amount: number;
  payment_method?: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Package {
  id: number;
  name: string;
  credits: number;
  price: number;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface CreditTransaction {
  id: number;
  user_id: number;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  balance_before: number;
  balance_after: number;
  created_at: string;
}

export interface Stats {
  total_users: number;
  total_generations: number;
  total_orders: number;
  total_credits: number;
  total_revenue: number;
  monthly_growth: number;
}

export const authService = {
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', { email: username, password });
    localStorage.setItem('admin_token', response.data.access_token);
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('admin_token');
  },
  
  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const userService = {
  getList: async (page = 1, pageSize = 20): Promise<{ users: User[]; total: number }> => {
    const response = await api.get('/admin/users', { params: { page, page_size: pageSize } });
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

export const generationService = {
  getList: async (page = 1, pageSize = 20, userId?: number): Promise<{ generations: Generation[]; total: number }> => {
    const params: any = { page, page_size: pageSize };
    if (userId) params.user_id = userId;
    const response = await api.get('/generations', { params });
    return response.data;
  },
  
  getById: async (id: number): Promise<Generation> => {
    const response = await api.get(`/generations/${id}`);
    return response.data;
  },
};

export const orderService = {
  getList: async (page = 1, pageSize = 20): Promise<{ orders: Order[]; total: number }> => {
    const response = await api.get('/admin/orders', { params: { page, page_size: pageSize } });
    return response.data;
  },
  
  getById: async (id: number): Promise<Order> => {
    const response = await api.get(`/admin/orders/${id}`);
    return response.data;
  },
  
  updateStatus: async (id: number, status: string): Promise<Order> => {
    const response = await api.patch(`/admin/orders/${id}`, { payment_status: status });
    return response.data;
  },
};

export const packageService = {
  getList: async (): Promise<Package[]> => {
    const response = await api.get('/packages');
    return response.data;
  },
  
  create: async (data: Partial<Package>): Promise<Package> => {
    const response = await api.post('/packages', data);
    return response.data;
  },
  
  update: async (id: number, data: Partial<Package>): Promise<Package> => {
    const response = await api.put(`/packages/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/packages/${id}`);
  },
};

export const creditService = {
  getUserCredits: async (userId: number): Promise<{ balance: number; total_spent: number; transactions: CreditTransaction[] }> => {
    const response = await api.get(`/credits/${userId}`);
    return response.data;
  },
  
  addCredits: async (userId: number, amount: number, description: string): Promise<void> => {
    await api.post('/credits/add', { user_id: userId, amount, description });
  },
  
  deductCredits: async (userId: number, amount: number, description: string): Promise<void> => {
    await api.post('/credits/deduct', { user_id: userId, amount, description });
  },
};

export const statsService = {
  getDashboard: async (): Promise<Stats> => {
    const response = await api.get('/admin/stats');
    return response.data;
  },
};

export default api;