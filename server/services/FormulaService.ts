/**
 * 兼容性转发层 (Compatibility Bridge)
 * 允许旧的 require('../services/FormulaService') 继续工作
 */
import * as formulaWorkflow from './formulas';
module.exports = formulaWorkflow;
export default formulaWorkflow;
