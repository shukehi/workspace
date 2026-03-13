import { watch, type Ref } from 'vue';

export function useDirtyBeforeUnload(isDirty: Ref<boolean>) {
  const stop = watch(isDirty, () => {
    window.onbeforeunload = isDirty.value ? () => '当前有未保存改动' : null;
  }, { immediate: true });

  return {
    stop,
    clear() {
      window.onbeforeunload = null;
    },
  };
}
