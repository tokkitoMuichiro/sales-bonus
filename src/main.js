/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  const { discount = 0, sale_price = 0, quantity = 0 } = purchase;
  const discountDecimal = discount / 100;
  const rawRevenue = sale_price * quantity * (1 - discountDecimal);
  // Округляем каждый шаг до двух знаков
  return Math.round(rawRevenue * 100) / 100;
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
  if (index === 0) {
    bonusPercentage = 0.15;
  } else if (index === 1 || index === 2) {
    bonusPercentage = 0.1;
  } else if (index === total - 1) {
    bonusPercentage = 0;
  } else {
    bonusPercentage = 0.05;
  }

  const bonus = profit * bonusPercentage;
  return Math.round(bonus * 100) / 100;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // Проверка входных данных
  if (!data || typeof data !== "object") throw new Error("Некорректные данные");
  if (
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.purchase_records)
  ) {
    throw new Error("Некорректные данные");
  }
  if (
    data.sellers.length === 0 ||
    data.products.length === 0 ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные данные");
  }

  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new Error("Некорректные опции");
  }

  const { calculateRevenue, calculateBonus } = options;
  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error("Некорректные опции");
  }

  // Подготовка данных
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

  // Индексация
  const sellerIndex = {};
  sellerStats.forEach((s) => (sellerIndex[s.id] = s));

  const productIndex = {};
  data.products.forEach((p) => {
    if (p && p.sku) productIndex[p.sku] = p;
  });

  // Расчет статистики
  data.purchase_records.forEach((record) => {
    if (!record || !Array.isArray(record.items)) return;

    const seller = sellerIndex[record.seller_id];
    if (!seller) return;

    seller.sales_count += 1;

    record.items.forEach((item) => {
      if (!item || !item.sku) return;
      const product = productIndex[item.sku];
      if (!product) return;

      // Выручка за позицию
      const revenue = calculateRevenue(item, product);
      // Себестоимость за позицию (округляем каждую позицию)
      const cost =
        Math.round((product.purchase_price || 0) * (item.quantity || 0) * 100) /
        100;
      // Прибыль за позицию
      const profit = Math.round((revenue - cost) * 100) / 100;

      // Округляем и аккумулируем, чтобы не было хвостов
      seller.revenue = Math.round((seller.revenue + revenue) * 100) / 100;
      seller.profit = Math.round((seller.profit + profit) * 100) / 100;

      seller.products_sold[item.sku] =
        (seller.products_sold[item.sku] || 0) + (item.quantity || 0);
    });
  });

  // Финальное округление на случай накопленных ошибок
  sellerStats.forEach((s) => {
    s.revenue = Number(s.revenue.toFixed(2));
    s.profit = Number(s.profit.toFixed(2));
  });

  // Сортировка по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);

  // Расчет бонусов
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
