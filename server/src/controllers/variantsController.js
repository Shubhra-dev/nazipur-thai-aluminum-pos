import knex from "../db/knex.js";

/**
 * Helper: resolve group_name from product type and inputs
 */
async function resolveGroupName(productId, body) {
  const product = await knex("products").where({ id: productId }).first();
  if (!product) throw new Error("Product not found");

  const t = product.type;
  if (t === "Glass" && body.thickness_mm != null) {
    return `${Number(body.thickness_mm)}mm`;
  }
  if (t === "SS Pipe" && body.thickness_mm != null) {
    return `${Number(body.thickness_mm)}mm`;
  }
  if (t === "Thai Aluminum") {
    return body.group_name || "Default";
  }
  return "Default";
}

// POST /api/products/:id/variants
export async function createVariant(req, res, next) {
  try {
    const productId = Number(req.params.id);

    const {
      sku,
      label,
      thickness_mm,
      width_in,
      height_in,
      color,
      rod_length_ft,
      pipe_length_ft,
      cost_price,
      price_base,
      price_alt,
      low_stock_threshold,
      opening_stock,
      active,
      group_name, // optional for Thai
    } = req.body;

    const resolvedGroup = await resolveGroupName(productId, {
      thickness_mm,
      group_name,
    });

    const product = await knex("products").where({ id: productId }).first();

    const toInsert = {
      product_id: productId,
      sku,
      size_label: label || null,
      thickness_mm: thickness_mm ?? null,
      width_in: width_in ?? null,
      height_in: height_in ?? null,
      color: color || null,
      rod_length_ft: rod_length_ft ?? null,
      pipe_length_ft:
        product.type === "SS Pipe"
          ? pipe_length_ft ?? 20
          : pipe_length_ft ?? null,
      cost_price: cost_price ?? 0,
      price_base: price_base ?? null,
      price_alt: product.type === "Others" ? null : price_alt ?? null,
      low_stock_threshold: low_stock_threshold ?? 0,
      on_hand: opening_stock ? Number(opening_stock) : 0, // opening stock -> on_hand
      active: active === false ? 0 : 1,
      group_name: resolvedGroup,
    };

    if (toInsert.sku) {
      const exists = await knex("variants")
        .where({ sku: toInsert.sku })
        .first();
      if (exists)
        return res
          .status(409)
          .json({ error: true, message: "SKU already exists" });
    }

    const [id] = await knex("variants").insert(toInsert);
    const v = await knex("variants").where({ id }).first();
    res.json({ success: true, data: v });
  } catch (err) {
    next(err);
  }
}

// PUT /api/products/:id/variants/:variantId
export async function updateVariant(req, res, next) {
  try {
    const { variantId } = req.params;
    const patch = { ...req.body };
    delete patch.opening_stock; // never used on update

    // If product type is Others → force price_alt null
    const product = await knex("products")
      .join("variants", "products.id", "variants.product_id")
      .where("variants.id", variantId)
      .select("products.type")
      .first();
    if (product?.type === "Others") {
      patch.price_alt = null;
    }

    await knex("variants").where({ id: variantId }).update(patch);
    const v = await knex("variants").where({ id: variantId }).first();
    res.json({ success: true, data: v });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/products/:id/variants/:variantId (soft)
export async function softDeleteVariant(req, res, next) {
  try {
    await knex("variants")
      .where({ id: req.params.variantId })
      .update({ active: 0 });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// POST /api/products/:id/variants/:variantId/restore
export async function restoreVariant(req, res, next) {
  try {
    await knex("variants")
      .where({ id: req.params.variantId })
      .update({ active: 1 });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
