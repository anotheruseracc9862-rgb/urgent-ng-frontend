export interface RequestConfig extends RequestInit {
  url: string;
  params?: Record<string, string | number | boolean | undefined>;
  data?: unknown;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

export class ApiClient {
  constructor(private baseURL: string) {}

  private buildUrl(url: string, params?: Record<string, string | number | boolean | undefined>): string {
    const fullUrl = new URL(url, this.baseURL);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          fullUrl.searchParams.append(key, String(value));
        }
      });
    }
    
    return fullUrl.toString();
  }

  async request<T = unknown>(config: RequestConfig): Promise<ApiResponse<T>> {
    const { url, params, data, ...fetchConfig } = config;
    
    const headers = new Headers(fetchConfig.headers);
    
    if (data && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    
    const response = await fetch(this.buildUrl(url, params), {
      ...fetchConfig,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    
    let responseData: T;
    const contentType = response.headers.get('Content-Type');
    
    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = (await response.text()) as T;
    }
    
    if (!response.ok) {
      throw {
        data: responseData,
        status: response.status,
        headers: response.headers,
      };
    }
    
    return {
      data: responseData,
      status: response.status,
      headers: response.headers,
    };
  }

  get<T = unknown>(url: string, params?: Record<string, string | number | boolean | undefined>, config?: Omit<RequestConfig, 'url' | 'params' | 'data'>) {
    return this.request<T>({ ...config, url, params, method: 'GET' });
  }

  post<T = unknown>(url: string, data?: unknown, config?: Omit<RequestConfig, 'url' | 'data'>) {
    return this.request<T>({ ...config, url, data, method: 'POST' });
  }

  put<T = unknown>(url: string, data?: unknown, config?: Omit<RequestConfig, 'url' | 'data'>) {
    return this.request<T>({ ...config, url, data, method: 'PUT' });
  }

  patch<T = unknown>(url: string, data?: unknown, config?: Omit<RequestConfig, 'url' | 'data'>) {
    return this.request<T>({ ...config, url, data, method: 'PATCH' });
  }

  delete<T = unknown>(url: string, config?: Omit<RequestConfig, 'url'>) {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }
}
