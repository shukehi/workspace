import * as formulaWorkflow from './formula.workflow';

/**
 * 公式领域服务统一导出
 * 仅导出 workflow 层的公开 API
 */
export {
    formulaWorkflow,
};

// 兼容现有 CommonJS 引用，确保转发时保持扁平结构
module.exports = {
    ...formulaWorkflow,
};
