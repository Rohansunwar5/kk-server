
// ============================================
// MAIN GLOBAL FUNCTION - USE THIS ONE!
// ============================================

import productModel from "../models/product.model";
import { getProductPriceDetails, GOLD_RATES, KaratType } from "../utils/DiamondPriceCalculation";

/**
 * Updates ALL product prices in the database when gold rates change
 * This is the main function you'll use when rates change
 * 
 * @example
 * // Update all products with new gold rates
 * const result = await updateAllProductPrices({
 *   9: 6000,
 *   14: 8000,
 *   18: 10000
 * });
 * 
 * console.log(`Updated ${result.variantsUpdated} variants in ${result.updatedCount} products`);
 */


export const updateAllProductPrices = async (newGoldRates: {
    9: number;
    14: number;
    18: number;
}) => {
    console.log('🔄 Starting global price update...');
    console.log(`New rates: 9K=₹${newGoldRates[9]}, 14K=₹${newGoldRates[14]}, 18K=₹${newGoldRates[18]}`);

    // Update the global gold rates
    Object.assign(GOLD_RATES, newGoldRates);

    const result = {
        success: true,
        productsUpdated: 0,
        variantsUpdated: 0,
        failed: 0,
        errors: [] as string[],
    };

    try {
        const products = await productModel.find({ isActive: true });
        console.log(`📦 Found ${products.length} active products`);

        for (const product of products) {
            try {
                // Update each variant's price
                for (const variant of product.variants) {
                    const oldPrice = variant.price;
                    
                    // Calculate new price based on variant's karat
                    const newPrice = calculateVariantPrice(product, variant.karat);
                    const grossWeight = calculateGrossWeight(product, variant.karat);
                    
                    variant.price = newPrice;
                    variant.grossWeight = grossWeight;
                    
                    result.variantsUpdated++;
                    console.log(`  ✅ ${variant.sku}: ₹${oldPrice} → ₹${newPrice}`);
                }

                await product.save();
                result.productsUpdated++;
                
            } catch (error) {
                result.failed++;
                const err = error instanceof Error ? error.message : 'Unknown error';
                result.errors.push(`${product.productId}: ${err}`);
                console.error(`❌ Failed: ${product.productId}`);
            }
        }

        console.log('\n✅ UPDATE COMPLETE!');
        console.log(`📊 Products: ${result.productsUpdated}, Variants: ${result.variantsUpdated}, Failed: ${result.failed}`);
        
        return result;

    } catch (error) {
        console.error('💥 Fatal error:', error);
        result.success = false;
        return result;
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateVariantPrice(product: any, karat: KaratType): number {
    const priceDetails = getProductPriceDetails({
        karat: karat,
        netWeight: product.netWeight || 0,
        solitareWeight: product.solitareWeight || 0,
        multiDiaWeight: product.multiDiamondWeight || 0,
        pointersWeight: product.pointersWeight || 0,
        gemStoneSolWeight: product.gemStoneWeightSol || 0,
        gemStonePointerWeight: product.gemStoneWeightPointer || 0,
        isGemStoneProduct: product.containsGemstone || false,
        isColouredDiamond: false,
        isChainAdded: product.isPendantFixed || false,
        chainKarat: karat,
    });

    return priceDetails.total;
}

function calculateGrossWeight(product: any, karat: KaratType): number {
    const priceDetails = getProductPriceDetails({
        karat: karat,
        netWeight: product.netWeight || 0,
        solitareWeight: product.solitareWeight || 0,
        multiDiaWeight: product.multiDiamondWeight || 0,
        pointersWeight: product.pointersWeight || 0,
        gemStoneSolWeight: product.gemStoneWeightSol || 0,
        gemStonePointerWeight: product.gemStoneWeightPointer || 0,
        isGemStoneProduct: product.containsGemstone || false,
        isColouredDiamond: false,
        isChainAdded: product.isPendantFixed || false,
        chainKarat: karat,
    });

    return priceDetails.grossWeight;
}

// ============================================
// ADDITIONAL UTILITY FUNCTIONS
// ============================================

/**
 * Update only products with specific karat
 * Useful when only one karat rate changes
 */
export const updateByKarat = async (karat: KaratType, newRate: number) => {
    console.log(`🔄 Updating all ${karat}K products to rate ₹${newRate}`);
    
    Object.assign(GOLD_RATES, { [karat]: newRate });
    
    const products = await productModel.find({ 
        'variants.karat': karat, 
        isActive: true 
    });

    let updated = 0;
    for (const product of products) {
        for (const variant of product.variants) {
            if (variant.karat === karat) {
                variant.price = calculateVariantPrice(product, karat);
                variant.grossWeight = calculateGrossWeight(product, karat);
                updated++;
            }
        }
        await product.save();
    }

    console.log(`✅ Updated ${updated} variants`);
    return { updated };
};

/**
 * Update a single product by productId
 */
export const updateOneProduct = async (productId: string, newGoldRates: {
    9: number;
    14: number;
    18: number;
}) => {
    console.log(`🔄 Updating product: ${productId}`);
    
    Object.assign(GOLD_RATES, newGoldRates);
    
    const product = await productModel.findOne({ productId });
    if (!product) {
        console.error('❌ Product not found');
        return { success: false, error: 'Product not found' };
    }

    for (const variant of product.variants) {
        const oldPrice = variant.price;
        variant.price = calculateVariantPrice(product, variant.karat);
        variant.grossWeight = calculateGrossWeight(product, variant.karat);
        console.log(`  ✅ ${variant.sku}: ₹${oldPrice} → ₹${variant.price}`);
    }

    await product.save();
    console.log('✅ Product updated');
    return { success: true };
};

// ============================================
// EXAMPLE USAGE IN YOUR API/CONTROLLER:
// ============================================

/*
import { updateAllProductPrices, updateByKarat, updateOneProduct } from './globalPriceUpdate.service';

// In your admin controller or scheduled job:

// 1. UPDATE ALL PRODUCTS (when all rates change)
app.post('/admin/update-all-prices', async (req, res) => {
    const { goldRate9K, goldRate14K, goldRate18K } = req.body;
    
    const result = await updateAllProductPrices({
        9: goldRate9K,
        14: goldRate14K,
        18: goldRate18K
    });
    
    res.json(result);
});

// 2. UPDATE ONLY 14K PRODUCTS
app.post('/admin/update-14k-price', async (req, res) => {
    const { goldRate14K } = req.body;
    
    const result = await updateByKarat(14, goldRate14K);
    
    res.json(result);
});

// 3. UPDATE SINGLE PRODUCT
app.post('/admin/update-product-price/:productId', async (req, res) => {
    const { productId } = req.params;
    const { goldRate9K, goldRate14K, goldRate18K } = req.body;
    
    const result = await updateOneProduct(productId, {
        9: goldRate9K,
        14: goldRate14K,
        18: goldRate18K
    });
    
    res.json(result);
});
*/