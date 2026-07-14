export const paginate = async (model, options = {}) => {
  const { page = 1, limit = 20, sortBy = "created_at", order = "desc", where = {}, include = [], attributes } = options;

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (safePage - 1) * safeLimit;
  const safeOrder = ["asc", "desc"].includes(order.toLowerCase()) ? order.toLowerCase() : "desc";

  const validSortColumns = Object.keys(model.rawAttributes);
  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : "createdAt";

  const queryOptions = {
    where,
    include,
    order: [[safeSortBy, safeOrder.toUpperCase()]],
    limit: safeLimit,
    offset,
    distinct: true,
  };

  if (attributes) {
    queryOptions.attributes = attributes;
  }

  const { count, rows } = await model.findAndCountAll(queryOptions);

  const totalPages = Math.ceil(count / safeLimit);

  return {
    data: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalItems: count,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
  };
};

export const getPaginationParams = (query) => ({
  page: query.page,
  limit: query.limit,
  sortBy: query.sortBy,
  order: query.order,
});
