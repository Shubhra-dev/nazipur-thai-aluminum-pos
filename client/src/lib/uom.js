// UoM helpers for client-side checks and display only.
// The source of truth for stock validation is backend.

export function glassSqftPerSheet(variant) {
  const w = Number(variant.width_in || 0);
  const h = Number(variant.height_in || 0);
  if (!w || !h) return 0;
  return (w * h) / 144;
}

export function displayVariantName(v) {
  return (
    v.size_label || v.color || (v.thickness_mm ? `${v.thickness_mm}mm` : "")
  );
}

export function displayUomForProductType(product_type) {
  switch (product_type) {
    case "Glass":
      return { base: "sheet", alt: "sqft" };
    case "Thai Aluminum":
      return { base: "bar", alt: "ft" };
    case "SS Pipe":
      return { base: "pipe", alt: "ft" };
    default:
      return { base: "piece", alt: null };
  }
}
