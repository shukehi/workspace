import { analyzeSourceOrder } from '@/services/sourceAnalysis';
import { loadSourceAnalysisConfig } from '@/services/sourceAnalysisConfig';
import type { SourceAnalysisConfig, SourceAnalysisResult } from '@/types/sourceAnalysis';

interface SourceAnalysisRuntimeDeps {
  loadConfig?: () => Promise<SourceAnalysisConfig>;
  analyze?: typeof analyzeSourceOrder;
}

export class SourceAnalysisRuntimeService {
  private readonly loadConfig: () => Promise<SourceAnalysisConfig>;
  private readonly analyze: typeof analyzeSourceOrder;

  constructor(deps: SourceAnalysisRuntimeDeps = {}) {
    this.loadConfig = deps.loadConfig || loadSourceAnalysisConfig;
    this.analyze = deps.analyze || analyzeSourceOrder;
  }

  async analyzeOrder(params: { order: any; items?: any[] }): Promise<SourceAnalysisResult> {
    const config = await this.loadConfig();
    return this.analyze({
      order: params.order,
      items: params.items,
      config,
    });
  }
}

export const sourceAnalysisRuntime = new SourceAnalysisRuntimeService();
