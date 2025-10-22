export function generateSku({ productId, fields }) {
  // Simple deterministic SKU: P{productId}-{hash of key fields}
  const base = JSON.stringify(fields);
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  return `P${productId}-${hash.toString(36).toUpperCase()}`;
}
