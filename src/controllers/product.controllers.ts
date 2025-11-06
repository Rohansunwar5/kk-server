import { Request, Response, NextFunction } from 'express';
import productService from '../services/product.service';
import { IProductFilters } from '../repository/product.repository';
import mongoose from 'mongoose';

export const searchProducts = async (req: Request, res: Response, next: NextFunction) => {
  const query = req.query.query?.toString() || '';
  const response = await productService.searchProducts(query);
  
  next(response);
};

export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
  const response = await productService.getAllProducts();
  
  next(response);
};

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 15;
  
  const filters: IProductFilters = {
    gender: req.body?.filters?.gender || {},
    price: req.body?.filters?.price || {},
    categories: req.body?.filters?.categories?.map((id: string) => new mongoose.Types.ObjectId(id)) || [],
    collections: req.body?.filters?.collections?.map((id: string) => new mongoose.Types.ObjectId(id)) || []
  };

  const response = await productService.getProducts(filters, { page, limit });
  
  next(response);
};

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const response = await productService.getProductById(id);
  
  next(response);
};

export const getProductByProductId = async (req: Request, res: Response, next: NextFunction) => {
  const { productId } = req.params;
  const response = await productService.getProductByProductId(productId);
  
  next(response);
};

/**
 * CREATE PRODUCT
 * 
 * Example Request Body:
 * {
 *   "productId": "RING001",
 *   "name": "Diamond Solitaire Ring",
 *   "categoryIds": ["507f1f77bcf86cd799439011"],
 *   "netWeight": 5.5,
 *   "solitareWeight": 0.5,
 *   "karats": [14, 18], // Required: which karats to create
 *   "stoneTypes": ["gemstone", "colored_diamond"], // Optional: if product has stone customization
 *   "stocks": {
 *     "14-gemstone": 10,
 *     "14-colored_diamond": 5,
 *     "18-gemstone": 8,
 *     "18-colored_diamond": 3
 *   },
 *   "customizationOptions": {
 *     "hasColorOptions": true,
 *     "colors": [
 *       { "name": "Yellow Gold", "hexCode": "#FFD700" },
 *       { "name": "Rose Gold", "hexCode": "#B76E79" }
 *     ],
 *     "hasSizeOptions": true,
 *     "sizes": ["6", "7", "8", "9", "10"]
 *   }
 * }
 * 
 * This will auto-generate 4 variants:
 * - 14K Gemstone (price auto-calculated)
 * - 14K Colored Diamond (price auto-calculated)
 * - 18K Gemstone (price auto-calculated)
 * - 18K Colored Diamond (price auto-calculated)
 */
export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  const {
    productId,
    name,
    categoryIds,
    subCategoryIds,
    collectionIds,
    netWeight,
    solitareWeight,
    multiDiamondWeight,
    pointersWeight,
    diamondWeight,
    goldWeight,
    noOfSolitares,
    noOfMultiDiamonds,
    noOfPointers,
    gender,
    shapeOfSolitare,
    shapeOfMultiDiamonds,
    shapeOfPointers,
    gemStoneColour,
    description,
    imageUrl,
    isPendantFixed,
    containsGemstone,
    gemStoneWeightSol,
    gemStoneWeightPointer,
    isMrpProduct,
    karats, // Required: [9, 14, 18]
    stoneTypes, // Optional: ['gemstone', 'colored_diamond']
    stocks, // Optional: { "14-gemstone": 10, "14": 5 }
    customizationOptions, // Optional
  } = req.body;

  const response = await productService.createProduct({
    productId,
    name,
    categoryIds,
    subCategoryIds,
    collectionIds,
    netWeight,
    solitareWeight,
    multiDiamondWeight,
    pointersWeight,
    diamondWeight,
    goldWeight,
    noOfSolitares,
    noOfMultiDiamonds,
    noOfPointers,
    gender,
    shapeOfSolitare,
    shapeOfMultiDiamonds,
    shapeOfPointers,
    gemStoneColour,
    description,
    imageUrl,
    isPendantFixed,
    containsGemstone,
    gemStoneWeightSol,
    gemStoneWeightPointer,
    isMrpProduct,
    karats,
    stoneTypes,
    stocks,
    customizationOptions,
  });
  
  next(response);
};

/**
 * UPDATE PRODUCT
 * 
 * Example Request Body (update customization options):
 * {
 *   "customizationOptions": {
 *     "hasColorOptions": true,
 *     "colors": [
 *       { "name": "White Gold", "hexCode": "#E5E4E2" }
 *     ]
 *   }
 * }
 * 
 * Example (add new stone type):
 * {
 *   "stoneTypes": ["regular_diamond", "gemstone", "colored_diamond"]
 * }
 */
export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const {
    productId,
    name,
    categoryIds,
    subCategoryIds,
    collectionIds,
    netWeight,
    solitareWeight,
    multiDiamondWeight,
    pointersWeight,
    diamondWeight,
    goldWeight,
    noOfSolitares,
    noOfMultiDiamonds,
    noOfPointers,
    gender,
    shapeOfSolitare,
    shapeOfMultiDiamonds,
    shapeOfPointers,
    gemStoneColour,
    description,
    imageUrl,
    isPendantFixed,
    containsGemstone,
    gemStoneWeightSol,
    gemStoneWeightPointer,
    isMrpProduct,
    karats,
    stoneTypes,
    stocks,
    customizationOptions,
    isActive,
  } = req.body;

  const response = await productService.updateProduct(id, {
    productId,
    name,
    categoryIds,
    subCategoryIds,
    collectionIds,
    netWeight,
    solitareWeight,
    multiDiamondWeight,
    pointersWeight,
    diamondWeight,
    goldWeight,
    noOfSolitares,
    noOfMultiDiamonds,
    noOfPointers,
    gender,
    shapeOfSolitare,
    shapeOfMultiDiamonds,
    shapeOfPointers,
    gemStoneColour,
    description,
    imageUrl,
    isPendantFixed,
    containsGemstone,
    gemStoneWeightSol,
    gemStoneWeightPointer,
    isMrpProduct,
    karats,
    stoneTypes,
    stocks,
    customizationOptions,
    isActive,
  });
  
  next(response);
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const response = await productService.deleteProduct(id);
  
  next(response);
};

export const deleteMultipleProducts = async (req: Request, res: Response, next: NextFunction) => {
  const { ids } = req.body;
  const response = await productService.deleteMultipleProducts(ids);
  
  next(response);
};

export const mapImagesToProducts = async (req: Request, res: Response, next: NextFunction) => {
  const { imageList } = req.body;
  const response = await productService.mapImagesToProducts(imageList);
  
  next(response);
};

export const updateAllProductPrices = async (req: Request, res: Response, next: NextFunction) => {
  const { goldRate9K, goldRate14K, goldRate18K } = req.body;
  
  const response = await productService.updateAllProductPrices({
    9: goldRate9K,
    14: goldRate14K,
    18: goldRate18K
  });
  
  next(response);
};

export const updateProductPricesByKarat = async (req: Request, res: Response, next: NextFunction) => {
  const { karat, goldRate } = req.body;
  const response = await productService.updateProductPricesByKarat(karat, goldRate);
  
  next(response);
};

export const setBasePrices = async (req: Request, res: Response, next: NextFunction) => {
  const response = await productService.setBasePrices();
  
  next(response);
};

export const bulkUpdateField = async (req: Request, res: Response, next: NextFunction) => {
  const { productIds, field, value } = req.body;
  const response = await productService.bulkUpdateField(productIds, field, value);
  
  next(response);
};