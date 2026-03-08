import { api } from '@/lib/api';
import type { MappingValidationIssue } from '@/types/mapping';

export interface MappingSaveResponse<T> {
  ok: boolean;
  data?: T;
  errors?: MappingValidationIssue[];
}

export const mappingConfigApi = {
  load<T>(endpoint: string) {
    return api.get<T>(endpoint);
  },
  save<T>(endpoint: string, payload: T) {
    return api.put<MappingSaveResponse<T>>(endpoint, payload);
  }
};
