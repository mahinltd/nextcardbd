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
  console.log('Starting product sync (DEBUG MODE)...');
  
  try {
    // --- CHANGE: Let's try calling without the trailing slash ---
    // This will call '.../reseller/product' instead of '.../reseller/product/'
    const response = await supplierApi.get(''); 
    
    // --- DEBUGGING STEP ---
    // Log the ENTIRE response data to the console to see its structure
    console.log('--- FULL SUPPLIER API RESPONSE START ---');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('--- FULL SUPPLIER API RESPONSE END ---');
    // --- END DEBUGGING ---

    // Now, let's try to access the product array again
    const supplierProducts = response.data.products; 

    if (!supplierProducts || !Array.isArray(supplierProducts) || supplierProducts.length === 0) {
      console.log('No "products" array found in the response data.');
      return { success: true, created: 0, updated: 0, failed: 0, message: 'No "products" array returned from supplier.' };
    }

    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    // Loop through each supplier product
    for (const item of supplierProducts) {
      try {
        // Determine the correct buyPrice
        const buyPrice = (item.sale_price && parseFloat(item.sale_price) > 0)
                          ? parseFloat(item.sale_price)
                          : parseFloat(item.price);
                          
        if (isNaN(buyPrice) || buyPrice <= 0) {
          throw new Error(`Invalid or zero buyPrice for product ID ${item.id}`);
        }
        
        const sellPrice = calculateSellPrice(buyPrice);

        // Format the image list
        let imageList = [];
        if (item.thumbnail_img) {
          imageList.push(item.thumbnail_img);
        }
        if (item.product_images && Array.isArray(item.product_images)) {
          item.product_images.forEach(imgObj => {
            if (imgObj.product_image && !imageList.includes(imgObj.product_image)) {
              imageList.push(imgObj.product_image);
            }
          });
        }
        
        // Use findOneAndUpdate + upsert
        const result = await Product.findOneAndUpdate(
          { supplierProductId: item.id.toString() }, 
          {
            $set: {
              name: item.name,
              description: item.details,
              images: imageList,
              category: item.category || 'Uncategorized',
              buyPrice: buyPrice,
              sellPrice: sellPrice,
              stock: parseInt(item.stock) || 0,
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