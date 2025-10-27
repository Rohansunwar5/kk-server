/**
 * DIAMOND PRICE CALCULATION MODULE
 * Contains all pricing logic for jewelry products
 */

// ============================================
// GOLD RATES (Update these when rates change)
// ============================================
export const GOLD_RATES = {
    9: 5750,   // 9K gold rate per gram
    14: 7670,  // 14K gold rate per gram
    18: 9880,  // 18K gold rate per gram
} as const;

// ============================================
// CONSTANTS
// ============================================
export const GST = 3; // GST percentage
export const CERTIFICATION_CHARGES = 1200;
export const COLOURED_DIAMOND_RATE_PER_CARAT = 95000;
export const GEMSTONE_PER_KARAT = 500;
export const MULTI_DIAMOND_RATE = 30000;
export const POINTER_RATE = 48000;
export const MAKING_CHARGES_PER_GRAM = 1200;
export const PENDANT_CHAIN_WEIGHT = 2.5; // grams

export type KaratType = 9 | 14 | 18;

// ============================================
// SOLITAIRE RATE CALCULATOR
// ============================================
/**
 * Get solitaire rate based on weight (in carats)
 */
export const getSolitaireRate = (weight: number): number => {
    if (weight <= 2.99) return 60000;
    if (weight >= 3.00) return 75000;
    return 0;
};

// ============================================
// HELPER FUNCTION
// ============================================
/**
 * Ensures a value is a valid number (not null/undefined/NaN)
 */
const safeNumber = (value: number | undefined | null): number => {
    if (value === undefined || value === null || isNaN(value)) {
        return 0;
    }
    return value;
};

// ============================================
// MAIN PRICE CALCULATION INTERFACE
// ============================================
export interface PriceCalculationParams {
    // Required
    karat: KaratType;
    netWeight: number; // Net gold weight in grams
    
    // Diamond weights (optional, in carats)
    solitareWeight?: number;
    multiDiaWeight?: number;
    pointersWeight?: number;
    
    // Gemstone weights (optional, in carats)
    gemStoneSolWeight?: number;
    gemStonePointerWeight?: number;
    
    // Product type flags
    isGemStoneProduct?: boolean;
    isColouredDiamond?: boolean;
    
    // Chain options
    isChainAdded?: boolean;
    chainKarat?: KaratType;
}

export interface PriceBreakdown {
    subTotal: number;
    total: number;
    grossWeight: number;
    goldRate: number;
    solitareRate: number;
    multiDiaRate: number;
    pointersRate: number;
    diamondRate: number;
    makingCharges: number;
    pendantChainPrice: number;
    gemstonePointerRate: number;
    gemstoneSolRate: number;
}

// ============================================
// MAIN PRICE CALCULATION FUNCTION
// ============================================
/**
 * Calculate complete price breakdown for a jewelry product
 * 
 * @example
 * const price = getProductPriceDetails({
 *   karat: 14,
 *   netWeight: 5.5,
 *   solitareWeight: 0.5,
 *   multiDiaWeight: 0.2,
 *   pointersWeight: 0.1
 * });
 * console.log(`Total: ₹${price.total}`);
 */
