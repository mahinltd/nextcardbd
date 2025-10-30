import axios from 'axios';
import { Product } from '../models/product.model.js';
import { calculateSellPrice } from './product.service.js';
import 'dotenv/config';

// Create a re-usable axios instance for the supplier API
const supplierApi = axios.create({
  baseURL: process.env.SUPPLIER_BASE_URL,
  headers: {
    // Note: Adjust headers based on your supplier's requirements
    'Authorization': `Bearer ${process.env.SUPPLIER_API_KEY}`,
    'X-Secret-Key': process.env.SUPPLIER_SECRET_KEY,
  }
});

/**
 * Fetches products from the supplier API and updates/creates them in our local DB.
 */
export const syncProductsFromSupplier = async () => {
  console.log('Starting product sync with supplier...');
  
  try {
    // Step 1: Fetch "real" products from supplier
    // Note: Adjust the '/products' endpoint if your supplier uses a different one
    const response = await supplierApi.get('/products');
    
    // IMPORTANT: Adjust 'response.data.data' based on your supplier's API response structure
    const supplierProducts = response.data.data; 

    if (!supplierProducts || supplierProducts.length === 0) {
      console.log('No products found from supplier.');
      return { success: true, created: 0, updated: 0, failed: 0 };
    }

    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    // Step 2: Loop through supplier products and update/create in our DB
    for (const item of supplierProducts) {
      try {
        // Step 3: Calculate our sellPrice
        const sellPrice = calculateSellPrice(item.buyPrice);

        // Step 4: Use findOneAndUpdate + upsert
        // This finds a product by 'supplierProductId' and updates it.
        // If it doesn't find one, 'upsert: true' creates a new one.
        const result = await Product.findOneAndUpdate(
          { supplierProductId: item.id }, // Find by the supplier's unique ID
          {
            $set: {
              name: item.name,
              description: item.description,
              images: item.images,
              category: item.category,
              buyPrice: item.buyPrice,
              sellPrice: sellPrice, // Our calculated price
              stock: item.stock,
              tags: item.tags,
              lastSyncedAt: new Date(),
            }
          },
          { 
            new: true, // Return the new/updated document
            upsert: true, // Create if it doesn't exist
            runValidators: true,
          }
        );
        
        // Check if a new document was created or an existing one was updated
        if (result.upsertedId) {
          createdCount++;
        } else {
          updatedCount++;
        }

      } catch (productError) {
        console.error(`Failed to process product ${item.id}: ${productError.message}`);
        failedCount++;
      }
    }

    const summary = `Sync complete. Created: ${createdCount}, Updated: ${updatedCount}, Failed: ${failedCount}`;
    console.log(summary);
    return { success: true, summary, created: createdCount, updated: updatedCount, failed: failedCount };

  } catch (error) {
    console.error('Error fetching from supplier API:', error.message);
    throw new Error('Supplier API sync failed');
  }
};