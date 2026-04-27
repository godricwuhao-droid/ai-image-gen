export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  is_superuser?: boolean;
  credits: number;
  daily_generation_count: number;
  total_generations: number;
  created_at: string;
}

export interface Generation {
  id: number;
  prompt: string;
  size: string;
  quality: string;
  n: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  images: Array<{
    url: string;
    width: number;
    height: number;
  }> | null;
  cost_usd: number;
  provider: string;
  is_public: boolean;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerationRequest {
  prompt: string;
  size: string;
  quality: string;
  n: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}
