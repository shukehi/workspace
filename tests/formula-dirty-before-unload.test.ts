import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import { useDirtyBeforeUnload } from '../src/features/formulas/composables/useDirtyBeforeUnload';

test('dirty before unload composable toggles window.onbeforeunload', async () => {
  Object.assign(globalThis, {
    window: {
      onbeforeunload: null,
    },
  });

  const isDirty = ref(false);
  const guard = useDirtyBeforeUnload(isDirty);

  assert.equal(window.onbeforeunload, null);

  isDirty.value = true;
  await Promise.resolve();
  assert.equal(typeof window.onbeforeunload, 'function');

  isDirty.value = false;
  await Promise.resolve();
  assert.equal(window.onbeforeunload, null);

  guard.clear();
  guard.stop();
});
