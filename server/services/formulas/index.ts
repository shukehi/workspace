import * as formulaWorkflow from './formula.workflow';

/**
 * 公式领域服务统一导出
 */
export {
    formulaWorkflow,
};

// 兼容现有 CommonJS 引用
module.exports = {
    ...formulaWorkflow,
};
