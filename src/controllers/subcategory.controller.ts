import { NextFunction, Request, Response } from 'express';
import subCategoryService from '../services/subcategory.service';
import { BadRequestError } from '../errors/bad-request.error';

export const getAllSubCategories = async (req: Request, res: Response, next: NextFunction) => {
  const response = await subCategoryService.getAllSubCategories();
  next(response);
};

export const getSubCategoryById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!id) {
    throw new BadRequestError('SubCategory ID is required');
  }

  const response = await subCategoryService.getSubCategoryById(id);
  next(response);
};

export const getSubCategoriesByParentCategoryId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { parentCategoryId } = req.params;

  if (!parentCategoryId) {
    throw new BadRequestError('Parent category ID is required');
  }

  const response = await subCategoryService.getSubCategoriesByParentCategoryId(parentCategoryId);
  next(response);
};

export const createSubCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { name, parentCategoryId, imageUrls, description, isActive } = req.body;

  if (!name || !parentCategoryId) {
    throw new BadRequestError('Name and parent category ID are required');
  }

  const response = await subCategoryService.createSubCategory({
    name,
    parentCategoryId,
    imageUrls,
    description,
    isActive,
  });

  next(response);
};

export const updateSubCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { name, parentCategoryId, imageUrls, description, isActive } = req.body;

  if (!id) {
    throw new BadRequestError('SubCategory ID is required');
  }

  const response = await subCategoryService.updateSubCategory(id, {
    name,
    parentCategoryId,
    imageUrls,
    description,
    isActive,
  });

  next(response);
};

export const deleteSubCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!id) {
    throw new BadRequestError('SubCategory ID is required');
  }

  const response = await subCategoryService.deleteSubCategory(id);
  next(response);
};

export const hardDeleteSubCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!id) {
    throw new BadRequestError('SubCategory ID is required');
  }

  const response = await subCategoryService.hardDeleteSubCategory(id);
  next(response);
};