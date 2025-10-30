import axios from 'axios';
import { Product } from '../models/product.model.js';
import { calculateSellPrice } from './product.service.js';
import 'dotenv/config';

// Axios instance with correct headers for mohasagor.com.bd
const supplierApi = axios.create({
  baseURL: process.env.SUPPLIER_BASE_URL,
  headers: {
    'api-key': process.env.SUPPLIER_API_KEY,
    'secret-key': process.env.SUPPLIER_SECRET_KEY,
  }
});

/**
 * Fetches products from mohasagor.com.bd API and updates/creates them in our local DB.
 */
export const syncProductsFromSupplier = async () => {
  console.log('Starting product sync with supplier (mohasagor.com.bd)...');
  
  try {
    // 1. Fetch "real" products from supplier
    // The Base URL from .env is '.../reseller/product'
    const response = await supplierApi.get('/'); 
    
    // 2. Access the product array using the correct key from your JSON
    const supplierProducts = response.data.products; 

    if (!supplierProducts || !Array.isArray(supplierProducts) || supplierProducts.length === 0) {
      console.log('No products found from supplier. Check API response structure.');
      return { success: true, created: 0, updated: 0, failed: 0, message: 'No products returned from supplier.' };
    }

    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    // 3. Loop through each supplier product
    for (const item of supplierProducts) {
      try {
        // --- 4. CRITICAL: Determine the correct buyPrice ---
        // Use 'sale_price' if it exists and is > 0, otherwise use 'price'.
        const buyPrice = (item.sale_price && parseFloat(item.sale_price) > 0)
                          ? parseFloat(item.sale_price)
                          : parseFloat(item.price);
                          
        if (isNaN(buyPrice) || buyPrice <= 0) {
          throw new Error(`Invalid or zero buyPrice for product ID ${item.id}`);
        }
        
        // 5. Calculate our sellPrice based on the correct buyPrice
        const sellPrice = calculateSellPrice(buyPrice);

        // --- 6. CRITICAL: Format the image list ---
        let imageList = [];
        if (item.thumbnail_img) {
          imageList.push(item.thumbnail_img); // Add thumbnail first
        }
        if (item.product_images && Array.isArray(item.product_images)) {
          item.product_images.forEach(imgObj => {
            // Add other images, avoiding duplicates
            if (imgObj.product_image && !imageList.includes(imgObj.product_image)) {
              imageList.push(imgObj.product_image);
            }
          });
        }
        
        // 7. Use findOneAndUpdate + upsert to create or update the product
        const result = await Product.findOneAndUpdate(
          { supplierProductId: item.id.toString() }, // Find by the supplier's unique ID
          {
            $set: {
              name: item.name,
              description: item.details, // Use 'details' from JSON
              images: imageList, // Use our new formatted list
              category: item.category || 'Uncategorized', // Use 'category' from JSON
              buyPrice: buyPrice, // Our calculated buyPrice
              sellPrice: sellPrice, // Our calculated sellPrice
              stock: parseInt(item.stock) || 0, // Default to 0 if stock is not provided
              lastSyncedAt: new Date(),
            }
          },
          { 
            new: true,
            upsert: true,
            runValidators: true,
          }
        );
        
        if (result.upsertedId) {
          createdCount++;
        } else {
          updatedCount++;
        }

      } catch (productError) {
        console.error(`Failed to process product ${item.name} (ID: ${item.id}): ${productError.message}`);
        failedCount++;
      }
    }

    const summary = `Sync complete. Created: ${createdCount}, Updated: ${updatedCount}, Failed: ${failedCount}`;
    console.log(summary);
    return { success: true, summary, created: createdCount, updated: updatedCount, failed: failedCount };

  } catch (error) {
    console.error('Error fetching from supplier API:', error.response ? error.response.data : error.message);
    throw new Error('Supplier API sync failed');
  }
};