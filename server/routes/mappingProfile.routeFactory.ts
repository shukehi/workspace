import fs from 'fs';
import { Router, Request, Response } from 'express';

export interface MappingProfileRouteOptions {
    profileName: string;
    endpoint: string;
    runtimeFile: string;
    adapt: (raw: unknown) => unknown;
    validate: (raw: unknown) => unknown[];
    readErrorMessage: string;
    saveErrorMessage: string;
}

export function writeJsonAtomic(filePath: string, payload: unknown): void {
    const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(payload, null, 4));
    fs.renameSync(tempPath, filePath);
}

function readJsonOrFallback(filePath: string, fallback: unknown = {}, logContext?: string): unknown {
    if (!fs.existsSync(filePath)) return fallback;
    try {
        const rawText = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(rawText || '{}');
    } catch (error) {
        if (logContext) {
            console.warn(`[configData] failed to parse ${logContext}, falling back to empty`, error);
        }
        return fallback;
    }
}

export function createMappingProfileRoute(options: MappingProfileRouteOptions): {
    ensureRuntimeFile: () => void;
    readMapping: () => { payload: unknown; issues: unknown[] };
    register: (router: Router) => void;
} {
    const {
        profileName,
        endpoint,
        runtimeFile,
        adapt,
        validate,
        readErrorMessage,
        saveErrorMessage
    } = options;

    function ensureRuntimeFile(): void {
        if (fs.existsSync(runtimeFile)) return;
        const payload = adapt({});
        writeJsonAtomic(runtimeFile, payload);
    }

    function readMapping(): { payload: unknown; issues: unknown[] } {
        ensureRuntimeFile();
        const rawText = fs.readFileSync(runtimeFile, 'utf8');
        const raw = JSON.parse(rawText || '{}');
        const payload = adapt(raw);
        const issues = validate(raw);
        return { payload, issues };
    }

    function register(router: Router): void {
        router.get(endpoint, (req: Request, res: Response) => {
            try {
                const { payload, issues } = readMapping();
                if (issues.length > 0) {
                    console.warn(`[configData] ${profileName} mapping validation issues:`, issues);
                }
                res.json(payload);
            } catch (error) {
                console.error(`Error reading ${profileName} mapping:`, error);
                res.status(500).json({ ok: false, error: readErrorMessage });
            }
        });

        router.put(endpoint, (req: Request, res: Response) => {
            try {
                const issues = validate(req.body);
                if (issues.length > 0) {
                    res.status(400).json({ ok: false, errors: issues });
                    return;
                }
                const payload = adapt(req.body);
                writeJsonAtomic(runtimeFile, payload);
                res.json({ ok: true, data: payload });
            } catch (error) {
                console.error(`Error saving ${profileName} mapping:`, error);
                res.status(500).json({ ok: false, error: saveErrorMessage });
            }
        });
    }

    return {
        ensureRuntimeFile,
        readMapping,
        register
    };
}

