import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import {
  getAllSubCategories,
  getSubCategoryById,
  getSubCategoriesByParentCategoryId,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  hardDeleteSubCategory,
  addProductToSubCategory,
  removeProductFromSubCategory,
  mapProductsToSubCategories,
} from '../controllers/subcategory.controller';
import isAdminLoggedIn from '../middlewares/isAdminLoggedIn.middleware';

const subCategoryRouter = Router();

// Public routes
subCategoryRouter.get('/', asyncHandler(getAllSubCategories));
subCategoryRouter.get('/:id', asyncHandler(getSubCategoryById));
subCategoryRouter.get('/by-parent/:parentCategoryId',asyncHandler(getSubCategoriesByParentCategoryId));

// Admin routes - SubCategory management
subCategoryRouter.post('/',isAdminLoggedIn,asyncHandler(createSubCategory));

subCategoryRouter.put('/:subCategoryId',isAdminLoggedIn,asyncHandler(updateSubCategory));
subCategoryRouter.delete('/:subCategoryId',isAdminLoggedIn,asyncHandler(deleteSubCategory));
subCategoryRouter.delete('/:subCategoryId/hard',isAdminLoggedIn,asyncHandler(hardDeleteSubCategory));

// Admin routes - Product mapping
subCategoryRouter.post('/map-products',isAdminLoggedIn,asyncHandler(mapProductsToSubCategories));
subCategoryRouter.post('/:subCategoryId/products',isAdminLoggedIn,asyncHandler(addProductToSubCategory));
subCategoryRouter.delete('/:subCategoryId/products/:productId',isAdminLoggedIn,asyncHandler(removeProductFromSubCategory));

export default subCategoryRouter;