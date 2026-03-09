import { getApiUrl } from '@/config/api';

export interface SystemConfigItem {
  config_key: string;
  config_value: any;
  config_type: string;
  category: string;
  description: string;
  is_public: boolean;
}

const getToken = (): string | null => {
  try {
    const cookies = document.cookie.split(';');
    const sessionCookie = cookies.find(c => c.trim().startsWith('session_token='));
    const apiSessionCookie = cookies.find(c => c.trim().startsWith('api_session_token='));
    if (sessionCookie) return sessionCookie.split('=')[1];
    if (apiSessionCookie) return apiSessionCookie.split('=')[1];
  } catch {}
  return null;
};

const getHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export const systemConfigAdminService = {
  async getAllConfigs(category?: string): Promise<SystemConfigItem[]> {
    const url = getApiUrl(`/system-config/get${category ? `?category=${category}` : ''}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await response.json();
    if (data.success) {
      return data.data;
    }
    throw new Error(data.error || 'Erro ao buscar configurações');
  },

  async updateConfig(config_key: string, config_value: string, config_type?: string): Promise<void> {
    const url = getApiUrl('/system-config/update');
    const body: any = { config_key, config_value };
    if (config_type) body.config_type = config_type;

    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Erro ao atualizar configuração');
    }
  },
};
