/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  const { discount = 0, sale_price = 0, quantity = 0 } = purchase;
  const discountDecimal = discount / 100;
  const totalPrice = sale_price * quantity;
  const revenue = totalPrice * (1 - discountDecimal);
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
  let bonusRating = 0;

  if (total === 0) return 0;

  if (index === 0) {
    bonusRating = 0.15;
  } else if (index === 1 || index === 2) {
    bonusRating = 0.1;
  } else if (index === total - 1) {
    bonusRating = 0;
  } else {
    bonusRating = 0.05;
  }

  return Math.round(profit * bonusRating);
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных - разрешаем пустые массивы
  if (!data || typeof data !== "object") {
    throw new Error("Некорректные данные");
  }

  // Проверяем что обязательные поля есть, даже если они пустые
  if (
    data.purchase_records === undefined ||
    data.products === undefined ||
    data.sellers === undefined
  ) {
    throw new Error(
      "Некорректные данные: ожидаются поля purchase_records, products и sellers"
    );
  }

  // Гарантируем что это массивы (даже если пустые)
  const purchase_records = Array.isArray(data.purchase_records)
    ? data.purchase_records
    : [];
  const products = Array.isArray(data.products) ? data.products : [];
  const sellers = Array.isArray(data.sellers) ? data.sellers : [];

  // @TODO: Проверка наличия опций - делаем опциональной
  const safeOptions =
    options && typeof options === "object" && !Array.isArray(options)
      ? options
      : {};

  // @TODO: Подготовка промежуточных данных для сбора статистики
  const sellerStats = sellers.map((seller) => ({
    seller_id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    bonus: 0,
    productQuantities: {},
    top_products: [],
  }));

  // @TODO: Индексация продавцов и товаров для быстрого доступа
  const productIndex = products.reduce((acc, product) => {
    acc[product.sku] = product;
    return acc;
  }, {});

  const sellerIndex = sellerStats.reduce((acc, seller) => {
    acc[seller.seller_id] = seller;
    return acc;
  }, {});

  // @TODO: Расчет выручки и прибыли для каждого продавца
  purchase_records.forEach((record) => {
    if (!record || !record.items) return;

    const stats = sellerIndex[record.seller_id];
    if (!stats) return;

    record.items.forEach((item) => {
      if (!item || !item.sku) return;

      const product = productIndex[item.sku];
      if (!product) return;

      const quantity = item.quantity || 0;
      const salePrice = item.sale_price || product.sale_price || 0;
      const purchasePrice = product.purchase_price || 0;
      const discount = item.discount
        ? item.discount > 1
          ? item.discount / 100
          : item.discount
        : 0;

      // Расчет выручки и прибыли
      const revenue = Math.round(salePrice * quantity * (1 - discount));
      const cost = purchasePrice * quantity;
      const profit = revenue - cost;

      // Обновление статистики продавца
      stats.revenue += revenue;
      stats.profit += profit;
      stats.sales_count += quantity;

      // Обновление количества проданных товаров
      stats.productQuantities[item.sku] =
        (stats.productQuantities[item.sku] || 0) + quantity;
    });
  });

  // @TODO: Сортировка продавцов по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);

  // @TODO: Назначение премий на основе ранжирования
  const totalSellers = sellerStats.length;
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonusByProfit(index, totalSellers, seller);
  });

  // @TODO: Подготовка итоговой коллекции с нужными полями
  sellerStats.forEach((seller) => {
    // Определение топ-3 товаров
    const topProducts = Object.entries(seller.productQuantities)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([sku, quantity]) => ({ sku, quantity }));

    seller.top_products = topProducts;
    delete seller.productQuantities;
  });

  return sellerStats.map((seller) => ({
    seller_id: seller.seller_id,
    name: seller.name,
    revenue: seller.revenue,
    profit: seller.profit,
    sales_count: seller.sales_count,
    bonus: seller.bonus,
    top_products: seller.top_products,
  }));
}
