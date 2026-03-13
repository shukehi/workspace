function createIssue(target, field, message) {
  return { target, field, message };
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateInventoryIdParams(params) {
  const id = Number(params?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return [createIssue('params', 'id', '库存物料 id 必须为正整数')];
  }
  return [];
}

function validateInventoryUpdateBody(body) {
  if (!isPlainObject(body)) {
    return [createIssue('body', 'body', '请求体必须为对象')];
  }

  const issues = [];
  const stockQuantity = Number(body.stock_quantity);
  if (!Number.isFinite(stockQuantity)) {
    issues.push(createIssue('body', 'stock_quantity', '库存数量必须为有效数字'));
  }

  if (body.min_stock !== undefined && !Number.isFinite(Number(body.min_stock))) {
    issues.push(createIssue('body', 'min_stock', '安全库存必须为有效数字'));
  }

  return issues;
}

module.exports = {
  validateInventoryIdParams,
  validateInventoryUpdateBody,
};
