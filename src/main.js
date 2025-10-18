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
  return revenue;
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

  return profit * bonusPercentage;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных
  if (!data || typeof data !== "object") {
    throw new Error("Некорректные данные");
  }

  // Проверяем что обязательные поля есть и являются массивами
  if (!Array.isArray(data.sellers)) {
    throw new Error("Некорректные данные");
  }

  if (!Array.isArray(data.products)) {
    throw new Error("Некорректные данные");
  }

  if (!Array.isArray(data.purchase_records)) {
    throw new Error("Некорректные данные");
  }

  // Проверяем что массивы не пустые
  if (data.sellers.length === 0) {
    throw new Error("Некорректные данные");
  }

  if (data.products.length === 0) {
    throw new Error("Некорректные данные");
  }

  if (data.purchase_records.length === 0) {
    throw new Error("Некорректные данные");
  }

  // @TODO: Проверка наличия опций
  if (options === undefined) {
    throw new Error("Некорректные опции");
  }

  if (
    typeof options !== "object" ||
    options === null ||
    Array.isArray(options)
  ) {
    throw new Error("Некорректные опции");
  }

  const { calculateRevenue, calculateBonus } = options;

  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error("Некорректные опции");
  }

  // @TODO: Подготовка промежуточных данных для сбора статистики
  const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
    bonus: 0,
    top_products: [],
  }));

  // @TODO: Индексация продавцов и товаров для быстрого доступа
  const sellerIndex = {};
  data.sellers.forEach((seller) => {
    if (seller && seller.id) {
      sellerIndex[seller.id] = sellerStats.find((s) => s.id === seller.id);
    }
  });

  const productIndex = {};
  data.products.forEach((product) => {
    if (product && product.sku) {
      productIndex[product.sku] = product;
    }
  });

  // @TODO: Расчёт выручки и прибыли для каждого продавца
  data.purchase_records.forEach((record) => {
    if (!record || !Array.isArray(record.items)) return;

    const seller = sellerIndex[record.seller_id];
    if (!seller) return;

    seller.sales_count += 1;

    record.items.forEach((item) => {
      if (!item || !item.sku) return;

      const product = productIndex[item.sku];
      if (!product) return;

      // Расчет выручки и прибыли
      const revenue = calculateRevenue(item, product);
      const cost = (product.purchase_price || 0) * (item.quantity || 0);
      const profit = revenue - cost;

      seller.revenue += revenue;
      seller.profit += profit;

      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity || 0;
    });
  });

  // @TODO: Сортировка продавцов по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);

  // @TODO: Назначение премий на основе ранжирования
  const totalSellers = sellerStats.length;
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, totalSellers, seller);

    // Формируем топ-3 товара
    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);
  });

  // @TODO: Подготовка итоговой коллекции с нужными полями
  return sellerStats.map((seller) => ({
    seller_id: seller.id,
    name: seller.name,
    revenue: Number(seller.revenue.toFixed(2)),
    profit: Number(seller.profit.toFixed(2)),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: Number(seller.bonus.toFixed(2)),
  }));
}
