// Pagination and query optimization utilities
import { logger } from './logger.js';

// Configuration constants
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 1000;
export const DEFAULT_SORT = { createdAt: -1 };

/**
 * Parse and validate pagination parameters
 */
export function parsePaginationParams(req) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limitParam = parseInt(req.query.limit) || DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, limitParam), MAX_LIMIT);
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
}

/**
 * Parse and validate sort parameters
 */
export function parseSortParams(req, allowedFields = ['createdAt', 'updatedAt']) {
  const sortField = req.query.sortBy;
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  
  if (sortField && allowedFields.includes(sortField)) {
    return { [sortField]: sortOrder };
  }
  
  return DEFAULT_SORT;
}

/**
 * Build standardized query filter
 */
export function buildQueryFilter(req, allowedFilters = {}) {
  const filter = {};
  
  // Apply allowed filters
  for (const [key, validator] of Object.entries(allowedFilters)) {
    const value = req.query[key];
    if (value !== undefined && value !== null && value !== '') {
      if (typeof validator === 'function') {
        const validatedValue = validator(value);
        if (validatedValue !== null) {
          filter[key] = validatedValue;
        }
      } else {
        filter[key] = value;
      }
    }
  }
  
  // Date range filters
  if (req.query.startDate || req.query.endDate) {
    const dateFilter = {};
    if (req.query.startDate) {
      const startDate = new Date(req.query.startDate);
      if (!isNaN(startDate)) {
        dateFilter.$gte = startDate;
      }
    }
    if (req.query.endDate) {
      const endDate = new Date(req.query.endDate);
      if (!isNaN(endDate)) {
        // End of day
        endDate.setHours(23, 59, 59, 999);
        dateFilter.$lte = endDate;
      }
    }
    if (Object.keys(dateFilter).length > 0) {
      filter.createdAt = dateFilter;
    }
  }
  
  return filter;
}

/**
 * Execute paginated query with performance optimizations
 */
export async function executePaginatedQuery(Model, req, options = {}) {
  const {
    allowedFilters = {},
    allowedSortFields = ['createdAt', 'updatedAt'],
    defaultSort = DEFAULT_SORT,
    populate = null,
    select = null,
    lean = true
  } = options;
  
  try {
    // Parse parameters
    const { page, limit, skip } = parsePaginationParams(req);
    const sort = parseSortParams(req, allowedSortFields) || defaultSort;
    const filter = buildQueryFilter(req, allowedFilters);
    
    // Build query
    let query = Model.find(filter);
    
    if (lean) {
      query = query.lean();
    }
    
    if (select) {
      query = query.select(select);
    }
    
    if (populate) {
      query = query.populate(populate);
    }
    
    // Execute count and data queries in parallel
    const [total, data] = await Promise.all([
      Model.countDocuments(filter),
      query.sort(sort).skip(skip).limit(limit).exec()
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    const result = {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      },
      filter: Object.keys(filter).length > 0 ? filter : null,
      sort
    };
    
    // Log query performance for monitoring
    logger.info('Paginated query executed', {
      model: Model.modelName,
      filter: Object.keys(filter),
      page,
      limit,
      total,
      resultCount: data.length
    });
    
    return result;
    
  } catch (error) {
    logger.error('Paginated query failed', {
      model: Model.modelName,
      error: error.message,
      query: req.query
    });
    throw error;
  }
}

/**
 * Middleware to add pagination helpers to request
 */
export function paginationMiddleware(options = {}) {
  return (req, res, next) => {
    req.pagination = parsePaginationParams(req);
    req.sort = parseSortParams(req, options.allowedSortFields);
    req.filter = buildQueryFilter(req, options.allowedFilters);
    next();
  };
}

/**
 * Response formatter for paginated results
 */
export function formatPaginatedResponse(result, req) {
  const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
  const queryParams = { ...req.query };
  
  // Build navigation URLs
  const buildUrl = (page) => {
    const params = new URLSearchParams({ ...queryParams, page: page.toString() });
    return `${baseUrl}?${params.toString()}`;
  };
  
  return {
    ...result,
    pagination: {
      ...result.pagination,
      links: {
        self: buildUrl(result.pagination.page),
        first: buildUrl(1),
        last: buildUrl(result.pagination.totalPages),
        next: result.pagination.hasNextPage ? buildUrl(result.pagination.nextPage) : null,
        prev: result.pagination.hasPrevPage ? buildUrl(result.pagination.prevPage) : null
      }
    }
  };
}

/**
 * Common filter validators
 */
export const filterValidators = {
  objectId: (value) => {
    return /^[0-9a-fA-F]{24}$/.test(value) ? value : null;
  },
  
  status: (validStatuses) => (value) => {
    return validStatuses.includes(value) ? value : null;
  },
  
  boolean: (value) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return null;
  },
  
  string: (minLength = 1, maxLength = 100) => (value) => {
    const str = String(value).trim();
    return str.length >= minLength && str.length <= maxLength ? str : null;
  },
  
  number: (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) => (value) => {
    const num = Number(value);
    return !isNaN(num) && num >= min && num <= max ? num : null;
  }
};

export default {
  parsePaginationParams,
  parseSortParams,
  buildQueryFilter,
  executePaginatedQuery,
  paginationMiddleware,
  formatPaginatedResponse,
  filterValidators,
  DEFAULT_LIMIT,
  MAX_LIMIT
};
