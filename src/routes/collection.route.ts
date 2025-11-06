import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import {
  getAllCollections,
  getCollectionById,
  getProductsByCollectionId,
  createCollection,
  updateCollection,
  deleteCollection,
  hardDeleteCollection,
  addImageToCollection,
  removeImageFromCollection,
} from '../controllers/collection.controller';
import isAdminLoggedIn from '../middlewares/isAdminLoggedIn.middleware';

const collectionRouter = Router();

// Public routes
collectionRouter.get('/', asyncHandler(getAllCollections));
collectionRouter.get('/:id', asyncHandler(getCollectionById));
collectionRouter.get('/:id/products', asyncHandler(getProductsByCollectionId));

// Admin routes - Collection management
collectionRouter.post('/', asyncHandler(createCollection));
collectionRouter.put('/:id', asyncHandler(updateCollection));
collectionRouter.delete('/:id', asyncHandler(deleteCollection));
collectionRouter.delete('/:id/hard', asyncHandler(hardDeleteCollection));

// Admin routes - Image management
collectionRouter.post('/:id/images', asyncHandler(addImageToCollection));
collectionRouter.delete('/:id/images', asyncHandler(removeImageFromCollection));

export default collectionRouter;