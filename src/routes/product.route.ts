import { Router } from "express";
import { asyncHandler } from "../utils/asynchandler";
import { addVariantToProduct, bulkUpdateField, createProduct, deleteMultipleProducts, deleteProduct, getAllProducts, getProductById, getProductByProductId, getProducts, mapImagesToProducts, searchProducts, setBasePrices, updateAllProductPrices, updateProduct, updateProductPricesByKarat } from "../controllers/product.controllers";
import isAdminLoggedIn from "../middlewares/isAdminLoggedIn.middleware";
import { searchProductValidator, updateProductStockValidator } from "../middlewares/validators/auth.validator";
import { uploadProductImage } from "../middlewares/multer.middleware";

const productRouter = Router();

productRouter.get('/search', asyncHandler(searchProducts));
productRouter.post('/filter', asyncHandler(getProducts));
productRouter.get('/', asyncHandler(getAllProducts));
productRouter.get('/:id', asyncHandler(getProductById));
productRouter.get('/by-product-id/:productId', asyncHandler(getProductByProductId));
//admin
productRouter.post('/', asyncHandler(createProduct));
productRouter.put('/', asyncHandler(updateProduct));
productRouter.delete('/', asyncHandler(deleteProduct));
productRouter.post('/delete-multiple', asyncHandler(deleteMultipleProducts));
productRouter.post('/map-images', asyncHandler(mapImagesToProducts));

//price management route
productRouter.post('prices/update-all', asyncHandler(updateAllProductPrices));
productRouter.post('/prices/update-by-karat', asyncHandler(updateProductPricesByKarat));
productRouter.post('/prices/set-base', asyncHandler(setBasePrices));

//variant management
productRouter.post('/:productId/variants', asyncHandler(addVariantToProduct));

//bulk operations
productRouter.post('/bulk-update-stock', asyncHandler(bulkUpdateField));

export default productRouter;