import { ref, type UnwrapRef } from 'vue';
import { createRowId } from '../utils/mappingIssueUtils';

export interface EditableRow {
  id: string;
}

export function useEditableList<T extends EditableRow>(
  makeDefault: () => T,
  initialData: T[] = []
) {
  // 使用 UnwrapRef 确保类型与 ref 内部解包后的类型一致
  const list = ref<T[]>(initialData.length > 0 ? [...initialData] : [makeDefault()]);

  function add(customData?: Partial<T>) {
    const newItem = {
      ...makeDefault(),
      ...customData,
      id: createRowId()
    } as any; // 强制转换以绕过复杂类型推导
    
    list.value.push(newItem);
    return newItem;
  }

  function remove(id: string) {
    list.value = (list.value as T[]).filter((item) => item.id !== id) as UnwrapRef<T[]>;
    if (list.value.length === 0) {
      list.value.push(makeDefault() as any);
    }
  }

  function reset(data: T[]) {
    list.value = (data.length > 0 ? [...data] : [makeDefault()]) as UnwrapRef<T[]>;
  }

  function isUnique(field: keyof T, value: any, excludeId?: string) {
    return !(list.value as T[]).some((item) => 
      item.id !== excludeId && 
      String(item[field]).trim() === String(value).trim()
    );
  }

  return {
    list,
    add,
    remove,
    reset,
    isUnique
  };
}
