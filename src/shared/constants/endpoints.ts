/**
 * API 路径与工作流配置常量
 */

export const CONFIG_ENDPOINTS = {
  HANDLE: {
    path: '/config/handle',
    profile: 'handle',
    basePath: '/config/profiles'
  },
  CYLINDER: {
    path: '/config/cylinder',
    profile: 'cylinder',
    basePath: '/config/profiles'
  },
  LOCK_FORK: {
    path: '/config/lock-fork',
    profile: 'lock_fork',
    basePath: '/config/profiles'
  },
  LOCK: {
    path: '/config/lock',
    profile: 'lock',
    basePath: '/config/profiles'
  },
  PACKAGING: {
    path: '/config/packaging',
    profile: 'packaging',
    basePath: '/config/profiles'
  },
  MATERIAL_CATALOG: {
    path: '/config/material-catalog',
    profile: 'material_catalog',
    basePath: '/config/profiles'
  }
} as const;
