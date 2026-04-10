import { packagingMatcher } from '@/lib/packagingMatcher';
import { packagingConfigReader } from '@/services/packagingConfig';
import type { Order, OrderItem } from '@/types/order';
import { findMissingCategoryFields, findMissingCommonFields } from '@/services/poContractUtils';
import {
  buildRawMaterialGroups,
  buildCylinderGroups,
  buildLockGroups,
  buildHandleGroups,
  buildAccessoryGroups,
  buildLockForkGroups,
  buildPackagingGroups,
  type RuleContext,
  type SourceStorePort,
  type SupplierGroup,
} from '@/services/po-rules';

function buildAutoOrderNo(contractCode: string, sequence: number) {
  return `PO-${contractCode}-${String(sequence).padStart(2, '0')}`;
}

export class POGenerator {
  private sourceStore: SourceStorePort;
  private ruleContext: RuleContext;

  constructor(deps?: Partial<RuleContext>) {
    if (!deps?.sourceStore) {
      throw new Error('POGenerator requires an explicit sourceStore dependency');
    }

    this.sourceStore = deps.sourceStore;
    this.ruleContext = {
      sourceStore: this.sourceStore,
      packagingMatcher: deps?.packagingMatcher || packagingMatcher,
      packagingConfig: deps?.packagingConfig || packagingConfigReader,
    };
  }

  private validateCategoryItems(category: string, items: OrderItem[], orderNo: string) {
    const invalid = findMissingCategoryFields(category, items);
    if (invalid.length > 0) {
      console.warn('[POGenerator] item field validation failed:', {
        order_no: orderNo,
        category,
        invalid,
      });
    }
  }

  private validateCommonItemFields(category: string, items: OrderItem[], orderNo: string) {
    const invalid = findMissingCommonFields(items);
    if (invalid.length > 0) {
      console.warn('[POGenerator] common item field validation failed:', {
        order_no: orderNo,
        category,
        invalid,
      });
    }
  }

  private mergeGroups(target: Record<string, SupplierGroup>, groups: SupplierGroup[]) {
    groups.forEach((group) => {
      const key = `${group.category}_${group.supplierName}`;
      if (!target[key]) {
        target[key] = {
          supplierName: group.supplierName,
          category: group.category,
          items: [],
          totalCost: 0,
        };
      }
      target[key].items.push(...group.items);
    });
  }

  generateProposal(options?: { mergeSameSpec?: boolean }): SupplierGroup[] {
    const mergeSameSpec = options?.mergeSameSpec ?? true;
    const proposal: Record<string, SupplierGroup> = {};

    this.ruleContext.packagingMatcher.syncFromMapping(this.ruleContext.packagingConfig.getPackagingMapping());

    this.mergeGroups(proposal, buildRawMaterialGroups(this.ruleContext));
    this.mergeGroups(proposal, buildCylinderGroups(this.ruleContext));
    this.mergeGroups(proposal, buildLockGroups(this.ruleContext));
    this.mergeGroups(proposal, buildHandleGroups(this.ruleContext));
    this.mergeGroups(proposal, buildAccessoryGroups(this.ruleContext));
    this.mergeGroups(proposal, buildLockForkGroups(this.ruleContext));
    this.mergeGroups(proposal, buildPackagingGroups(this.ruleContext, { mergeSameSpec }));

    const unmatched = this.ruleContext.packagingMatcher.consumeUnmatchedSummary();
    if (unmatched.length > 0) {
      console.warn('[PackagingMatcher] unmatched packaging names (top):', unmatched);
    }

    return Object.values(proposal);
  }

  createOrders(selectedGroups: { supplier: string; category: string }[], options?: { mergeSameSpec?: boolean }): Order[] {
    const proposal = this.generateProposal(options);
    const orders: Order[] = [];
    const contractCode = this.sourceStore.currentOrder?.code || 'UNKNOWN';
    const customerName = this.sourceStore.currentOrder?.customerName || '';
    let nextSequence = 1;

    proposal.forEach((group) => {
      const isSelected = selectedGroups.some(
        (g) => g.supplier === group.supplierName && g.category === group.category,
      );
      if (!isSelected) return;

      const orderNo = buildAutoOrderNo(contractCode, nextSequence);
      nextSequence += 1;

      orders.push({
        id: 0,
        order_no: orderNo,
        supplier: group.supplierName,
        source_contract_code: contractCode,
        category: group.category,
        items: group.items,
        total_amount: 0,
        created_at: new Date().toISOString(),
        status: 'draft',
        remark: '',
        metadata: {
          order_source: 'auto',
          source_contract_code: contractCode,
          customer_name: customerName,
        },
      });

      this.validateCategoryItems(group.category, group.items, orderNo);
      this.validateCommonItemFields(group.category, group.items, orderNo);
    });

    return orders;
  }
}
