import { Request, Response } from "express";
import productService from "../services/productService";
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