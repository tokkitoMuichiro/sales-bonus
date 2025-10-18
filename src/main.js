/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  if (!purchase || !_product) return 0;

  const discount = purchase.discount || 0;
  const sale_price = purchase.sale_price || 0;
  const quantity = purchase.quantity || 0;

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
  if (!seller || total === 0) return 0;

  const profit = seller.profit || 0;
  let bonusRating = 0;

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
  // Всегда возвращаем массив, даже если данные некорректны
  if (!data || typeof data !== "object") {
    return [];
  }

  // Гарантируем, что у нас есть массивы (даже пустые)
  const purchase_records = Array.isArray(data.purchase_records)
    ? data.purchase_records
    : [];
  const products = Array.isArray(data.products) ? data.products : [];
  const sellers = Array.isArray(data.sellers) ? data.sellers : [];

  // Если нет продавцов, возвращаем пустой массив
  if (sellers.length === 0) {
    return [];
  }

  // Создаем статистику для продавцов
  const sellerStats = sellers.map((seller) => ({
    seller_id: seller?.id || "",
    name: `${seller?.first_name || ""} ${seller?.last_name || ""}`.trim(),
    revenue: 0,
    profit: 0,
    sales_count: 0,
    bonus: 0,
    productQuantities: {},
    top_products: [],
  }));

  // Создаем индексы для быстрого доступа
  const productIndex = {};
  products.forEach((product) => {
    if (product && product.sku) {
      productIndex[product.sku] = product;
    }
  });

  const sellerIndex = {};
  sellerStats.forEach((seller) => {
    if (seller.seller_id) {
      sellerIndex[seller.seller_id] = seller;
    }
  });

  // Обрабатываем записи о покупках
  purchase_records.forEach((record) => {
    if (!record || !Array.isArray(record.items)) return;

    const seller = sellerIndex[record.seller_id];
    if (!seller) return;

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

      seller.revenue += revenue;
      seller.profit += profit;
      seller.sales_count += quantity;
      seller.productQuantities[item.sku] =
        (seller.productQuantities[item.sku] || 0) + quantity;
    });
  });

  // Сортируем по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);

  // Назначаем бонусы
  const totalSellers = sellerStats.length;
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonusByProfit(index, totalSellers, seller);
  });

  // Формируем топ товары
  sellerStats.forEach((seller) => {
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
