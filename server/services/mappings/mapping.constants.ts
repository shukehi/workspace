export const PROFILE_CODES = Object.freeze({
    PACKAGING: 'packaging',
    CYLINDER: 'cylinder',
    LOCK: 'lock',
    LOCK_FORK: 'lock_fork',
    HANDLE: 'handle'
} as const);

export const PROFILE_CODE_LIST = Object.freeze(Object.values(PROFILE_CODES));

export const PROFILE_DISPLAY_NAMES = Object.freeze({
    [PROFILE_CODES.PACKAGING]: '包装映射',
    [PROFILE_CODES.CYLINDER]: '锁芯映射',
    [PROFILE_CODES.LOCK]: '锁具映射',
    [PROFILE_CODES.LOCK_FORK]: '锁叉映射',
    [PROFILE_CODES.HANDLE]: '拉手映射'
});

export const PROFILE_STATUSES = Object.freeze({
    ACTIVE: 'active',
    INACTIVE: 'inactive'
} as const);

export const PROFILE_STATUS_LIST = Object.freeze(Object.values(PROFILE_STATUSES));

export const REVISION_STATES = Object.freeze({
    DRAFT: 'draft',
    PUBLISHED: 'published',
    ARCHIVED: 'archived'
} as const);

export const REVISION_STATE_LIST = Object.freeze(Object.values(REVISION_STATES));

export const AUDIT_ACTIONS = Object.freeze({
    CREATE_DRAFT: 'create_draft',
    UPDATE_DRAFT: 'update_draft',
    PUBLISH: 'publish',
    ROLLBACK: 'rollback'
} as const);

export const UNMATCHED_EVENT_STATUSES = Object.freeze({
    OPEN: 'open',
    RESOLVED: 'resolved',
    IGNORED: 'ignored'
} as const);

export const UNMATCHED_EVENT_STATUS_LIST = Object.freeze(Object.values(UNMATCHED_EVENT_STATUSES));

export const SCHEMA_VERSION = 1;

export function getProfileDisplayName(profileCode: string): string {
    return PROFILE_DISPLAY_NAMES[profileCode as keyof typeof PROFILE_DISPLAY_NAMES] || profileCode;
}

