/**
 * Formats a number into a currency string with thousand separators (e.g., 1200000 -> "1,200,000").
 * @param amount The number to format.
 * @returns A formatted currency string without decimals.
 */
export const formatCurrency = (amount: number): string => {
  if (isNaN(amount)) {
    return '0';
  }
  // Use en-US to ensure comma separators and standard numerals, which is common in UIs.
  return new Intl.NumberFormat('en-US').format(Math.round(amount));
};

/**
 * Safely adds two numbers to avoid floating-point inaccuracies.
 * Rounds the result to 2 decimal places, which is a good practice although Toman is integer-based.
 * @param a The first number.
 * @param b The second number.
 * @returns The sum of a and b.
 */
export const safeAdd = (a: number, b: number): number => {
  return Math.round((a + b) * 100) / 100;
};

/**
 * Safely multiplies two numbers to avoid floating-point inaccuracies.
 * Rounds the result to 2 decimal places.
 * @param a The first number.
 * @param b The second number.
 * @returns The product of a and b.
 */
export const safeMultiply = (a: number, b: number): number => {
  return Math.round((a * b) * 100) / 100;
};

/**
 * Calculates the profit margin percentage.
 * @param cost The cost of the item.
 * @param price The selling price of the item.
 * @returns The profit margin as a percentage (e.g., 75 for 75%), rounded to the nearest integer.
 */
export const calculateMargin = (cost: number, price: number): number => {
  if (price <= 0) {
    return 0;
  }
  const margin = (price - cost) / price;
  return Math.round(margin * 100);
};
