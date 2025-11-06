import collectionModel, { ICollection } from '../models/collection.model';

export interface ICreateCollectionParams {
  name: string;
  imageUrls?: string[];
  description?: string;
  isActive?: boolean;
}

export interface IUpdateCollectionParams {
  name?: string;
  imageUrls?: string[];
  description?: string;
  isActive?: boolean;
}

export class CollectionRepository {
  private _model = collectionModel;

  async getAllCollections(): Promise<ICollection[]> {
    return this._model.find({ isActive: true });
  }

  async getCollectionById(id: string): Promise<ICollection | null> {
    return this._model.findById(id);
  }

  async getCollectionByName(name: string): Promise<ICollection | null> {
    return this._model.findOne({ name });
  }

  async createCollection(params: ICreateCollectionParams): Promise<ICollection> {
    return this._model.create({
      name: params.name,
      imageUrls: params.imageUrls || [],
      description: params.description || '',
      isActive: params.isActive !== undefined ? params.isActive : true,
    });
  }

  async updateCollectionById(
    id: string,
    params: IUpdateCollectionParams
  ): Promise<ICollection | null> {
    return this._model.findByIdAndUpdate(
      id,
      {
        name: params.name,
        imageUrls: params.imageUrls,
        description: params.description,
        isActive: params.isActive,
      },
      { new: true }
    );
  }

  async deleteCollectionById(id: string): Promise<{ deletedCount: number }> {
    return this._model.deleteOne({ _id: id });
  }

  async softDeleteCollectionById(id: string): Promise<ICollection | null> {
    return this._model.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
  }

  async addImageToCollection(
    id: string,
    imageUrl: string
  ): Promise<ICollection | null> {
    return this._model.findByIdAndUpdate(
      id,
      { $addToSet: { imageUrls: imageUrl } },
      { new: true }
    );
  }

  async removeImageFromCollection(
    id: string,
    imageUrl: string
  ): Promise<ICollection | null> {
    return this._model.findByIdAndUpdate(
      id,
      { $pull: { imageUrls: imageUrl } },
      { new: true }
    );
  }
}