import { configLoader } from '@/services/configLoader';
import type { SourceAnalysisConfig } from '@/types/sourceAnalysis';

export async function loadSourceAnalysisConfig(): Promise<SourceAnalysisConfig> {
    await configLoader.refreshSourceAnalysisInputs();
    return configLoader.getSourceAnalysisConfig();
}
