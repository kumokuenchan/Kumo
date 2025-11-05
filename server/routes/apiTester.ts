import { Router } from 'express';
import axios from 'axios';

const router = Router();

/**
 * POST /api/api-tester/request
 * Execute an HTTP request (proxy)
 */
router.post('/request', async (req, res) => {
  try {
    const { method, url, headers, body, params, timeout = 30000 } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const startTime = Date.now();

    // Prepare request config
    const config: any = {
      method: method || 'GET',
      url,
      headers: headers || {},
      timeout,
      validateStatus: () => true, // Don't throw on any status code
    };

    // Add query parameters
    if (params && Object.keys(params).length > 0) {
      config.params = params;
    }

    // Add body for methods that support it
    if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method?.toUpperCase())) {
      config.data = body;
    }

    // Execute request
    const response = await axios(config);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Calculate response size
    const responseSize = JSON.stringify(response.data).length;

    res.json({
      success: true,
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        duration,
        size: responseSize,
      },
    });
  } catch (error: any) {
    const endTime = Date.now();
    const duration = endTime - Date.now();

    res.status(500).json({
      success: false,
      error: error.message || 'Request failed',
      response: {
        status: error.response?.status || 0,
        statusText: error.response?.statusText || 'Network Error',
        headers: error.response?.headers || {},
        data: error.response?.data || error.message,
        duration,
        size: 0,
      },
    });
  }
});

export default router;
