import 'dotenv/config';

/**
 * Calculates the final sellPrice based on the buyPrice and
 * the pricing strategy defined in the .env file.
 * * @param {number} buyPrice - The raw price from the supplier.
 * @returns {number} The calculated and rounded sellPrice.
 */
export const calculateSellPrice = (buyPrice) => {
  if (typeof buyPrice !== 'number' || buyPrice <= 0) {
    return 0; // Handle invalid input
  }

  const pricingMode = process.env.PRICING_MODE || 'percent_markup';
  const markupValue = parseFloat(process.env.PRICING_VALUE || 15);
  const rounding = process.env.PRICE_ROUNDING || 'to_10';

  let calculatedPrice = buyPrice;

  // Step 1: Apply Markup (based on .env)
  if (pricingMode === 'percent_markup') {
    calculatedPrice = buyPrice * (1 + (markupValue / 100));
  } else {
    // Future logic for 'fixed_amount' etc. can be added here
    // For now, assume percent_markup
    calculatedPrice = buyPrice * (1 + (15 / 100));
  }

  // Step 2: Apply Rounding (based on .env)
  if (rounding === 'to_10') {
    // Rounds UP to the nearest 10.
    // e.g., 1142.5 -> 1150
    // e.g., 1148 -> 1150
    return Math.ceil(calculatedPrice / 10) * 10;
  }

  // Default: return the calculated price rounded to 2 decimal places
  return Math.round(calculatedPrice * 100) / 100;
};

// We will add other services here later, like:
// export const syncProductsFromSupplier = async () => { ... }