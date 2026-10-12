import { ApiClient, type RequestConfig } from './base';

export interface TokenStore {
  getToken: () => Promise<string | null> | string | null;
  setToken: (token: string | null) => Promise<void> | void;
  clearToken: () => Promise<void> | void;
}

export class AuthenticatedApiClient extends ApiClient {
  constructor(
    baseURL: string,
    private tokenStore: TokenStore
  ) {
    super(baseURL);
  }

  async request<T = unknown>(config: RequestConfig) {
    const token = await this.tokenStore.getToken();
    
    if (token) {
      const headers = new Headers(config.headers);
      headers.set('Authorization', `Bearer ${token}`);
      config.headers = headers;
    }
    
    try {
      return await super.request<T>(config);
    } catch (error: any) {
      // Handle 401 Unauthorized - clear token
      if (error?.status === 401) {
        await this.tokenStore.clearToken();
      }
      throw error;
    }
  }

  async setAuthToken(token: string) {
    await this.tokenStore.setToken(token);
  }

  async clearAuthToken() {
    await this.tokenStore.clearToken();
  }
}
