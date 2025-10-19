/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчёт прибыли от операции
  const discount = 1 - purchase.discount / 100;
  const revenue = purchase.sale_price * purchase.quantity * discount;
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
  // @TODO: Расчёт бонуса от позиции в рейтинге
  const { profit } = seller;

  if (index === 0) {
    // Первое место - 15%
    return profit * 0.15;
  } else if (index === 1 || index === 2) {
    // Второе и третье место - 10%
    return profit * 0.1;
  } else if (index === total - 1) {
    // Последнее место - 0%
    return 0;
  } else {
    // Все остальные - 5%
    return profit * 0.05;
  }
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

  // Проверка опций
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
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  // Индексация
  const sellerIndex = sellerStats.reduce((result, seller) => {
    result[seller.id] = seller;
    return result;
  }, {});

  const productIndex = data.products.reduce((result, product) => {
    result[product.sku] = product;
    return result;
  }, {});

  // Расчет статистики
  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];

    if (!seller) {
      return; // Пропускаем записи с несуществующими продавцами
    }

    // Увеличить количество продаж
    seller.sales_count += 1;

    // Увеличить общую сумму всех продаж
    seller.revenue += record.total_amount;

    // Расчёт прибыли для каждого товара
    record.items.forEach((item) => {
      const product = productIndex[item.sku];

      if (!product) {
        return; // Пропускаем товары, которых нет в каталоге
      }

      // Посчитать себестоимость товара
      const cost = product.purchase_price * item.quantity;

      // Посчитать выручку с учётом скидки
      const revenue = calculateRevenue(item, product);

      // Посчитать прибыль
      const itemProfit = revenue - cost;

      // Увеличить общую накопленную прибыль у продавца
      seller.profit += itemProfit;

      // Учёт количества проданных товаров
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity;
    });
  });

  sellerStats.sort((a, b) => b.profit - a.profit);

  // @TODO: Назначение премий на основе ранжирования
  sellerStats.forEach((seller, index) => {
    // Расчет бонуса
    seller.bonus = calculateBonus(index, sellerStats.length, seller);

    // Формирование топ-10 товаров
    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  return sellerStats.map((seller) => ({
    seller_id: seller.id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2),
  }));
}
