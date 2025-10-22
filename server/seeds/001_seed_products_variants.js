export async function seed(knex) {
  // Products
  const [glassId] = await knex("products").insert({
    name: "Clear Glass",
    type: "Glass",
    category: "Glass",
    active: 1,
  });
  const [alumId] = await knex("products").insert({
    name: "Thai Aluminum Channel",
    type: "Thai Aluminum",
    category: "Thai",
    active: 1,
  });
  const [ssId] = await knex("products").insert({
    name: "SS Pipe Round",
    type: "SS Pipe",
    category: "SS",
    active: 1,
  });
  const [othId] = await knex("products").insert({
    name: "Silicone Tube",
    type: "Others",
    category: "Accessory",
    active: 1,
  });

  // Variants
  const variants = [
    // Glass: price_base per sheet, price_alt per sqft; stock in sheets
    {
      product_id: glassId,
      sku: "GL-5MM-24x36",
      size_label: "24x36",
      thickness_mm: 5,
      width_in: 24,
      height_in: 36,
      price_base: 1800.0,
      price_alt: 22.0,
      cost_price: 1500.0,
      on_hand: 10.0,
      low_stock_threshold: 5.0,
      active: 1,
    },
    {
      product_id: glassId,
      sku: "GL-8MM-36x48",
      size_label: "36x48",
      thickness_mm: 8,
      width_in: 36,
      height_in: 48,
      price_base: 3200.0,
      price_alt: 38.0,
      cost_price: 2800.0,
      on_hand: 6.5,
      low_stock_threshold: 3.0,
      active: 1,
    },

    // Thai Aluminum: base per bar, alt per ft; bar length either 21 or 18.5 ft; stock in bars
    {
      product_id: alumId,
      sku: "AL-21-BLACK",
      size_label: "1 inch",
      color: "Black",
      rod_length_ft: 21.0,
      price_base: 1250.0,
      price_alt: 68.0,
      cost_price: 1000.0,
      on_hand: 12.0,
      low_stock_threshold: 4.0,
      active: 1,
    },
    {
      product_id: alumId,
      sku: "AL-18.5-SILVER",
      size_label: "3/4 inch",
      color: "Silver",
      rod_length_ft: 18.5,
      price_base: 1100.0,
      price_alt: 62.0,
      cost_price: 900.0,
      on_hand: 3.5,
      low_stock_threshold: 5.0,
      active: 1,
    },

    // SS Pipe: base per pipe (20 ft), alt per ft; stock in pipes
    {
      product_id: ssId,
      sku: "SS-1.2MM",
      thickness_mm: 1.2,
      pipe_length_ft: 20.0,
      price_base: 2100.0,
      price_alt: 120.0,
      cost_price: 1800.0,
      on_hand: 9.0,
      low_stock_threshold: 4.0,
      active: 1,
    },

    // Others: piece only, price_alt = null
    {
      product_id: othId,
      sku: "ACC-SILICONE-CLR",
      size_label: "Clear 300ml",
      price_base: 220.0,
      price_alt: null,
      cost_price: 180.0,
      on_hand: 25.0,
      low_stock_threshold: 10.0,
      active: 1,
    },
  ];

  await knex("variants").insert(variants);
}
