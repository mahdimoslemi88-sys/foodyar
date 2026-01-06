// services/aiCacheService.ts

const CACHE_PREFIX = 'foodyar-ai-cache-';
const RATE_LIMIT_PREFIX = 'foodyar-ai-ratelimit-';

/**
 * A simple string hashing function to create a short key from a large context object.
 */
const hashString = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

/**
 * Generates a unique cache key based on feature, date, and a hash of the context.
 * @param feature The name of the AI feature (e.g., 'advice', 'menu-eng').
 * @param context The JSON object sent to the AI, used for hashing.
 * @returns A unique string key for the cache.
 */
export const getCacheKey = (feature: string, context: object): string => {
    const dateBucket = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const contextHash = hashString(JSON.stringify(context));
    return `${CACHE_PREFIX}${feature}:${dateBucket}:${contextHash}`;
};

/**
 * Retrieves an item from the cache if it's not expired.
 * @param key The cache key.
 * @param ttlSeconds Time-to-live in seconds.
 * @returns The cached data or null if not found or expired.
 */
export const getFromCache = <T>(key: string, ttlSeconds: number): T | null => {
    try {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;

        const item = JSON.parse(itemStr);
        const isExpired = (Date.now() - item.timestamp) > ttlSeconds * 1000;

        return isExpired ? null : item.data;
    } catch (error) {
        console.error("Error reading from AI cache:", error);
        return null;
    }
};

/**
 * Stores an item in the cache with the current timestamp.
 * @param key The cache key.
 * @param data The data to store.
 */
export const setInCache = <T>(key: string, data: T): void => {
    try {
        const item = {
            data,
            timestamp: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
        console.error("Error writing to AI cache:", error);
    }
};

/**
 * Checks if a request for a given key is rate-limited.
 * @param key A unique identifier for the request type.
 * @param limitInSeconds The cooldown period in seconds.
 * @returns True if the request should be blocked, false otherwise.
 */
export const isRateLimited = (key: string, limitInSeconds: number): boolean => {
    const rateLimitKey = `${RATE_LIMIT_PREFIX}${key}`;
    const lastRequestTime = localStorage.getItem(rateLimitKey);

    if (lastRequestTime && (Date.now() - parseInt(lastRequestTime, 10)) < limitInSeconds * 1000) {
        return true;
    }
    return false;
};

/**
 * Records the timestamp of a request to enforce rate limiting.
 * @param key A unique identifier for the request type.
 */
export const recordRequest = (key: string): void => {
    const rateLimitKey = `${RATE_LIMIT_PREFIX}${key}`;
    localStorage.setItem(rateLimitKey, Date.now().toString());
};
