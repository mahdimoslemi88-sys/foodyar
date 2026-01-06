// domain/invoicing.ts

/**
 * Gets the current year in 4-digit format.
 * @returns The current year.
 */
export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

/**
 * Generates the next sequential invoice number with a specific format.
 * This is a pure function; it relies on the caller to manage state.
 * @param getCounter - A function that returns the current counter value.
 * @param setCounter - A function that persists the new counter value.
 * @returns The formatted invoice number string (e.g., "FYR-2024-00001").
 */
export const nextInvoiceNumber = (
  getCounter: () => number,
  setCounter: (newCounter: number) => void
): string => {
  const year = getCurrentYear();
  const currentCounter = getCounter();
  const newCounter = currentCounter + 1;
  setCounter(newCounter);

  const paddedCounter = newCounter.toString().padStart(5, '0');
  
  return `FYR-${year}-${paddedCounter}`;
};
