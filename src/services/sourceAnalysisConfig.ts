import { configLoader } from '@/services/configLoader';
import type { SourceAnalysisConfig } from '@/types/sourceAnalysis';

export async function loadSourceAnalysisConfig(): Promise<SourceAnalysisConfig> {
    await configLoader.loadAll();
    await configLoader.refreshMaterials();
    await configLoader.refreshFormulas();

    return {
        formulas: configLoader.getFormulas(),
        materials: configLoader.getMaterials(),
        cylinderMapping: configLoader.getCylinderMapping(),
        handleMapping: configLoader.getHandleMapping(),
        lockForkMapping: configLoader.getLockForkMapping(),
        packagingMapping: configLoader.getPackagingMapping(),
    };
}
