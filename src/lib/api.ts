import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { API_DATA_FIELD, API_SUCCESS_FLAG } from '@/shared/constants/api';
import type { ApiEnvelope, ApiErrorResponse } from '@/shared/types/api';

const apiBaseUrl =
    ((import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined) || '/api';

const axiosInstance: AxiosInstance = axios.create({
    baseURL: apiBaseUrl,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Week 1 compatibility boundary:
// keep supporting both raw payloads and { success, data } envelopes until
// affected endpoints are migrated to a single contract shape.
export function normalizeApiEnvelope<T>(payload: ApiEnvelope<T>): T {
    if (
        payload &&
        typeof payload === 'object' &&
        API_SUCCESS_FLAG in payload &&
        API_DATA_FIELD in payload
    ) {
        return (payload as unknown as Record<string, unknown>)[API_DATA_FIELD] as T;
    }
    return payload as T;
}

export function resolveApiErrorMessage(error: unknown): string {
    const responseData = (((error as any)?.response?.data) || {}) as ApiErrorResponse;
    const serverErrors = Array.isArray(responseData?.errors) ? responseData.errors : [];
    const firstServerError = serverErrors.find(
        (item: any) => item && typeof item.message === 'string' && item.message.trim().length > 0
    )?.message;
    const fallbackMessage = responseData?.message
        || responseData?.code
        || responseData?.error
        || (error as any)?.message
        || 'Unknown Error';
    return firstServerError || fallbackMessage;
}

axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
        return normalizeApiEnvelope(response.data);
    },
    (error) => {
        const responseData = (error?.response?.data || {}) as ApiErrorResponse;
        const serverErrors = Array.isArray(responseData?.errors) ? responseData.errors : [];
        const message = resolveApiErrorMessage(error);
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
        axiosInstance.get<ApiEnvelope<T>, T>(url, config),
    post: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
        axiosInstance.post<ApiEnvelope<T>, T>(url, data, config),
    put: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
        axiosInstance.put<ApiEnvelope<T>, T>(url, data, config),
    delete: <T>(url: string, config?: AxiosRequestConfig) =>
        axiosInstance.delete<ApiEnvelope<T>, T>(url, config),

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
