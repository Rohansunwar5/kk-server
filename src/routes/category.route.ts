import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  hardDeleteCategory,
  mapProductsToCategories,
  addProductToCategory,
  removeProductFromCategory,
} from '../controllers/category.controller';
import isAdminLoggedIn from '../middlewares/isAdminLoggedIn.middleware';

const categoryRouter = Router();

// Public routes
categoryRouter.get('/', asyncHandler(getAllCategories));
categoryRouter.get('/:id', asyncHandler(getCategoryById));

// Admin routes - Category management
categoryRouter.post('/',isAdminLoggedIn,asyncHandler(createCategory));

categoryRouter.put('/:categoryId',isAdminLoggedIn,asyncHandler(updateCategory));

categoryRouter.delete('/:categoryId',isAdminLoggedIn,asyncHandler(deleteCategory));

categoryRouter.delete('/:categoryId/hard',isAdminLoggedIn,asyncHandler(hardDeleteCategory));

// Admin routes - Product mapping
categoryRouter.post('/map-products',isAdminLoggedIn,asyncHandler(mapProductsToCategories));

categoryRouter.post('/:categoryId/products',isAdminLoggedIn,asyncHandler(addProductToCategory));

categoryRouter.delete('/:categoryId/products/:productId',isAdminLoggedIn,asyncHandler(removeProductFromCategory));

export default categoryRouter;