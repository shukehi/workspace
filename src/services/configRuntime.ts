import { configLoader } from '@/services/configLoader';

export async function initializeConfigRuntime() {
    await configLoader.loadAll();
}

export async function refreshSourceAnalysisRuntime() {
    await configLoader.refreshSourceAnalysisInputs();
}

export async function refreshMaterialsRuntime() {
    await configLoader.refreshMaterials();
}

export async function refreshPackagingRuntime() {
    await configLoader.refreshPackagingMapping();
}

export async function refreshCylinderRuntime() {
    await configLoader.refreshCylinderMapping();
}

export async function refreshLockRuntime() {
    await configLoader.refreshLockMapping();
}

export async function refreshLockForkRuntime() {
    await configLoader.refreshLockForkMapping();
}

export async function refreshHandleRuntime() {
    await configLoader.refreshHandleMapping();
}
