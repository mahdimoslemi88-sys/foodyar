// src/services/paymentService.ts

/**
 * Simulates initiating a payment process with a payment gateway.
 * @param amount The amount to be paid.
 * @param plan The name of the subscription plan.
 * @returns A promise that resolves with a mock payment initiation response.
 */
export const initiatePayment = async (amount: number, plan: string): Promise<{ success: boolean; authority: string }> => {
  // TODO: Replace with real ZarinPal/Stripe API call later
  console.log(`Initiating payment for ${plan} with amount ${amount}`);
  
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Return a mock successful response
  return {
    success: true,
    authority: 'MOCK_AUTH_' + Date.now(),
  };
};

/**
 * Simulates verifying a payment after the user is redirected back from the gateway.
 * @param authority The unique authority code from the payment initiation.
 * @returns A promise that resolves with a mock payment verification response.
 */
export const verifyPayment = async (authority: string): Promise<{ success: boolean; refId: string }> => {
  // TODO: Replace with real ZarinPal/Stripe API call later
  console.log(`Verifying payment with authority: ${authority}`);

  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Return a mock successful verification response
  return {
    success: true,
    refId: Math.floor(Math.random() * 10000000).toString(),
  };
};
