import { Request, Response } from "express";
import productVariantService from "../services/productVariantService";
import { param, body, validationResult } from "express-validator";
import { AuthenticatedRequest } from "../types/auth";
const { validate: isUUID } = require('uuid');
import { pool } from '../config/dbConnection'; 
import productService from "../services/productService";

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

export const createProductVariant = async (req: Request, res: Response) : Promise<void> => {
    await param("product_id")
    .custom((value) => {
      if (!isUUID(value)) throw new Error("Invalid product_id format");
      return true;
    })
    .run(req);

    await body("label")
        .notEmpty().withMessage("Label is required")
        .isLength({ min: 1, max: 15 }).withMessage("label must be between 1 and 15 characters")
        .run(req);

    await body("quantity")
        .optional()
        .isInt({ min: 0 }).withMessage("Quantity must be a non-negative integer")
        .run(req);

    await body("base_price")
        .optional()
        .isDecimal({ decimal_digits: "0,2" }).withMessage("Base price must be a decimal with up to 2 decimal places")
        .run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: getFieldErrors(req) });
        return;
    }
    
    try{
        const { label, quantity, base_price } = req.body;
        
        const product = await productService.getProductById(req.params.product_id);
        if (!product) {
            res.status(404).json({ success: false, message: "Product data not found" });
            return;
        }
        
        const authUser = req as AuthenticatedRequest;
        if(authUser.user.role == 'user'){
            if(product.owner_id !== authUser.user.id){
                res.status(403).json({ success: false, message: "Access forbidden.. Only product's owner or admin allow to create product's variant" });
                return;
            }
        }
            


        const productVariants = await productVariantService.createProductVariant({
           product_id:req.params.product_id, label, quantity, base_price 
        });

        res.status(201).json({
            message: "Variant created successfully",
            variant: productVariants
        });
    }catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
}

export const updateProductVariant = async (req: Request, res: Response): Promise<void> => {
    await body("label")
        .optional({ checkFalsy: false })
        .notEmpty().withMessage("Label is required")
        .isLength({ min: 1, max: 15 }).withMessage("label must be between 1 and 15 characters")
        .run(req);

    await body("quantity")
        .optional({ checkFalsy: false })
        .isInt({ min: 0 }).withMessage("Quantity must be a non-negative integer")
        .run(req);

    await body("base_price")
        .optional({ checkFalsy: false })
        .isDecimal({ decimal_digits: "0,2" }).withMessage("Base price must be a decimal with up to 2 decimal places")
        .run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: getFieldErrors(req) });
        return;
    }

    try{
        const variantId = req.params.id;
        const productVariant = await productVariantService.getVariantById(variantId);
        if (!productVariant) {
          res.status(404).json({ success: false, message: "Product variant data not found" });
          return;
        }
        // Get existing shop by id
        const product = await productService.getProductById(productVariant.product_id);
        if (!product) {
          res.status(404).json({ success: false, message: "Product data not found" });
          return;
        }
        
        const authUser = req as AuthenticatedRequest;
        if(authUser.user.role == 'user'){
          if(product.owner_id !== authUser.user.id){          
              res.status(403).json({ success: false, message: "Access forbidden.. Only product's owner or admin allow to update product's variant" });
              return;
          }
        }
    
        // Prepare update data only for fields present in body
        const updateData: Partial<typeof product> = {};
        if (req.body.label !== undefined) updateData.label = req.body.label;
        if (req.body.quantity !== undefined) updateData.quantity = req.body.quantity;
        if (req.body.base_price !== undefined) updateData.base_price = req.body.base_price;
    
        if (Object.keys(updateData).length === 0) {
          res.status(400).json({ success: false, message: "No valid fields provided for update" });
          return;
        }
    
        const updatedVariant = await productVariantService.updateProductVariant(variantId, updateData);
    
        if (!updatedVariant) {
          res.status(500).json({ success: false, message: "Failed to update product variant" });
          return;
        }
    
        res.status(200).json({
          message: "Product variant updated successfully",
          variant: updatedVariant,
        });

    } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
    }
}

export const getProductVariant = async (req: Request, res: Response): Promise<void> => {
    try{
        const product = await productService.getProductById(req.params.product_id);
        if (!product) {
          res.status(404).json({ success: false, message: "Product data not found" });
          return;
        }

        const productVariants = await productVariantService.getProductVariants(req.params.product_id);
        
        res.status(200).json(productVariants);
    }catch (err: any) {
        console.error('Error fetching shops:', err);
        res.status(500).json({ success: false, message: err.message });
    }
}