import * as formulaWorkflow from './formula.workflow';

/**
 * 公式领域服务统一导出
 * 仅导出 workflow 层的公开 API
 */
export {
    formulaWorkflow,
};

// 扁平导出 workflow 层的所有公开成员，供 `import * as FormulaService` 使用
export * from './formula.workflow';
export * from './formula.mapper';

// 兼容现有 CommonJS 引用，确保转发时保持扁平结构
