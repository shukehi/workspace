export function toInventoryItem(material: Record<string, any>) {
  return {
    id: Number(material.id),
    category: material.category || 'Uncategorized',
    model: material.model || '',
    name: material.name,
    stock_quantity: Number(material.stock_quantity || 0),
    min_stock: Number(material.min_stock || 0),
    unit: material.unit || 'PCS',
    supplier: material.supplier || '',
    last_updated: material.updatedAt ? material.updatedAt.toISOString() : new Date().toISOString(),
  };
}

