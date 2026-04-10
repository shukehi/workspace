import crypto from 'node:crypto';
import { initDB, sequelize, MappingProfile, MappingRevision } from '../models';
import type { MappingProfileInstance, MappingRevisionInstance } from '../models';
import type { MappingProfileCode } from '../models/types';
import { PROFILE_CODE_LIST, REVISION_STATES } from '../services/mappings/mapping.constants';

type StatusRow = {
    profileCode: string;
    displayName: string;
    latestRevision: number | null;
    publishedRevision: number | null;
    publishedState: string;
    payloadHash: string | null;
};

function hashPayload(payloadText: unknown): string | null {
    const normalized = String(payloadText || '').trim();
    if (!normalized) return null;
    return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 12);
}

async function run() {
    try {
        await initDB();

        const rows: StatusRow[] = [];
        for (const profileCode of PROFILE_CODE_LIST as MappingProfileCode[]) {
            const profile = await MappingProfile.findOne({
                where: { profile_code: profileCode },
            }) as MappingProfileInstance | null;

            if (!profile) {
                rows.push({
                    profileCode,
                    displayName: profileCode,
                    latestRevision: null,
                    publishedRevision: null,
                    publishedState: 'missing-profile',
                    payloadHash: null,
                });
                continue;
            }

            const latestRevision = await MappingRevision.findOne({
                where: { profile_id: profile.id },
                order: [['revision', 'DESC']],
            }) as MappingRevisionInstance | null;
            const publishedRevision = await MappingRevision.findOne({
                where: {
                    profile_id: profile.id,
                    state: REVISION_STATES.PUBLISHED,
                },
                order: [['revision', 'DESC']],
            }) as MappingRevisionInstance | null;

            rows.push({
                profileCode,
                displayName: profile.display_name,
                latestRevision: latestRevision ? Number(latestRevision.revision) : null,
                publishedRevision: publishedRevision ? Number(publishedRevision.revision) : null,
                publishedState: publishedRevision ? 'ok' : 'missing-published',
                payloadHash: publishedRevision ? hashPayload(publishedRevision.payload_json) : null,
            });
        }

        const hasFailures = rows.some((row) => row.publishedState !== 'ok');

        console.log(JSON.stringify({
            generatedAt: new Date().toISOString(),
            rows,
        }, null, 2));

        if (hasFailures) {
            process.exitCode = 1;
        }
    } catch (error) {
        console.error('[check_mapping_published_state] failed', error);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

run();
