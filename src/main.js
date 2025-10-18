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
  return Math.round(revenue);
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

  if (index === 0) {
    return Math.round(profit * 0.15);
  } else if (index === 1 || index === 2) {
    return Math.round(profit * 0.1);
  } else if (index === total - 1) {
    return 0;
  } else {
    return Math.round(profit * 0.05);
  }
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
    throw new Error("Некорректные данные: sellers должен быть массивом");
  }

  if (!Array.isArray(data.products)) {
    throw new Error("Некорректные данные: products должен быть массивом");
  }

  if (!Array.isArray(data.purchase_records)) {
    throw new Error(
      "Некорректные данные: purchase_records должен быть массивом"
    );
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
  const sellerIndex = sellerStats.reduce((acc, seller) => {
    acc[seller.id] = seller;
    return acc;
  }, {});

  const productIndex = data.products.reduce((acc, product) => {
    acc[product.sku] = product;
    return acc;
  }, {});

  // @TODO: Расчёт выручки и прибыли для каждого продавца
  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];
    if (!seller) return;

    record.items.forEach((item) => {
      const product = productIndex[item.sku];
      if (!product) return;

      // Расчет выручки и прибыли
      const revenue = calculateRevenue(item, product);
      const cost = (product.purchase_price || 0) * (item.quantity || 0);
      const profit = revenue - cost;

      // Обновляем статистику продавца
      seller.revenue += revenue;
      seller.profit += profit;
      seller.sales_count += item.quantity || 0;

      // Учитываем количество проданных товаров
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
      .slice(0, 3); // Топ-3 товара
  });

  // @TODO: Подготовка итоговой коллекции с нужными полями
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
