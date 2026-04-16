import config from '../config';

interface RequestLike {
    headers?: {
        origin?: string;
        referer?: string;
        // Allow string[] to be compatible with IncomingHttpHeaders
        [key: string]: string | string[] | undefined;
    };
    socket?: {
        localPort?: number;
    };
}

function normalizeUrlBase(urlRaw: string): string {
    const parsed = new URL(String(urlRaw).trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Only http/https render base url is allowed');
    }
    return parsed.toString().replace(/\/$/, '');
}

function resolveClientBaseUrlFromHeaders(req: RequestLike | undefined): string {
    const origin = String(req?.headers?.origin || '').trim();
    if (origin) return normalizeUrlBase(origin);

    const referer = String(req?.headers?.referer || '').trim();
    if (!referer) return '';
    const parsed = new URL(referer);
    return normalizeUrlBase(parsed.origin);
}

export function resolveRenderBaseUrl(req?: RequestLike): string {
    // Precedence:
    // 1. Explicit PRINT_RENDER_BASE_URL / PDF_RENDER_BASE_URL
    // 2. In non-production, request Origin / Referer
    // 3. Localhost fallback using the active server port
    const configured = String(process.env.PRINT_RENDER_BASE_URL || process.env.PDF_RENDER_BASE_URL || '').trim();
    if (configured) {
        return normalizeUrlBase(configured);
    }

    const env = String(process.env.NODE_ENV || 'development').trim().toLowerCase();
    if (env === 'production') {
        throw new Error('PRINT_RENDER_BASE_URL is required in production');
    }

    const fromClient = resolveClientBaseUrlFromHeaders(req);
    if (fromClient) {
        return fromClient;
    }

    const socketPort = Number(req?.socket?.localPort || 0);
    const fallbackPort = Number(config?.server?.port || 3000);
    const port = socketPort > 0 ? socketPort : fallbackPort;
    return `http://127.0.0.1:${port}`;
}
