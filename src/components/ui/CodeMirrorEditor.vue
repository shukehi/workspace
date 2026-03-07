<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter, lintGutter } from '@codemirror/lint';
import { cn } from '@/lib/utils';

const props = defineProps<{
  modelValue: string;
  readOnly?: boolean;
  lint?: boolean;
  class?: HTMLAttributes['class'];
}>();

const emits = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const host = ref<HTMLDivElement | null>(null);
let view: EditorView | null = null;

function buildState(doc: string) {
  const extensions = [
    basicSetup,
    json(),
    lineNumbers(),
    lintGutter(),
    EditorView.lineWrapping,
    EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      emits('update:modelValue', update.state.doc.toString());
    }),
    EditorView.theme({
      '&': {
        fontSize: '12px',
        backgroundColor: 'transparent'
      },
      '.cm-content': {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
      }
    })
  ];

  if (props.readOnly) {
    extensions.push(EditorState.readOnly.of(true), EditorView.editable.of(false));
  } else if (props.lint !== false) {
    extensions.push(linter(jsonParseLinter()));
  }

  return EditorState.create({
    doc,
    extensions
  });
}

onMounted(() => {
  if (!host.value) return;
  view = new EditorView({
    state: buildState(props.modelValue || ''),
    parent: host.value
  });
});

watch(
  () => props.modelValue,
  (next) => {
    if (!view) return;
    const current = view.state.doc.toString();
    if (next === current) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: next || '' }
    });
  }
);

watch(
  () => props.readOnly,
  (next) => {
    if (!view) return;
    const current = view.state.doc.toString();
    view.setState(buildState(current));
    if (next && view.hasFocus) view.dom.blur();
  }
);

onBeforeUnmount(() => {
  view?.destroy();
  view = null;
});
</script>

<template>
  <div
    ref="host"
    :class="cn('h-full w-full rounded-md border bg-background p-2', props.class)"
  />
</template>
