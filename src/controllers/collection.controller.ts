import { NextFunction, Request, Response } from 'express';
import collectionService from '../services/collection.service';
import { BadRequestError } from '../errors/bad-request.error';

export const getAllCollections = async (req: Request, res: Response, next: NextFunction) => {
  const response = await collectionService.getAllCollections();
  next(response);
};

export const getCollectionById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!id) {
    throw new BadRequestError('Collection ID is required');
  }

  const response = await collectionService.getCollectionById(id);
  next(response);
};

export const getProductsByCollectionId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  if (!id) {
    throw new BadRequestError('Collection ID is required');
  }

  const response = await collectionService.getProductsByCollectionId(id);
  next(response);
};

export const createCollection = async (req: Request, res: Response, next: NextFunction) => {
  const {
    name,
    imageUrls,
    description,
    isActive,
  } = req.body;

  if (!name) {
    throw new BadRequestError('Collection name is required');
  }

  const response = await collectionService.createCollection({
    name,
    imageUrls,
    description,
    isActive,
  });

  next(response);
};

export const updateCollection = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { name, imageUrls, description, isActive } = req.body;

  if (!id) {
    throw new BadRequestError('Collection ID is required');
  }

  const response = await collectionService.updateCollection(id, {
    name,
    imageUrls,
    description,
    isActive,
  });

  next(response);
};

export const deleteCollection = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!id) {
    throw new BadRequestError('Collection ID is required');
  }

  const response = await collectionService.deleteCollection(id);
  next(response);
};

export const hardDeleteCollection = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!id) {
    throw new BadRequestError('Collection ID is required');
  }

  const response = await collectionService.hardDeleteCollection(id);
  next(response);
};

export const addImageToCollection = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { imageUrl } = req.body;

  if (!id || !imageUrl) {
    throw new BadRequestError('Collection ID and image URL are required');
  }

  const response = await collectionService.addImageToCollection(id, imageUrl);
  next(response);
};

export const removeImageFromCollection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { imageUrl } = req.body;

  if (!id || !imageUrl) {
    throw new BadRequestError('Collection ID and image URL are required');
  }

  const response = await collectionService.removeImageFromCollection(id, imageUrl);
  next(response);
};