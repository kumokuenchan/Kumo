import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  timeout?: number;
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
    const response = await axios.post(`${API_URL}/api-tester/request`, request);
    return response.data.response;
  },
};
