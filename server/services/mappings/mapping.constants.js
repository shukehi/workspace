const PROFILE_CODES = Object.freeze({
    PACKAGING: 'packaging',
    CYLINDER: 'cylinder',
    LOCK_FORK: 'lock_fork'
});

const PROFILE_CODE_LIST = Object.freeze(Object.values(PROFILE_CODES));

const PROFILE_DISPLAY_NAMES = Object.freeze({
    [PROFILE_CODES.PACKAGING]: '包装映射',
    [PROFILE_CODES.CYLINDER]: '锁芯映射',
    [PROFILE_CODES.LOCK_FORK]: '锁叉映射'
});

const PROFILE_STATUSES = Object.freeze({
    ACTIVE: 'active',
    INACTIVE: 'inactive'
});

const PROFILE_STATUS_LIST = Object.freeze(Object.values(PROFILE_STATUSES));

const REVISION_STATES = Object.freeze({
    DRAFT: 'draft',
    PUBLISHED: 'published',
    ARCHIVED: 'archived'
});

const REVISION_STATE_LIST = Object.freeze(Object.values(REVISION_STATES));

const AUDIT_ACTIONS = Object.freeze({
    CREATE_DRAFT: 'create_draft',
    UPDATE_DRAFT: 'update_draft',
    PUBLISH: 'publish',
    ROLLBACK: 'rollback'
});

const UNMATCHED_EVENT_STATUSES = Object.freeze({
    OPEN: 'open',
    RESOLVED: 'resolved',
    IGNORED: 'ignored'
});

const UNMATCHED_EVENT_STATUS_LIST = Object.freeze(Object.values(UNMATCHED_EVENT_STATUSES));

const SCHEMA_VERSION = 1;

function getProfileDisplayName(profileCode) {
    return PROFILE_DISPLAY_NAMES[profileCode] || profileCode;
}

module.exports = {
    PROFILE_CODES,
    PROFILE_CODE_LIST,
    PROFILE_DISPLAY_NAMES,
    PROFILE_STATUSES,
    PROFILE_STATUS_LIST,
    REVISION_STATES,
    REVISION_STATE_LIST,
    AUDIT_ACTIONS,
    UNMATCHED_EVENT_STATUSES,
    UNMATCHED_EVENT_STATUS_LIST,
    SCHEMA_VERSION,
    getProfileDisplayName
};
