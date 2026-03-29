function parseUnixTimestamp(timestamp: number | string): Date {
  timestamp = +timestamp;

  if (!timestamp || isNaN(+timestamp)) {
    throw new Error('Invalid timestamp: must be a valid number');
  }

  // Get current timestamp in milliseconds for reference
  const now = Date.now();

  // Detect if timestamp is in seconds or milliseconds
  // Assumptions:
  // 1. If timestamp is less than 10000000000 (10^10), it's likely in seconds
  //    (Year 2286 will be the first year to exceed this threshold in seconds)
  // 2. Also check if multiplying by 1000 would exceed reasonable future dates
  // 3. Check if timestamp is closer to current time in milliseconds format
  const inSeconds =
    (timestamp < 10000000000 || // Less than ~year 2286 in seconds
      timestamp * 1000 > now + 86400000 * 365 * 50) && // Would be >50 years in future if in seconds
    timestamp < now; // Also less than current milliseconds

  // Convert to milliseconds if needed
  const milliseconds = inSeconds ? timestamp * 1000 : timestamp;

  // Create Date object
  const date = new Date(milliseconds);

  // Verify the date is valid
  if (isNaN(date.getTime())) {
    throw new Error('Invalid timestamp: resulted in invalid date');
  }

  return date;
}

/**
 * Recursively parses specified date fields in an object or array, converting Unix timestamps to Date objects.
 *
 * @example
 * // Convert timestamps in a single object
 * parseDateFields(
 *   { id: 1, createdAt: 1700000000, updatedAt: 1700000000000 },
 *   ['createdAt', 'updatedAt']
 * )
 * // Returns: { id: 1, createdAt: Date, updatedAt: Date }
 *
 * @example
 * // Process arrays of objects
 * parseDateFields(
 *   [
 *     { id: 1, publishedAt: 1700000000 },
 *     { id: 2, publishedAt: 1700000000000 }
 *   ],
 *   ['publishedAt']
 * )
 * // Returns: [{ id: 1, publishedAt: Date }, { id: 2, publishedAt: Date }]
 *
 * @example
 * // Handle nested objects
 * parseDateFields(
 *   { user: { name: "John", registeredAt: 1700000000 } },
 *   ['registeredAt']
 * )
 * // Returns: { user: { name: "John", registeredAt: Date } }
 *
 * @remarks
 * - The function is recursive and will traverse all nested objects and arrays
 * - Only fields with string or number values will be converted
 * - Empty values and non-matching fields are left unchanged
 * - Date objects and primitives are returned as-is
 * - Arrays are processed element by element
 */
export function parseDateFields<T>(data: T, dateFields: string[]): T {
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => parseDateFields(item, dateFields)) as T;
  }

  if (data && typeof data === 'object' && !(data instanceof Date)) {
    const result = { ...data } as Record<string, unknown>;

    for (const field of dateFields) {
      if (field in result && result[field]) {
        const value = result[field];
        if (typeof value === 'string' || typeof value === 'number') {
          result[field] = parseUnixTimestamp(value);
        }
      }
    }

    // Recursively process nested objects
    for (const [key, value] of Object.entries(result)) {
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        result[key] = parseDateFields(value, dateFields);
      }
    }

    return result as T;
  }

  // Return primitives and Date objects as-is
  return data;
}
