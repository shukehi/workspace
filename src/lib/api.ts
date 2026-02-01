import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';

// Generic API Response wrapper to match typical backend structure
export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    message?: string;
}

const axiosInstance: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
        // Directly return the data payload for convenience
        return response.data;
    },
    (error) => {
        const message = error.response?.data?.message || error.message || 'Unknown Error';
        console.error('[API Error]', message);
        return Promise.reject(error);
    }
);

// Typed wrapper methods
export const api = {
    get: <T>(url: string, config?: AxiosRequestConfig) =>
        axiosInstance.get<T, T>(url, config),
    post: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
        axiosInstance.post<T, T>(url, data, config),
    put: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
        axiosInstance.put<T, T>(url, data, config),
    delete: <T>(url: string, config?: AxiosRequestConfig) =>
        axiosInstance.delete<T, T>(url, config),
};

export default api;
export { axiosInstance }; // Export raw instance for Mock Adapter
