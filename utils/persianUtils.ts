// utils/persianUtils.ts

/**
 * Formats a number into a string with Persian numerals.
 * e.g., 123 -> '۱۲۳'
 * @param n The number or string to be converted.
 * @returns A string with Persian numerals.
 */
export const toPersianNumber = (n: number | string): string => {
  if (n === null || n === undefined) return '';
  try {
    // Using Intl.NumberFormat is the modern and correct way to handle this.
    return new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(Number(n));
  } catch (e) {
    return String(n); // Fallback to the original string if conversion fails.
  }
};

/**
 * Converts a JavaScript timestamp to a formatted Persian (Jalali) date string.
 * e.g., 1672531200000 -> '۱۴۰۱/۱۰/۱۱'
 * @param timestamp The JavaScript timestamp (milliseconds since epoch).
 * @returns A formatted Persian date string.
 */
export const toPersianDate = (timestamp: number): string => {
  if (!timestamp) return '';
  try {
    // fa-IR locale with a specific numbering system if needed, but fa-IR defaults to Persian numerals.
    // u-nu-latn can be used to force Latin numbers if needed: 'fa-IR-u-nu-latn'
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(timestamp));
  } catch (e) {
    return new Date(timestamp).toLocaleDateString(); // Fallback to default locale format.
  }
};

/**
 * Formats a number as a currency string in Persian, with thousand separators and "Toman".
 * e.g., 150000 -> '۱۵۰,۰۰۰ تومان'
 * @param amount The numerical amount.
 * @returns A formatted Persian currency string.
 */
export const formatPersianCurrency = (amount: number): string => {
  if (isNaN(amount)) return '۰ تومان';
  try {
    const formattedNumber = new Intl.NumberFormat('fa-IR').format(Math.round(amount));
    return `${formattedNumber} تومان`;
  } catch (e) {
    return `${amount} تومان`; // Fallback
  }
};
