import { BadRequestError } from '../errors/bad-request.error';
import { InternalServerError } from '../errors/internal-server.error';
import { NotFoundError } from '../errors/not-found.error';
import mongoose from 'mongoose';
import {
  CollectionRepository,
  ICreateCollectionParams,
  IUpdateCollectionParams,
} from '../repository/collection.repository';
import { ProductRepository } from '../repository/product.repository';

class CollectionService {
  constructor(
    private readonly _collectionRepository: CollectionRepository,
    private readonly _productRepository: ProductRepository
  ) {}

  async getAllCollections() {
    const collections = await this._collectionRepository.getAllCollections();

    if (!collections) {
      throw new InternalServerError('Failed to fetch collections');
    }

    return collections;
  }

  async getCollectionById(id: string) {
    const collection = await this._collectionRepository.getCollectionById(id);

    if (!collection) {
      throw new NotFoundError('Collection not found');
    }

    return collection;
  }

  async getProductsByCollectionId(id: string) {
    const collection = await this._collectionRepository.getCollectionById(id);

    if (!collection) {
      throw new NotFoundError('Collection not found');
    }
    // Get all products that have this collection _id in their collectionIds array
    const products = await this._productRepository.getProductsByCollectionIds([new mongoose.Types.ObjectId(id)]);
    
    return {
      collection,
      products,
      totalProducts: products.length,
    };
  }

  async createCollection(params: ICreateCollectionParams) {
    const existingCollection = await this._collectionRepository.getCollectionByName(
      params.name
    );

    if (existingCollection) {
      throw new BadRequestError('Collection with this name already exists');
    }

    const collection = await this._collectionRepository.createCollection(params);

    if (!collection) {
      throw new InternalServerError('Failed to create collection');
    }

    return collection;
  }

  async updateCollection(id: string, params: IUpdateCollectionParams) {
    const collection = await this._collectionRepository.getCollectionById(id);

    if (!collection) {
      throw new NotFoundError('Collection not found');
    }

    // Check if name is being changed and if it conflicts with existing collection
    if (params.name && params.name !== collection.name) {
      const existingCollection = await this._collectionRepository.getCollectionByName(params.name);
      if (existingCollection) {
        throw new BadRequestError('Collection with this name already exists');
      }
    }

    const updatedCollection = await this._collectionRepository.updateCollectionById(
      id,
      params
    );

    if (!updatedCollection) {
      throw new InternalServerError('Failed to update collection');
    }

    return updatedCollection;
  }

  async deleteCollection(id: string) {
    const collection = await this._collectionRepository.getCollectionById(id);

    if (!collection) {
      throw new NotFoundError('Collection not found');
    }

    // Soft delete collection
    const deletedCollection = await this._collectionRepository.softDeleteCollectionById(id);

    if (!deletedCollection) {
      throw new InternalServerError('Failed to delete collection');
    }

    return { message: 'Collection deleted successfully', deletedCollection };
  }

  async hardDeleteCollection(id: string) {
    const collection = await this._collectionRepository.getCollectionById(id);

    if (!collection) {
      throw new NotFoundError('Collection not found');
    }

    const deleteResponse = await this._collectionRepository.deleteCollectionById(id);

    if (!deleteResponse || deleteResponse.deletedCount === 0) {
      throw new InternalServerError('Failed to delete collection');
    }

    return { message: 'Collection permanently deleted', deleteResponse };
  }

  async addImageToCollection(id: string, imageUrl: string) {
    const collection = await this._collectionRepository.getCollectionById(id);

    if (!collection) {
      throw new NotFoundError('Collection not found');
    }

    const updatedCollection = await this._collectionRepository.addImageToCollection(
      id,
      imageUrl
    );

    if (!updatedCollection) {
      throw new InternalServerError('Failed to add image to collection');
    }

    return updatedCollection;
  }

  async removeImageFromCollection(id: string, imageUrl: string) {
    const collection = await this._collectionRepository.getCollectionById(id);

    if (!collection) {
      throw new NotFoundError('Collection not found');
    }

    const updatedCollection = await this._collectionRepository.removeImageFromCollection(
      id,
      imageUrl
    );

    if (!updatedCollection) {
      throw new InternalServerError('Failed to remove image from collection');
    }

    return updatedCollection;
  }
}

export default new CollectionService(
  new CollectionRepository(),
  new ProductRepository()
);