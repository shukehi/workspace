import fs from 'node:fs';
import { initDB, sequelize, MappingProfile, MappingRevision } from '../models';
import { CONFIG_FILES } from '../config/paths';
import { PROFILE_CODE_LIST } from '../services/mappings/mapping.constants';
import {
    publish,
    updateDraft,
} from '../services/mappings';
import {
    adaptCylinderMapping,
    adaptHandleMapping,
    adaptLockForkMapping,
    adaptLockMapping,
    adaptPackagingMapping,
} from '../services/mappings/mapping.adapter';
import {
    validateCylinderMapping,
    validateHandleMapping,
    validateLockForkMapping,
    validateLockMapping,
    validatePackagingMapping,
} from '../services/mappings/mapping.validator';
import type { MappingProfileCode } from '../models/types';

type SeedConfig = {
    runtimeFile: string;
    adapt: (value: unknown) => unknown;
    validate: (value: unknown) => Array<{ path: string; code: string; message: string }>;
};

const SEED_CONFIGS: Record<MappingProfileCode, SeedConfig> = {
    packaging: {
        runtimeFile: CONFIG_FILES.packagingMapping,
        adapt: adaptPackagingMapping,
        validate: validatePackagingMapping,
    },
    cylinder: {
        runtimeFile: CONFIG_FILES.cylinderMapping,
        adapt: adaptCylinderMapping,
        validate: validateCylinderMapping,
    },
    lock: {
        runtimeFile: CONFIG_FILES.lockMapping,
        adapt: adaptLockMapping,
        validate: validateLockMapping,
    },
    lock_fork: {
        runtimeFile: CONFIG_FILES.lockForkMapping,
        adapt: adaptLockForkMapping,
        validate: validateLockForkMapping,
    },
    handle: {
        runtimeFile: CONFIG_FILES.handleMapping,
        adapt: adaptHandleMapping,
        validate: validateHandleMapping,
    },
};

async function run() {
    try {
        await initDB();

        const results: Array<Record<string, unknown>> = [];
        for (const profileCode of PROFILE_CODE_LIST as MappingProfileCode[]) {
            const config = SEED_CONFIGS[profileCode];
            if (!config) continue;

            const existingProfile = await MappingProfile.findOne({
                where: { profile_code: profileCode },
            });
            const latestRevision = existingProfile
                ? await MappingRevision.findOne({
                    where: {
                        profile_id: existingProfile.id,
                    },
                    order: [['revision', 'DESC']],
                })
                : null;
            const hasPublished = existingProfile
                ? Boolean(await MappingRevision.findOne({
                    where: {
                        profile_id: existingProfile.id,
                        state: 'published',
                    },
                }))
                : false;

            if (hasPublished) {
                results.push({
                    profileCode,
                    status: 'skipped',
                    reason: 'published-exists',
                });
                continue;
            }

            if (!fs.existsSync(config.runtimeFile)) {
                results.push({
                    profileCode,
                    status: 'skipped',
                    reason: 'missing-runtime-file',
                    runtimeFile: config.runtimeFile,
                });
                continue;
            }

            const raw = JSON.parse(fs.readFileSync(config.runtimeFile, 'utf8') || '{}');
            const payload = config.adapt(raw);
            const issues = config.validate(raw);
            if (issues.length > 0) {
                results.push({
                    profileCode,
                    status: 'failed',
                    reason: 'validation',
                    issueCount: issues.length,
                    issues,
                });
                continue;
            }

            const draft = await updateDraft(profileCode, {
                revision: latestRevision ? Number(latestRevision.revision) : 0,
                payload: payload as Record<string, unknown>,
                operator: 'seed-mapping-profiles',
                changeNote: 'seed published mapping from legacy runtime file',
            });
            if (!draft.ok) {
                results.push({
                    profileCode,
                    status: 'failed',
                    reason: 'draft-update',
                    latestRevision: latestRevision ? Number(latestRevision.revision) : null,
                    errors: draft.errors || [],
                });
                continue;
            }

            const seeded = await publish(profileCode, {
                fromRevision: draft.revision.revision,
                operator: 'seed-mapping-profiles',
                changeNote: 'seed published mapping from legacy runtime file',
            });

            results.push({
                profileCode,
                status: seeded.ok ? 'seeded' : 'failed',
                revision: seeded.ok ? seeded.revision?.revision ?? null : null,
                errors: seeded.ok ? [] : seeded.errors || [],
            });
        }

        console.log(JSON.stringify({
            generatedAt: new Date().toISOString(),
            results,
        }, null, 2));
    } catch (error) {
        console.error('[seed_mapping_profiles] failed', error);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

run();
