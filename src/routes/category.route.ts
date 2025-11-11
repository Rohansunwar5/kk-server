import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  hardDeleteCategory,
  addProductToCategory,
  removeProductFromCategory,
  getProductsByCategory,
} from '../controllers/category.controller';
import isAdminLoggedIn from '../middlewares/isAdminLoggedIn.middleware';

const categoryRouter = Router();

// Public routes
categoryRouter.get('/', asyncHandler(getAllCategories));
categoryRouter.get('/:id', asyncHandler(getCategoryById));

// Admin routes - Category management
categoryRouter.post('/',asyncHandler(createCategory));

categoryRouter.put('/:categoryId',asyncHandler(updateCategory));

categoryRouter.delete('/:categoryId',asyncHandler(deleteCategory));

categoryRouter.delete('/:categoryId/hard',asyncHandler(hardDeleteCategory));

// Admin routes - Product mapping
// categoryRouter.post('/map-products',isAdminLoggedIn,asyncHandler(mapProductsToCategories));

categoryRouter.post('/:categoryId/products', asyncHandler(addProductToCategory));
// category.route.ts
categoryRouter.get('/:categoryId/products', asyncHandler(getProductsByCategory));



categoryRouter.delete('/:categoryId/products/:productId', asyncHandler(removeProductFromCategory));

export default categoryRouter;