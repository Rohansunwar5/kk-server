import { Request, Response, NextFunction } from 'express';
import productService from '../services/product.service';
import { IProductFilters } from '../repository/product.repository';

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
  
  const filters: IProductFilters = req.body?.filters || {
    gender: {},
    price: {},
    categories: [],
    collections: []
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

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { product } = req.body;
  const response = await productService.createProduct(product);
  
  next(response);
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { updatedProduct } = req.body;
  
  const response = await productService.updateProduct(id, updatedProduct);
  
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

export const addVariantToProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { productId } = req.params;
  const { karat, stock } = req.body;
  
  const response = await productService.addVariantToProduct(productId, karat, stock);
  
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