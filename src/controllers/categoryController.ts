
import { Request, Response } from "express";
import categoryService from "../services/categoryService";
import { query, body, validationResult } from "express-validator";
import { AuthenticatedRequest } from "../types/auth";
import { pool } from '../config/dbConnection'; 
const { validate: isUUID } = require('uuid');

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

export const createCategory = async (req: Request, res: Response) : Promise<void> => {
    await body("category_name")
      .notEmpty().withMessage("Category name is required")
      .isLength({ min: 2, max: 50 }).withMessage("Category name must be between 2 and 50 characters")
      .run(req);
    await body("slug")
      .notEmpty().withMessage("Category slug is required")
      .isLength({ min: 2, max: 50 }).withMessage("Category slug must be between 2 and 50 characters")
      .custom(async (value) => {
            const query = "SELECT 1 FROM categories WHERE slug = $1 LIMIT 1";
            const result = await pool.query(query, [value]);
            if (result.rowCount !== null && result.rowCount > 0) {
            throw new Error("This category slug is already exists!");
            }
            return true;
        })
      .run(req);
    await body('parent_id')
    .optional({ nullable: true })
    .custom(async (value) => {
        
      if (!isUUID(value)) {
        throw new Error('parent_id must be a valid UUID');
      }

      const result = await pool.query(
        'SELECT id FROM categories WHERE id = $1 AND parent_id IS NULL',
        [value]
      );      

      if (result.rows.length === 0) {        
        throw new Error('parent_id must refer to a top-level category');
      }

      return true;
    })
    .run(req);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ success: false, errors: getFieldErrors(req) });
          return;
        }

    try {
        const authUser = req as AuthenticatedRequest;
        if(authUser.user.role != 'admin'){
            res.status(403).json({ success: false, message: "Access forbidden.. Only admin allow to create category" });
            return;
        }

        const { category_name, slug, parent_id } = req.body;
        const categories = await categoryService.createCategory({ category_name, slug, parent_id });

        res.status(201).json({
          message: "Category created successfully",
          category: categories
        });

    }catch (err: any) {
         res.status(500).json({ success: false, message: err.message });
    }
}

export const updateCategory = async (req: Request, res: Response) : Promise<void> => {
    await body("category_name")
      .optional()
      .isLength({ min: 2, max: 50 }).withMessage("Category name must be between 2 and 50 characters")
      .run(req);
    await body("slug")
       .optional()
      .isLength({ min: 2, max: 50 }).withMessage("Category slug must be between 2 and 50 characters")
      .custom(async (value) => {
            const query = "SELECT 1 FROM categories WHERE slug = $1 LIMIT 1";
            const result = await pool.query(query, [value]);
            if (result.rowCount !== null && result.rowCount > 0) {
            throw new Error("This category slug is already exists!");
            }
            return true;
        })
      .run(req);
    await body('parent_id')
    .optional({ nullable: true })
    .custom(async (value) => {
        
      if (!isUUID(value)) {
        throw new Error('parent_id must be a valid UUID');
      }

      const result = await pool.query(
        'SELECT id FROM categories WHERE id = $1 AND parent_id IS NULL',
        [value]
      );      

      if (result.rows.length === 0) {        
        throw new Error('parent_id must refer to a top-level category');
      }

      return true;
    })
    .run(req);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ success: false, errors: getFieldErrors(req) });
          return;
        }

    try {
        const authUser = req as AuthenticatedRequest;
        if(authUser.user.role != 'admin'){
            res.status(403).json({ success: false, message: "Access forbidden.. Only admin allow to update category" });
            return;
        }

         // Get existing shop by id
        const category = await categoryService.getCategoryById(req.params.id);
        if (!category) {
            res.status(404).json({ success: false, message: "Category not found" });
            return;
        }


    const updateData: Partial<typeof categories> = {};
    if (req.body.category_name !== undefined) updateData.category_name = req.body.category_name;
    if (req.body.slug !== undefined) updateData.slug = req.body.slug;
    if (req.body.parent_id !== undefined) updateData.parent_id = req.body.parent_id;

        const categories = await categoryService.updateCategory(req.params.id, updateData);

        res.status(201).json({
          message: "Category updated successfully",
          category: categories
        });


        }catch (err: any) {
         res.status(500).json({ success: false, message: err.message });
      }
}

export const getCategory = async (req: Request, res: Response): Promise<void> => {
  try{
    const category = await categoryService.getCategoryById(req.params.id);

    if (!category) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }else{
      res.status(200).json({
          category: category
        });
    }
  } catch (err : any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export const getCategories = async (req: Request, res: Response): Promise<void> => {
    try{     
        await query("flat")
        .optional()
        .isBoolean().withMessage("flat must be a boolean value (true or false)")
        .run(req);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ success: false, errors: getFieldErrors(req) });
          return;
        }

        const category = await categoryService.getCategories(req.query.flat);

        if (!category) {
            res.status(404).json({ success: false, message: "Categories not found" });
            return;
        }else{
            res.status(200).json({
            categories: category
        });
        }
    } catch (err : any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export const updateCategoryStatus = async (req: Request, res: Response): Promise<void> => {
  
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
   const authUser = req as AuthenticatedRequest;
    if(authUser.user.role != 'admin'){
        res.status(403).json({ success: false, message: "Access forbidden.. Only admin allow to create category" });
        return;
    }

  try {
    const updatedStatus = await categoryService.updateCategoryStatus(req.params.id, status);

    if(!updatedStatus){
      res.status(400).json({ success: false, message: 'Something went wrong during update' });
      return;
    }

    res.status(200).json({
      message: 'Category status updated',
      status: updatedStatus,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}