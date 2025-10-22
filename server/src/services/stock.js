import db from "../db.js";

export async function getWeightedAverageCost(variantId) {
  const rows = await db("restocks").where({ variant_id: variantId });
  if (!rows.length) return 0;

  let totalQty = 0,
    totalCost = 0;
  for (const r of rows) {
    totalQty += Number(r.qty_base);
    totalCost += Number(r.qty_base) * Number(r.cost_per_unit);
  }
  return totalQty > 0 ? totalCost / totalQty : 0;
}
