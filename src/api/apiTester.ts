import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export interface ApiAuth {
  type: 'none' | 'bearer' | 'basic' | 'apikey';
  // Bearer
  bearerToken?: string;
  // Basic
  username?: string;
  password?: string;
  // API Key
  apiKey?: string;
  apiKeyName?: string;
  apiKeyIn?: 'header' | 'query';
}

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  timeout?: number;
  // Client-side helper: not required by API, but persisted in collections/history
  auth?: ApiAuth;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  duration: number;
  size: number;
}

export const apiTesterApi = {
  /**
   * Execute an HTTP request
   */
  async executeRequest(request: ApiRequest): Promise<ApiResponse> {
    try {
      const response = await axios.post(`${API_URL}/api-tester/request`, request);
      return response.data.response;
    } catch (error: any) {
      // If the backend returned an error response, extract it
      if (error.response?.data?.response) {
        return error.response.data.response;
      }
      // Otherwise create a generic error response
      throw error;
    }
  },
};
