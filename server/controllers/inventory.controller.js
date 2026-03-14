const { sendSuccess } = require('../app/http/response');
const { inventoryService } = require('../services/inventory');

async function listInventory(_req, res) {
  return sendSuccess(res, await inventoryService.listInventory());
}

async function updateInventoryItem(req, res) {
  return sendSuccess(
    res,
    await inventoryService.updateInventoryItem(req.params.id, req.body),
  );
}

module.exports = {
  listInventory,
  updateInventoryItem,
};
