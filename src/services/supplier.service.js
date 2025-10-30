import axios from 'axios';
import { Product } from '../models/product.model.js';
import { calculateSellPrice } from './product.service.js';
import 'dotenv/config';

// --- Create Axios instance for supplier API ---
const supplierApi = axios.create({
  baseURL: process.env.SUPPLIER_BASE_URL, // e.g. https://mohasagor.com.bd/api/reseller/product
  headers: {
    'api-key': process.env.SUPPLIER_API_KEY,
    'secret-key': process.env.SUPPLIER_SECRET_KEY,
  },
});

/**
 * Fetches products from Mohasagor API and syncs with local DB.
 */
export const syncProductsFromSupplier = async () => {
  console.log('🔄 Starting product sync with supplier (mohasagor.com.bd)...');

  try {
    // ✅ FIXED: Correct endpoint and pagination
    const response = await supplierApi.get('?page=1');

    // ✅ FIXED: Safe response parsing for all possible structures
    const supplierProducts =
      response.data?.products ||
      response.data?.data?.products ||
      [];

    if (!Array.isArray(supplierProducts) || supplierProducts.length === 0) {
      console.log('⚠️ No products returned from supplier. Please check API structure.');
      return {
        success: true,
        created: 0,
        updated: 0,
        failed: 0,
        message: 'No products returned from supplier.',
      };
    }

    console.log(`✅ Received ${supplierProducts.length} products from supplier.`);

    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    // --- Loop through each supplier product ---
    for (const item of supplierProducts) {
      try {
        // --- Determine buy price ---
        const buyPrice =
          item.sale_price && parseFloat(item.sale_price) > 0
            ? parseFloat(item.sale_price)
            : parseFloat(item.price);

        if (isNaN(buyPrice) || buyPrice <= 0) {
          throw new Error(`Invalid or missing buy price for product ID ${item.id}`);
        }

        // --- Calculate sell price using helper function ---
        const sellPrice = calculateSellPrice(buyPrice);

        // --- Prepare image list ---
        const imageList = [];
        if (item.thumbnail_img) imageList.push(item.thumbnail_img);
        if (Array.isArray(item.product_images)) {
          item.product_images.forEach((imgObj) => {
            if (imgObj.product_image && !imageList.includes(imgObj.product_image)) {
              imageList.push(imgObj.product_image);
            }
          });
        }

        // --- Upsert product in DB ---
        const result = await Product.findOneAndUpdate(
          { supplierProductId: item.id.toString() },
          {
            $set: {
              name: item.name,
              description: item.details,
              images: imageList,
              category: item.category || 'Uncategorized',
              buyPrice,
              sellPrice,
              stock: parseInt(item.stock) || 0,
              lastSyncedAt: new Date(),
            },
          },
          { new: true, upsert: true, runValidators: true }
        );

        if (result.upsertedId) createdCount++;
        else updatedCount++;
      } catch (productError) {
        failedCount++;
        console.error(`❌ Failed product ${item.name} (ID: ${item.id}): ${productError.message}`);
      }
    }

    const summary = `✅ Sync complete. Created: ${createdCount}, Updated: ${updatedCount}, Failed: ${failedCount}`;
    console.log(summary);

    return {
      success: true,
      created: createdCount,
      updated: updatedCount,
      failed: failedCount,
      message: 'Supplier sync completed successfully.',
    };
  } catch (error) {
    console.error(
      '❌ Error fetching from supplier API:',
      error.response?.data || error.message
    );
    throw new Error('Supplier API sync failed');
  }
};
