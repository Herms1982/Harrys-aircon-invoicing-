import { StockItem } from '../types';

export interface SupplierAlias {
  id: string;
  supplierName: string;
  rawDescription: string;
  supplierSku?: string;
  mappedStockId: string;
  updatedAt: string;
}

const ALIASES_KEY = 'stock_app_supplier_aliases_v1';

export function getStoredSupplierAliases(): SupplierAlias[] {
  try {
    const raw = localStorage.getItem(ALIASES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredSupplierAliases(aliases: SupplierAlias[]) {
  try {
    localStorage.setItem(ALIASES_KEY, JSON.stringify(aliases));
  } catch (e) {
    console.error('Failed to save supplier aliases:', e);
  }
}

export function saveSupplierAliasMapping(
  supplierName: string,
  rawDescription: string,
  supplierSku: string | undefined,
  mappedStockId: string
) {
  if (!supplierName || (!rawDescription && !supplierSku) || !mappedStockId) return;

  const aliases = getStoredSupplierAliases();
  const normSupplier = supplierName.trim().toLowerCase();
  const normDesc = (rawDescription || '').trim().toLowerCase();
  const normSku = (supplierSku || '').trim().toLowerCase();

  // Find existing mapping or add new
  const index = aliases.findIndex(
    (a) =>
      a.supplierName.toLowerCase() === normSupplier &&
      ((normDesc && a.rawDescription.toLowerCase() === normDesc) ||
        (normSku && a.supplierSku && a.supplierSku.toLowerCase() === normSku))
  );

  const newEntry: SupplierAlias = {
    id: `alias-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    supplierName: supplierName.trim(),
    rawDescription: rawDescription ? rawDescription.trim() : '',
    supplierSku: supplierSku ? supplierSku.trim() : undefined,
    mappedStockId,
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    aliases[index] = newEntry;
  } else {
    aliases.push(newEntry);
  }

  saveStoredSupplierAliases(aliases);
}

/**
 * Normalizes item names for trade comparison
 * (e.g. strips punctuation, extra spaces, standardizes 1P/1-Pole, 2.5mm/2.5mm2)
 */
export function normalizeTradeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/²/g, '2')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates a token overlap similarity score between 0 and 1
 */
export function calculateSimilarityScore(source: string, target: string): number {
  const normSource = normalizeTradeText(source);
  const normTarget = normalizeTradeText(target);

  if (normSource === normTarget) return 1;
  if (!normSource || !normTarget) return 0;

  const sourceTokens = new Set(normSource.split(' ').filter((t) => t.length > 1));
  const targetTokens = new Set(normTarget.split(' ').filter((t) => t.length > 1));

  if (sourceTokens.size === 0 || targetTokens.size === 0) return 0;

  let intersectionCount = 0;
  sourceTokens.forEach((token) => {
    if (targetTokens.has(token)) {
      intersectionCount++;
    }
  });

  const unionCount = new Set([...sourceTokens, ...targetTokens]).size;
  return intersectionCount / unionCount;
}

/**
 * Finds best matching stock item from inventory for a supplier invoice line
 */
export function findBestCatalogMatch(
  supplierName: string,
  rawDescription: string,
  supplierSku: string | undefined,
  catalog: StockItem[]
): { item: StockItem | null; confidence: 'EXACT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'; reason: string } {
  if (!catalog || catalog.length === 0) {
    return { item: null, confidence: 'NONE', reason: 'Catalog is empty' };
  }

  // 1. Check known supplier alias memory
  const aliases = getStoredSupplierAliases();
  const normSupplier = supplierName.trim().toLowerCase();
  const normDesc = (rawDescription || '').trim().toLowerCase();
  const normSku = (supplierSku || '').trim().toLowerCase();

  const foundAlias = aliases.find(
    (a) =>
      a.supplierName.toLowerCase() === normSupplier &&
      ((normDesc && a.rawDescription.toLowerCase() === normDesc) ||
        (normSku && a.supplierSku && a.supplierSku.toLowerCase() === normSku))
  );

  if (foundAlias) {
    const aliasItem = catalog.find((c) => c.id === foundAlias.mappedStockId);
    if (aliasItem) {
      return {
        item: aliasItem,
        confidence: 'EXACT',
        reason: `Matched via learned supplier alias for ${supplierName}: "${aliasItem.name}"`,
      };
    }
  }

  // 2. Exact SKU match
  if (supplierSku) {
    const exactSkuItem = catalog.find(
      (c) => c.sku.toLowerCase().trim() === supplierSku.toLowerCase().trim()
    );
    if (exactSkuItem) {
      return {
        item: exactSkuItem,
        confidence: 'EXACT',
        reason: `Exact SKU code match: ${exactSkuItem.sku}`,
      };
    }
  }

  // 3. Exact Name Match
  const exactNameItem = catalog.find(
    (c) => c.name.toLowerCase().trim() === rawDescription.toLowerCase().trim()
  );
  if (exactNameItem) {
    return {
      item: exactNameItem,
      confidence: 'EXACT',
      reason: `Exact item description match`,
    };
  }

  // 4. Fuzzy / Token similarity scoring
  let bestItem: StockItem | null = null;
  let highestScore = 0;

  for (const item of catalog) {
    // Score against name + sku + category
    const nameScore = calculateSimilarityScore(rawDescription, item.name);
    const skuScore = supplierSku ? calculateSimilarityScore(supplierSku, item.sku) : 0;
    const combinedScore = Math.max(nameScore, skuScore * 0.9);

    if (combinedScore > highestScore) {
      highestScore = combinedScore;
      bestItem = item;
    }
  }

  if (bestItem && highestScore >= 0.65) {
    return {
      item: bestItem,
      confidence: 'HIGH',
      reason: `Strong keyword & technical rating match (${Math.round(highestScore * 100)}% match with "${bestItem.name}")`,
    };
  }

  if (bestItem && highestScore >= 0.4) {
    return {
      item: bestItem,
      confidence: 'MEDIUM',
      reason: `Moderate similarity match (${Math.round(highestScore * 100)}% match with "${bestItem.name}")`,
    };
  }

  if (bestItem && highestScore >= 0.25) {
    return {
      item: bestItem,
      confidence: 'LOW',
      reason: `Low match confidence with "${bestItem.name}"`,
    };
  }

  return {
    item: null,
    confidence: 'NONE',
    reason: 'No similar item found in current stock catalog. Suggested as a new stock item.',
  };
}
