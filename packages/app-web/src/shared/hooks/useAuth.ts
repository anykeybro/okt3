'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { AuthState, Client } from '@/shared/types';
import { apiClient } from '@/shared/api';
import { config } from '@/shared/config/config';

interface AuthContextType {
  auth: AuthState;
  login: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyCode: (phone: string, code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  selectAccount: (accountId: string) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const useAuthProvider = () => {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Проверка сохраненной сессии при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const clientData = localStorage.getItem('client_data');
        const selectedAccountId = localStorage.getItem('selected_account_id');

        if (token && clientData) {
          const client: Client = JSON.parse(clientData);
          
          // Проверяем валидность токена
          const response = await apiClient.get('/auth/verify', {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.success) {
            setAuth({
              isAuthenticated: true,
              client,
              token,
              selectedAccountId: selectedAccountId || undefined
            });
          } else {
            // Токен недействителен, очищаем данные
            localStorage.removeItem('auth_token');
            localStorage.removeItem('client_data');
            localStorage.removeItem('selected_account_id');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Очищаем данные при ошибке
        localStorage.removeItem('auth_token');
        localStorage.removeItem('client_data');
        localStorage.removeItem('selected_account_id');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (phone: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiClient.post('/auth/request-code', { phone });
      
      if (response.success) {
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Ошибка отправки кода' };
      }
    } catch (error) {
      return { success: false, error: 'Произошла ошибка при отправке кода' };
    }
  };

  const verifyCode = async (phone: string, code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiClient.post('/auth/verify-code', { phone, code });
      
      if (response.success && response.data) {
        const data = response.data as { token: string; client: Client };
        const { token, client } = data;
        
        // Сохраняем данные в localStorage
        localStorage.setItem('auth_token', token);
        localStorage.setItem('client_data', JSON.stringify(client));
        
        // Если у клиента только один лицевой счет, выбираем его автоматически
        let selectedAccountId: string | undefined;
        if (client.accounts && client.accounts.length === 1) {
          selectedAccountId = client.accounts[0].id;
          localStorage.setItem('selected_account_id', selectedAccountId);
        }

        setAuth({
          isAuthenticated: true,
          client,
          token,
          selectedAccountId
        });

        return { success: true };
      } else {
        return { success: false, error: response.error || 'Неверный код подтверждения' };
      }
    } catch (error) {
      return { success: false, error: 'Произошла ошибка при проверке кода' };
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('client_data');
    localStorage.removeItem('selected_account_id');
    
    setAuth({
      isAuthenticated: false,
    });
  };

  const selectAccount = (accountId: string) => {
    localStorage.setItem('selected_account_id', accountId);
    setAuth(prev => ({
      ...prev,
      selectedAccountId: accountId
    }));
  };

  return {
    auth,
    login,
    verifyCode,
    logout,
    selectAccount,
    isLoading
  };
};

export { AuthContext };