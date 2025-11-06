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
} from '../controllers/subcategory.controller';
import isAdminLoggedIn from '../middlewares/isAdminLoggedIn.middleware';

const subCategoryRouter = Router();

// Public routes
subCategoryRouter.get('/', asyncHandler(getAllSubCategories));
subCategoryRouter.get('/:id', asyncHandler(getSubCategoryById));
subCategoryRouter.get('/by-parent/:parentCategoryId', asyncHandler(getSubCategoriesByParentCategoryId));

// Admin routes - SubCategory management
subCategoryRouter.post('/', asyncHandler(createSubCategory));
subCategoryRouter.put('/:id', asyncHandler(updateSubCategory));
subCategoryRouter.delete('/:id', asyncHandler(deleteSubCategory));
subCategoryRouter.delete('/:id/hard', asyncHandler(hardDeleteSubCategory));

export default subCategoryRouter;