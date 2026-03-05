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
        const responseData = error?.response?.data;
        const serverErrors = Array.isArray(responseData?.errors) ? responseData.errors : [];
        const firstServerError = serverErrors.find(
            (item: any) => item && typeof item.message === 'string' && item.message.trim().length > 0
        )?.message;
        const fallbackMessage = responseData?.message || responseData?.error || error.message || 'Unknown Error';
        const message = firstServerError || fallbackMessage;
        const method = typeof error?.config?.method === 'string'
            ? error.config.method.toUpperCase()
            : undefined;
        const url = error?.config?.url;
        const status = error?.response?.status;

        console.error('[API Error]', message, { status, method, url, errors: serverErrors });
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
        const payload = await axiosInstance.post<Blob, Blob>(url, data, {
            responseType: 'blob', // Important for binary data
            headers: {
                'Content-Type': 'application/json',
            }
        });

        // Create a link to download the blob
        const blob = payload instanceof Blob
            ? payload
            : new Blob([payload], { type: 'application/pdf' });
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
