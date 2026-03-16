/**
 * API 路径与工作流配置常量
 */

export const CONFIG_ENDPOINTS = {
  HANDLE: {
    path: '/config/handle',
    profile: 'handle'
  },
  CYLINDER: {
    path: '/config/cylinder',
    profile: 'cylinder'
  },
  LOCK_FORK: {
    path: '/config/lock-fork',
    profile: 'lock_fork'
  },
  LOCK: {
    path: '/config/lock',
    profile: 'lock'
  },
  PACKAGING: {
    path: '/config/packaging',
    profile: 'packaging'
  },
  MATERIAL_CATALOG: {
    path: '/config/material-catalog',
    profile: 'material-catalog',
    basePath: '/config'
  }
} as const;
