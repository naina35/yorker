import api from './axios';
import type { LoginResponse, User } from '../types';

export const authApi = {
  register: async (name: string, email: string, password: string): Promise<LoginResponse> => {
    const { data } = await api.post('/auth/register', { name, email, password });
    return data;
  },

  login: async (email: string, password: string): Promise<LoginResponse> => {
    // OAuth2PasswordRequestForm expects form data with username field
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);
    const { data } = await api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
  },

  me: async (): Promise<User> => {
    const { data } = await api.get('/auth/me');
    return data;
  },

  updateLocation: async (lat: number, lng: number) => {
    const { data } = await api.put('/auth/me/location', { lat, lng });
    return data;
  },
};