import { Request, Response } from "express";
import cartService from "../services/cartService";
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

export const addCartItem = async (req: Request, res: Response) : Promise<void> => {
    await body('product_id')
        .exists().withMessage('product_id is required')
        .custom((value) => {
            if (!isUUID(value)) throw new Error("product_id must be a valid UUID");
            return true;
        })
        .run(req);

    await body('variant_id')
        .exists().withMessage('variant_id is required')
        .custom((value) => {
            if (!isUUID(value)) throw new Error("variant_id must be a valid UUID");
            return true;
        })
        .run(req);

    await body('quantity')
        .exists().withMessage('quantity is required')
        .isInt({ min: 1 }).withMessage('quantity must be an integer ≥ 1')
        .run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: getFieldErrors(req) });
        return;
    }

    const { product_id, variant_id, quantity } = req.body;

    try{
        const authUser = req as AuthenticatedRequest;
        const cart = await cartService.createCartIfNotExists(authUser.user.id);

        const cart_item = await cartService.addCartItem({
        userId: authUser.user.id,
        cartId: cart?.id,
        productId: product_id,
        variantId: variant_id,
        quantity: parseInt(quantity),
        });

        res.status(201).json({
            message: "Item added to cart",
            cart_item,
        });
    }catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
    }
}

export const getCartItem =  async (req: Request, res: Response) : Promise<void> => {
    try{

        const authUser = req as AuthenticatedRequest;
        const cart = await cartService.getCartItem(authUser.user.id);

         res.status(200).json({
            ...cart,
        });

    }catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
}

export const updateCartItem = async (req: Request, res: Response) : Promise<void> => {
    await body('quantity')
        .notEmpty().withMessage('quantity is required')
        .isInt({ min: 1 }).withMessage('quantity must be an integer ≥ 1')
        .run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: getFieldErrors(req) });
        return;
    }

    try{
        const updatedCartItem = await cartService.updateCartItem(req.params.cart_item_id, req.body.quantity);
           res.status(201).json({
            message: "Cart item updated",
            ...updatedCartItem,
        });

    }catch(err: any){
        res.status(500).json({ success: false, message: err.message });
    }
    
}

export const deleteCartItem = async (req: Request, res: Response) : Promise<void> => {
    try{
        const authUser = req as AuthenticatedRequest;
        const cartItemId = req.params.cart_item_id;

        await cartService.deleteCartItem(authUser.user.id, cartItemId);

        res.status(200).json({ message: "Cart item removed" });
    }catch(err: any){
        res.status(500).json({ success: false, message: err.message });
    }
}

export const deleteAllCartItem = async (req: Request, res: Response) : Promise<void> => {
    try{
        const authUser = req as AuthenticatedRequest;

        await cartService.deleteAllCartItem(authUser.user.id);

        res.status(200).json({ message: "Cart cleared" });
    }catch(err: any){
        res.status(500).json({ success: false, message: err.message });
    }
}