export const getProductPriceDetails = ({
    karat,
    netWeight,
    solitareWeight,
    multiDiaWeight,
    pointersWeight,
    gemStoneSolWeight,
    gemStonePointerWeight,
    isGemStoneProduct = false,
    isColouredDiamond = false,
    isChainAdded = false,
    chainKarat = 14,
}: PriceCalculationParams): PriceBreakdown => {
    
    // Ensure all weights are valid numbers
    const newMultiDiaWeight = safeNumber(multiDiaWeight);
    const newSolitareWeight = safeNumber(solitareWeight);
    const newPointerWeight = safeNumber(pointersWeight);
    const newGemStoneSolWeight = safeNumber(gemStoneSolWeight);
    const newGemStonePointerWeight = safeNumber(gemStonePointerWeight);

    // Calculate total diamond weight for gross weight calculation
    const totalDiamondWeight = newPointerWeight === 0
        ? newSolitareWeight + newMultiDiaWeight + newPointerWeight
        : newSolitareWeight + newMultiDiaWeight;
    
    // Gross weight = Net weight + 20% of diamond weight
    const grossWeight = netWeight + (totalDiamondWeight * 0.2);

    // Calculate gold cost
    const goldRate = netWeight * GOLD_RATES[karat];

    // Calculate making charges
    const makingCharges = grossWeight * MAKING_CHARGES_PER_GRAM;

    // Calculate solitaire rate (regular diamond)
    const solitareRate = newSolitareWeight > 0 
        ? newSolitareWeight * getSolitaireRate(newSolitareWeight)
        : 0;

    // Calculate gemstone rates (if gemstone product)
    const gemstoneSolRate = isGemStoneProduct
        ? isColouredDiamond
            ? newSolitareWeight * COLOURED_DIAMOND_RATE_PER_CARAT
            : newGemStoneSolWeight * GEMSTONE_PER_KARAT
        : 0;

    const gemstonePointerRate = isGemStoneProduct
        ? isColouredDiamond
            ? newPointerWeight * COLOURED_DIAMOND_RATE_PER_CARAT
            : newGemStonePointerWeight * GEMSTONE_PER_KARAT
        : 0;

    // Calculate multi-diamond and pointer rates
    const multiDiaRate = newMultiDiaWeight * MULTI_DIAMOND_RATE;
    const pointersRate = newPointerWeight > 0 
        ? newPointerWeight * POINTER_RATE 
        : 0;
    
    // Total diamond/gemstone cost
    const diamondRate = solitareRate + multiDiaRate + pointersRate + gemstonePointerRate + gemstoneSolRate;

    // Calculate pendant chain price if added
    const pendantChainPrice = isChainAdded 
        ? PENDANT_CHAIN_WEIGHT * GOLD_RATES[chainKarat] 
        : 0;

    // Calculate subtotal and total with GST
    const subTotal = goldRate + diamondRate + makingCharges + pendantChainPrice + CERTIFICATION_CHARGES;
    const total = subTotal + (subTotal * (GST / 100));

    // Log for debugging (optional - remove in production)
    if (process.env.NODE_ENV === 'development') {
        console.log('=== PRICE CALCULATION ===');
        console.log(`Net Weight: ${netWeight}g, Karat: ${karat}K`);
        console.log(`Gross Weight: ${grossWeight.toFixed(2)}g`);
        console.log(`Gold Rate: ₹${goldRate.toFixed(2)}`);
        console.log(`Diamond Rate: ₹${diamondRate.toFixed(2)}`);
        console.log(`Making Charges: ₹${makingCharges.toFixed(2)}`);
        console.log(`SubTotal: ₹${subTotal.toFixed(2)}`);
        console.log(`Total (with GST): ₹${total.toFixed(2)}`);
        console.log('========================');
    }

    return {
        subTotal: Math.round(subTotal),
        total: Math.round(total),
        grossWeight: Math.round(grossWeight * 100) / 100, // Round to 2 decimals
        goldRate: Math.round(goldRate),
        solitareRate,
        multiDiaRate,
        pointersRate,
        diamondRate,
        makingCharges: Math.round(makingCharges),
        pendantChainPrice,
        gemstonePointerRate,
        gemstoneSolRate,
    };
};

// ============================================
// LEGACY COMPATIBILITY FUNCTIONS
// ============================================

/**
 * Simplified diamond price calculation (legacy compatibility)
 */
export interface DiamondPriceParams {
    karat: KaratType;
    netWeight: number;
    solitareWeight: number;
    multiDiaWeight: number;
    pointersWeight?: number;
}

export interface DiamondPriceBreakdown {
    subTotal: number;
    total: number;
    grossWeight: number;
    goldRate: number;
    solitareRate: number;
    multiDiaRate: number;
    pointersRate: number;
    diamondRate: number;
    makingCharges: number;
}

