import { createSourceOrderWorkflow } from '@/features/source-analysis/services/sourceOrderWorkflow';

export function useSourceStoreWorkflow(
  state: Parameters<typeof createSourceOrderWorkflow>[0],
  deps: {
    createWorkflow?: typeof createSourceOrderWorkflow;
  } = {},
) {
  const createWorkflow = deps.createWorkflow || createSourceOrderWorkflow;
  const workflow = createWorkflow(state);

  void workflow.rehydrateFromSnapshot();

  return workflow;
}
