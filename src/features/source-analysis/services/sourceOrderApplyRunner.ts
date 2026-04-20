export async function runSourceOrderApplyPipeline(options: {
  orderData: any;
  persistCache?: boolean;
  applyContractState: (orderData: any) => void;
  applyContractCache: (options: { orderData: any; persistCache?: boolean }) => Promise<void>;
  calculateMaterials: () => Promise<void>;
}) {
  const { orderData, persistCache = true, applyContractState, applyContractCache, calculateMaterials } = options;
  applyContractState(orderData);
  await applyContractCache({ orderData, persistCache });
  await calculateMaterials();
}