export const getDiamondPrice = ({
    karat,
    netWeight,
    solitareWeight,
    multiDiaWeight,
    pointersWeight = 0,
}: DiamondPriceParams): DiamondPriceBreakdown => {
    const totalDiamondWeight = pointersWeight
        ? solitareWeight + multiDiaWeight + pointersWeight
        : solitareWeight + multiDiaWeight;
    
    const grossWeight = Math.round(netWeight + (totalDiamondWeight * 0.2));
    const goldRate = Math.round(netWeight * GOLD_RATES[karat]);
    const solitareRate = solitareWeight * getSolitaireRate(solitareWeight);
    const multiDiaRate = multiDiaWeight * MULTI_DIAMOND_RATE;
    const pointersRate = pointersWeight ? pointersWeight * POINTER_RATE : 0;
    const diamondRate = solitareRate + multiDiaRate + pointersRate;
    const makingCharges = grossWeight * MAKING_CHARGES_PER_GRAM;
    const subTotal = Math.round(goldRate + diamondRate + makingCharges);
    const total = Math.round(subTotal + (subTotal * (GST / 100)));

    return {
        subTotal,
        total,
        grossWeight,
        goldRate,
        solitareRate,
        multiDiaRate,
        pointersRate,
        diamondRate,
        makingCharges,
    };
};

/**
 * Gemstone weight calculation (legacy compatibility)
 */
export interface GemstoneWeightParams {
    isGemstone?: boolean;
    isColouredDiamond?: boolean;
    netWeight: number;
    karat: KaratType;
    multiDiaWeight: number;
    pointersWeight: number;
    solitareWeight: number;
    pointerWeight: number;
}

export interface GemstoneWeightResult {
    grossWeight: number;
    goldRate: number;
    solitareRate: number;
    pointersRate: number;
    multiDiaRate: number;
    diamondRate: number;
    makingCharges: number;
    subTotal: number;
    total: number;
}

export const getGemstoneWeight = ({
    isGemstone = false,
    isColouredDiamond = false,
    netWeight,
    karat,
    multiDiaWeight,
    pointersWeight,
    solitareWeight,
    pointerWeight,
}: GemstoneWeightParams): GemstoneWeightResult => {
    const grossWeight = netWeight + ((solitareWeight + multiDiaWeight + pointersWeight) * 0.2);
    const goldRate = netWeight * GOLD_RATES[karat];
    
    const solitareRate = isGemstone
        ? solitareWeight * GEMSTONE_PER_KARAT
        : isColouredDiamond
            ? solitareWeight * COLOURED_DIAMOND_RATE_PER_CARAT
            : 0;
    
    const pointersRate = isGemstone
        ? pointerWeight * GEMSTONE_PER_KARAT
        : isColouredDiamond
            ? pointerWeight * COLOURED_DIAMOND_RATE_PER_CARAT
            : 0;
    
    const multiDiaRate = multiDiaWeight * MULTI_DIAMOND_RATE;
    const diamondRate = solitareRate + multiDiaRate + pointersRate;
    const makingCharges = grossWeight * MAKING_CHARGES_PER_GRAM;
    const subTotal = goldRate + diamondRate + makingCharges;
    const total = Math.round(subTotal + (subTotal * (GST / 100)));

    return {
        grossWeight: Math.round(grossWeight * 100) / 100,
        goldRate: Math.round(goldRate),
        solitareRate,
        pointersRate,
        multiDiaRate,
        diamondRate,
        makingCharges: Math.round(makingCharges),
        subTotal: Math.round(subTotal),
        total,
    };
};

// ============================================
// USAGE EXAMPLES
// ============================================

/*
// Example 1: Basic diamond ring
const ringPrice = getProductPriceDetails({
    karat: 14,
    netWeight: 5.5,
    solitareWeight: 0.5,
    multiDiaWeight: 0.2
});
console.log(`Ring Price: ₹${ringPrice.total}`);

// Example 2: Gemstone pendant with chain
const pendantPrice = getProductPriceDetails({
    karat: 18,
    netWeight: 3.2,
    solitareWeight: 0,
    gemStoneSolWeight: 1.5,
    isGemStoneProduct: true,
    isChainAdded: true,
    chainKarat: 18
});
console.log(`Pendant Price: ₹${pendantPrice.total}`);

// Example 3: Complex piece with all elements
const complexPrice = getProductPriceDetails({
    karat: 14,
    netWeight: 8.5,
    solitareWeight: 1.2,
    multiDiaWeight: 0.5,
    pointersWeight: 0.3,
    gemStoneSolWeight: 0.2,
    isGemStoneProduct: true,
    isColouredDiamond: false
});
console.log(`Complex Piece: ₹${complexPrice.total}`);
*/