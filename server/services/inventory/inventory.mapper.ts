export function toInventoryItem(material: Record<string, any>) {
  const balances = Array.isArray(material.locationBalances) ? material.locationBalances : [];
  const locations = balances
    .map((balance) => {
      const warehouse = balance.warehouse || {};
      const location = balance.location || {};
      return {
        warehouseId: Number(balance.warehouse_id || warehouse.id || 0),
        warehouseName: warehouse.name || '',
        locationId: Number(balance.location_id || location.id || 0),
        locationCode: location.code || '',
        locationName: location.name || '',
        quantity: Number(balance.quantity || 0),
      };
    })
    .filter((entry) => entry.locationId > 0);

  return {
    id: Number(material.id),
    code: material.code || '',
    category: material.category || 'Uncategorized',
    model: material.model || '',
    name: material.name,
    stock_quantity: Number(material.stock_quantity || 0),
    price: Number(material.price || 0),
    min_stock: Number(material.min_stock || 0),
    unit: material.unit || 'PCS',
    supplier: material.supplier || '',
    last_updated: material.updatedAt ? material.updatedAt.toISOString() : new Date().toISOString(),
    locations,
  };
}
