import { Request, Response } from "express";
import productService from "../services/productService";
import shopService from "../services/shopService";
import { body, validationResult } from "express-validator";
import { AuthenticatedRequest } from "../types/auth";
const { validate: isUUID } = require('uuid');
import { pool } from '../config/dbConnection'; 

// Helper to get one error per field
const getFieldErrors = (req: Request): Record<string, string> => {
  const result = validationResult(req);
  const mapped = result.mapped();
  const errors: Record<string, string> = {};
  for (const field in mapped) {
    errors[field] = mapped[field].msg;
  }
  return errors;
};

export const createProduct= async (req: Request, res: Response) : Promise<void> => {

  await body('shop_id')
    .notEmpty().withMessage('shop_id is required')
    .custom((value) => {
      if (!isUUID(value)) throw new Error('shop_id must be a valid UUID');
      return true;
    })
    .run(req);

  await body('category_id')
    .notEmpty().withMessage('category_id is required')
    .custom((value) => {
      if (!isUUID(value)) throw new Error('category_id must be a valid UUID');
      return true;
    })
    .run(req);

  await body('title')
    .notEmpty().withMessage('title is required')
    .isLength({ min: 2, max: 100 }).withMessage("title must be between 2 and 100 characters")
    .run(req);

  await body('description')
    .optional({ nullable: true })
    .isString().withMessage('description must be a string')
    .run(req);

  await body('slug')
    .notEmpty().withMessage('slug is required')
    .isLength({ min: 2, max: 100 }).withMessage("slug must be between 2 and 100 characters")
    .custom(async (value) => {
      const result = await pool.query('SELECT 1 FROM products WHERE slug = $1 LIMIT 1', [value]);
      if (result.rowCount !== null && result.rowCount > 0) throw new Error('Product slug must be unique');
      return true;
    })
    .run(req);

  await body('discount_type')
    .optional({ nullable: true })
    .isIn(['flat', 'percentage']).withMessage('discount_type must be either "flat" or "percentage"')
    .run(req);

  await body('discount_amount')
    .optional({ nullable: true })
    .isDecimal({ decimal_digits: '0,2' }).withMessage('discount_amount must be a decimal with up to 2 digits')
    .run(req);

  await body('status')
    .optional({ nullable: true })
    .isIn(['active', 'inactive', 'out_of_stock']).withMessage('status must be "active", "inactive", or "out_of_stock"')
    .run(req);

  await body('unit_type')
    .optional({ nullable: true })
    .isIn(['unit', 'kg', 'litre', 'size']).withMessage('unit_type must be one of "unit", "kg", "litre", "size"')
    .run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: getFieldErrors(req) });
        return;
    }

    try {
        const authUser = req as AuthenticatedRequest;
        const { shop_id, category_id, title, description, slug, discount_type, discount_amount, status, unit_type } = req.body;

            const shop = await shopService.getShopById(shop_id);
            if (!shop) {
              res.status(404).json({ success: false, message: "Shop data not found" });
              return;
            }
            
            if(shop.owner.id !== authUser.user.id){
                res.status(403).json({ success: false, message: "Access forbidden.. Only shop's owner allow to create the product in their own shop" });
                return;
            }
            


        const products = await productService.createProduct({
            shop_id, category_id, title, description, slug, discount_type, discount_amount, status, unit_type 
        });

        res.status(201).json({
            message: "Product created successfully",
            product: products
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
}

export const updateProduct = async (req: Request, res: Response): Promise<void> => {

   await body('shop_id')
    .optional()
    .custom((value) => {
      if (!isUUID(value)) throw new Error('shop_id must be a valid UUID');
      return true;
    })
    .run(req);

  await body('category_id')
    .optional()
    .custom((value) => {
      if (!isUUID(value)) throw new Error('category_id must be a valid UUID');
      return true;
    })
    .run(req);

  await body('title')
    .optional({ checkFalsy: false })
    .isLength({ min: 2, max: 100 }).withMessage("title must be between 2 and 100 characters")
    .run(req);

  await body('description')
    .optional({ nullable: true })
    .isString().withMessage('description must be a string')
    .run(req);

  await body('slug')
  .optional()
  .isLength({ min: 2, max: 100 }).withMessage("slug must be between 2 and 100 characters")
  .custom(async (value, { req }) => {
    const productId = req.params?.id; // assuming product ID is in route params
    const result = await pool.query(
      'SELECT 1 FROM products WHERE slug = $1 AND id != $2 LIMIT 1',
      [value, productId]
    );
    if (result.rowCount !== null && result.rowCount > 0) {
      throw new Error('Product slug must be unique');
    }
    return true;
  })
  .run(req);

  await body('discount_type')
    .optional({ nullable: true })
    .isIn(['flat', 'percentage']).withMessage('discount_type must be either "flat" or "percentage"')
    .run(req);

  await body('discount_amount')
    .optional({ nullable: true })
    .isDecimal({ decimal_digits: '0,2' }).withMessage('discount_amount must be a decimal with up to 2 digits')
    .run(req);

  await body('status')
    .optional({ nullable: true })
    .isIn(['active', 'inactive', 'out_of_stock']).withMessage('status must be "active", "inactive", or "out_of_stock"')
    .run(req);

  await body('unit_type')
    .optional({ nullable: true })
    .isIn(['unit', 'kg', 'litre', 'size']).withMessage('unit_type must be one of "unit", "kg", "litre", "size"')
    .run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: getFieldErrors(req) });
        return;
    }


  try {
    const productId = req.params.id;
    // Get existing shop by id
    const product = await productService.getProductById(productId);
    if (!product) {
      res.status(404).json({ success: false, message: "Product data not found" });
      return;
    }
    
    const authUser = req as AuthenticatedRequest;

    if(authUser.user.role == 'user'){
      if(product.shop.owner_id !== authUser.user.id){          
          res.status(403).json({ success: false, message: "Access forbidden.. Only shop's owner or admin allow to update product data for shop" });
          return;
      }
    }

    if(req.body.shop_id){
        if(req.body.shop_id !== product.shop_id){
          res.status(400).json({ success: false, message: "You can't change shop_id" });
          return;
        }
    }

    // Prepare update data only for fields present in body
    const updateData: Partial<typeof product> = {};
    if (req.body.category_id !== undefined) updateData.category_id = req.body.category_id;
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.slug !== undefined) updateData.slug = req.body.slug;
    if (req.body.discount_type !== undefined) updateData.discount_type = req.body.discount_type;
    if (req.body.discount_amount !== undefined) updateData.discount_amount = req.body.discount_amount;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.unit_type !== undefined) updateData.unit_type = req.body.unit_type;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ success: false, message: "No valid fields provided for update" });
      return;
    }

    // Call service to update
    const updatedProduct = await productService.updateProduct(productId, updateData);

    if (!updatedProduct) {
      res.status(500).json({ success: false, message: "Failed to update product" });
      return;
    }

    res.status(200).json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }

};

