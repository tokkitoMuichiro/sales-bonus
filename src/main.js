/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  const { discount = 0, sale_price = 0, quantity = 0 } = purchase;
  const discountDecimal = discount / 100;
  const revenue = sale_price * quantity * (1 - discountDecimal);
  // ✅ Используем toFixed для полного совпадения с эталоном
  return Number(revenue.toFixed(2));
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  const { profit = 0 } = seller;

  if (total === 0) return 0;

  let bonusPercentage = 0;
  if (index === 0) bonusPercentage = 0.15;
  else if (index === 1 || index === 2) bonusPercentage = 0.1;
  else if (index === total - 1) bonusPercentage = 0;
  else bonusPercentage = 0.05;

  const bonus = profit * bonusPercentage;
  return Number(bonus.toFixed(2));
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  if (!data || typeof data !== "object") throw new Error("Некорректные данные");
  if (
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.purchase_records)
  )
    throw new Error("Некорректные данные");
  if (
    data.sellers.length === 0 ||
    data.products.length === 0 ||
    data.purchase_records.length === 0
  )
    throw new Error("Некорректные данные");

  if (!options || typeof options !== "object" || Array.isArray(options))
    throw new Error("Некорректные опции");

  const { calculateRevenue, calculateBonus } = options;
  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  )
    throw new Error("Некорректные опции");

  const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name || ""} ${seller.last_name || ""}`.trim(),
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
    bonus: 0,
    top_products: [],
  }));

  const sellerIndex = {};
  sellerStats.forEach((s) => (sellerIndex[s.id] = s));

  const productIndex = {};
  data.products.forEach((product) => {
    if (product && product.sku) productIndex[product.sku] = product;
  });

  data.purchase_records.forEach((record) => {
    if (!record || !Array.isArray(record.items)) return;

    const seller = sellerIndex[record.seller_id];
    if (!seller) return;

    seller.sales_count++;

    record.items.forEach((item) => {
      if (!item || !item.sku) return;
      const product = productIndex[item.sku];
      if (!product) return;

      const revenue = calculateRevenue(item, product);
      const cost = Number(
        ((product.purchase_price || 0) * (item.quantity || 0)).toFixed(2)
      );
      const profit = Number((revenue - cost).toFixed(2));

      // аккумулируем с промежуточным округлением
      seller.revenue = Number((seller.revenue + revenue).toFixed(2));
      seller.profit = Number((seller.profit + profit).toFixed(2));

      seller.products_sold[item.sku] =
        (seller.products_sold[item.sku] || 0) + (item.quantity || 0);
    });
  });

  sellerStats.forEach((seller) => {
    seller.revenue = Number(seller.revenue.toFixed(2));
    seller.profit = Number(seller.profit.toFixed(2));
  });

  sellerStats.sort((a, b) => b.profit - a.profit);

  const totalSellers = sellerStats.length;
  sellerStats.forEach((seller, index) => {
    seller.bonus = Number(
      calculateBonus(index, totalSellers, seller).toFixed(2)
    );
    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  return sellerStats.map((seller) => ({
    seller_id: seller.id,
    name: seller.name,
    revenue: seller.revenue,
    profit: seller.profit,
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: seller.bonus,
  }));
}
