import { Router } from "express";
import { asyncHandler } from "../utils/asynchandler";
import { bulkUpdateField, createProduct, deleteMultipleProducts, deleteProduct, getAllProducts, getProductById, getProductByProductId, getProducts, mapImagesToProducts, searchProducts, setBasePrices, updateAllProductPrices, updateProduct, updateProductPricesByKarat } from "../controllers/product.controllers";
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
productRouter.post('/', isAdminLoggedIn, asyncHandler(createProduct));
productRouter.put('/:id', isAdminLoggedIn, asyncHandler(updateProduct));
productRouter.delete('/:id', isAdminLoggedIn, asyncHandler(deleteProduct));
productRouter.post('/delete-multiple', isAdminLoggedIn, asyncHandler(deleteMultipleProducts));
productRouter.post('/map-images', isAdminLoggedIn, asyncHandler(mapImagesToProducts));

//price management route
productRouter.post('/prices/update-all', isAdminLoggedIn, asyncHandler(updateAllProductPrices));
productRouter.post('/prices/update-by-karat', isAdminLoggedIn, asyncHandler(updateProductPricesByKarat));
productRouter.post('/prices/set-base', isAdminLoggedIn, asyncHandler(setBasePrices));

//variant management
// productRouter.post('/:productId/variants', asyncHandler());

//bulk operations
productRouter.post('/bulk-update-stock', asyncHandler(bulkUpdateField));

export default productRouter;