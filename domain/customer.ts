// domain/customer.ts
import { Customer, CustomerSegment } from '../types';

/**
 * Determines the segment of a customer based on their RFM (Recency, Frequency, Monetary) values.
 * The logic prioritizes VIPs, then inactive customers (churned/slipping), then new customers,
 * and finally categorizes the rest as loyal.
 *
 * @param customer The customer object to analyze.
 * @returns The calculated CustomerSegment.
 */
export const determineCustomerSegment = (customer: Customer): CustomerSegment => {
    const now = Date.now();
    const daysSinceLastVisit = (now - customer.lastVisit) / (1000 * 60 * 60 * 24);

    // Rule 1: Churned customers are the highest priority to identify.
    if (daysSinceLastVisit > 90) {
        return 'churned';
    }

    // Rule 2: Slipping customers are those who haven't visited in a while but aren't fully churned.
    if (daysSinceLastVisit > 45) {
        return 'slipping';
    }

    // Rule 3: VIPs are high-spenders who are still active.
    // This rule is placed after churn/slipping to ensure we don't label an inactive high-spender as VIP.
    if (customer.totalSpent > 3_000_000) { // Threshold can be adjusted in settings later
        return 'vip';
    }
    
    // Rule 4: New customers have a low visit count.
    if (customer.totalVisits <= 2) {
        return 'new';
    }
    
    // Rule 5: If they are active and have visited multiple times, they are loyal.
    if (customer.totalVisits > 2) {
        return 'loyal';
    }

    // Fallback for any edge cases (e.g., a customer with 0 visits somehow).
    return 'new';
};
