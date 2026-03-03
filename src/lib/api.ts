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
        // Normalize both raw payloads and envelope payloads ({ success, data }).
        const payload = response.data;
        if (
            payload &&
            typeof payload === 'object' &&
            'success' in payload &&
            'data' in payload
        ) {
            return payload.data;
        }
        return payload;
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

    // Special method for downloading binary files
    downloadPDF: async (url: string, data: any, filename: string) => {
        const response = await axiosInstance.post(url, data, {
            responseType: 'blob', // Important for binary data
            headers: {
                'Content-Type': 'application/json',
            }
        });

        // Create a link to download the blob
        // @ts-ignore
        const blob = new Blob([response], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }
};

export default api;
export { axiosInstance }; // Export raw instance for Mock Adapter
