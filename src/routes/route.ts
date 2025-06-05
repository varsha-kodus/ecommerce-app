import express from "express";
import validateToken from "../middleware/validateTokenHandler";
import { createShop, updateShop, getShop, getShops, updateShopStatus } from "../controllers/shopController";
import { createCategory, updateCategory, getCategory, getCategories, updateCategoryStatus } from "../controllers/categoryController";
import { createProduct, updateProduct, getProduct, getProducts, updateProductStatus } from "../controllers/productController";
import { createProductVariant, updateProductVariant, getProductVariant } from "../controllers/productVariantController";
import { addCartItem, getCartItem, updateCartItem, deleteCartItem, deleteAllCartItem } from "../controllers/cartController";
import { placeOrder, getOrders, getOrder, getAllOrders, updateOrderStatus, cencelOrder } from "../controllers/orderController";
import { createProductGallery, setImagePrimary, deleteProductGallery } from "../controllers/productGalleryController";
import { uploadImage } from "../middleware/upload";

const router = express.Router();

//shop
router.post("/api/shops", validateToken ,createShop);
router.patch("/api/shops/:id", validateToken, updateShop);
router.get("/api/shops/:id", getShop);
router.get("/api/shops", getShops);
router.patch("/api/shops/:id/status", updateShopStatus);

//category
router.post("/api/categories", validateToken ,createCategory);
router.patch("/api/categories/:id", validateToken ,updateCategory);
router.get("/api/categories/:id" ,getCategory);
router.get("/api/categories" ,getCategories);
router.patch("/api/categories/:id/status", validateToken, updateCategoryStatus);

//products
router.post("/api/products", validateToken ,createProduct);
router.patch("/api/products/:id", validateToken ,updateProduct);
router.get("/api/products/:id" ,getProduct);
router.get("/api/products", getProducts);
router.patch("/api/products/:id/status", validateToken, updateProductStatus);

//product variant
router.post("/api/products/:product_id/variants", validateToken, createProductVariant);
router.patch("/api/variants/:id", validateToken ,updateProductVariant);
router.get("/api/products/:product_id/variants", getProductVariant);

//cart
router.post("/api/cart", validateToken , addCartItem);
router.get("/api/cart", validateToken , getCartItem);
router.patch("/api/cart/:cart_item_id", validateToken , updateCartItem);
router.delete("/api/cart/:cart_item_id", validateToken , deleteCartItem);
router.delete("/api/cart", validateToken , deleteAllCartItem);

//orders
router.post("/api/orders", validateToken , placeOrder);
router.get("/api/orders", validateToken , getOrders);
router.get("/api/orders/:id", validateToken , getOrder);
router.get("/api/admin/orders", validateToken , getAllOrders);
router.patch("/api/admin/orders/:id/status", validateToken , updateOrderStatus);
router.patch("/api/orders/:id/cancel", validateToken , cencelOrder);

//product_gallery
router.post("/api/products/:product_id/gallery", uploadImage.single("file") , createProductGallery);
router.patch("/api/products/:product_id/gallery/:id/primary" , setImagePrimary);
router.delete("/api/products/:product_id/gallery/:id" , deleteProductGallery);

export default router;