export const getProduct = async (req: Request, res: Response): Promise<void> => {
  try{
    const product = await productService.getProductById(req.params.id);

    if (!product) {
      res.status(404).json({ success: false, message: "Product data not found" });
      return;
    }else{
      res.status(201).json({
          product: product
        });
    }
  } catch (err : any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    
    const status = req.query.status as string | undefined;
    const shopId = req.query.shop_id as string | undefined;
    const categoryId = req.query.category_id as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await productService.getProducts({
      status,
      shopId,
      categoryId,
      search,
      limit: Number(limit),
      offset: Number(offset)
    });

    res.status(200).json(result);
  } catch (err: any) {
    console.error('Error fetching shops:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

export const updateProductStatus = async (req: Request, res: Response): Promise<void> => {
  
  await body('status')
  .isIn(['active', 'inactive'])
  .withMessage('Status must be either active or inactive')
  .run(req);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: getFieldErrors(req) });
    return;
  }
  
  const { status } = req.body;
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      res.status(404).json({ success: false, message: "Product data not found" });
      return;
    }
    const authUser = req as AuthenticatedRequest;
    if(authUser.user.role == 'user'){
      if(product.shop.owner_id !== authUser.user.id){
          res.status(403).json({ success: false, message: "Access forbidden.. Only product's owner or admin allow to update product data" });
          return;
      }
    }

    const updatedStatus = await productService.updateProductStatus(req.params.id, status);

    if(!updatedStatus){
      res.status(500).json({ success: false, message: 'Something went wrong during update' });
      return;
    }

    res.status(200).json({
      message: 'Product status updated',
      status: updatedStatus,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}