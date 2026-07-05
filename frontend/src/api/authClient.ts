// Frontend authentication API client

import { API_BASE_URL as API_BASE } from './config';


export interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authClient = {
  signup: async (full_name: string, email: string, password: string, role: string): Promise<User> => {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, email, password, role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Signup failed');
    }
    return res.json();
  },

  login: async (email: string, password: string): Promise<TokenResponse> => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }
    return res.json();
  },

  getMe: async (): Promise<User> => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token found');

    const res = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      throw new Error('Session expired');
    }
    return res.json();
  }
};
