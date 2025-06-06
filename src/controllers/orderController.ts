import { Request, Response } from "express";
import { query, body, validationResult } from "express-validator";
import { AuthenticatedRequest } from "../types/auth";
import orderService from "../services/orderService";
import shopService from "../services/shopService";

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


export const placeOrder = async (req: Request, res: Response) : Promise<void> => {
    await body('billing_address')
    .exists({ checkFalsy: true }).withMessage('billing_address is required')
    .isString().withMessage('billing_address must be a string')
    .run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: getFieldErrors(req) });
        return;
    }

    try{
        const { billing_address } = req.body;
        const authUser = req as AuthenticatedRequest;

        const order = await orderService.createOrder(authUser.user.id, billing_address);
        res.status(201).json({ message: 'Order placed successfully', order});

    }catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
}

export const getOrders = async (req: Request, res: Response) : Promise<void> => {
    const allowedStatuses = ['pending', 'shipped', 'delivered', 'cancelled'];
    await query('status')
    .optional()
    .isIn(allowedStatuses)
    .withMessage(() => `status must be one of: ${allowedStatuses.join(', ')}`)
    .run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: getFieldErrors(req) });
        return;
    }

    try{
         const authUser = req as AuthenticatedRequest;
         const status = req.query.status as string | undefined;

        const orders = await orderService.getOrders(authUser.user.id, status);

        res.status(200).json({ orders });
    }catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
}

export const getOrder = async (req: Request, res: Response) : Promise<void> => {
    try{
        const order = await orderService.getOrderById(req.params.id);

        if (!order) {
            res.status(404).json({ success: false, message: "Order not found" });
            return;
        }

        res.status(200).json({ order });
    }catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
}

export const getAllOrders = async (req: Request, res: Response) : Promise<void> => {
    const allowedStatuses = ['pending', 'shipped', 'delivered', 'cancelled'];
    await query('status')
    .optional()
    .isIn(allowedStatuses)
    .withMessage(() => `status must be one of: ${allowedStatuses.join(', ')}`)
    .run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: getFieldErrors(req) });
        return;
    }

    try{
           
        const authUser = req as AuthenticatedRequest;
        if(authUser.user.role != 'admin'){
            res.status(403).json({ success: false, message: "Access forbidden.. Only admin allow to get all the orders"});
            return;
        }

        const status = req.query.status as string | undefined;
        const userId = req.query.user_id as string | undefined;
        const shopId = req.query.shop_id as string | undefined;

        const orders = await orderService.getAllOrders(userId, status, shopId);

        res.status(200).json({ orders });
    }catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
}

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
     const allowedStatuses = ['pending', 'shipped', 'delivered', 'cancelled'];
    await body('status')
    .exists({ checkFalsy: true})
    .isIn(allowedStatuses)
    .withMessage(() => `status must be one of: ${allowedStatuses.join(', ')}`)
    .run(req);
  
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: getFieldErrors(req) });
        return;
    }
  
  const { status } = req.body;
    try {
        const order = await orderService.getOrderById(req.params.id);
        if (!order) {
            res.status(404).json({ success: false, message: "Order not found" });
            return;
        }
        const authUser = req as AuthenticatedRequest;
        if(authUser.user.role != 'admin'){
            res.status(403).json({ success: false, message: "Access forbidden.. Only admin allow to update order data" });
            return;
        }

        const updatedStatus = await orderService.updateOrderStatus(req.params.id, status);

        if(!updatedStatus){
        res.status(400).json({ success: false, message: 'Something went wrong during update' });
        return;
        }

        res.status(200).json({
        message: 'Order status updated',
        order_status: updatedStatus,
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
}

export const cencelOrder =  async (req: Request, res: Response): Promise<void> => {
    try {
        const order = await orderService.getOrderById(req.params.id);
        if (!order) {
        res.status(404).json({ success: false, message: "Order not found" });
        return;
        }
        const authUser = req as AuthenticatedRequest;
        if(authUser.user.id !== order.user_id){
            res.status(403).json({ success: false, message: "Access forbidden.. Only that user allow to update who order this." });
            return;
        }

        const updatedStatus = await orderService.updateOrderStatus(req.params.id, 'cancelled');

        if(!updatedStatus){
            res.status(400).json({ success: false, message: 'Something went wrong during update' });
            return;
        }

        res.status(200).json({
            message: 'Order cancelled',
            order_status: updatedStatus,
        });
    }catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
    }
}

export const getOrdersOfSeller  =  async (req: Request, res: Response): Promise<void> => {
    try{
        const authUser = req as AuthenticatedRequest;
        const shop = await shopService.getShopByOwnerId(authUser.user.id);

        if(!shop){
             res.status(404).json({ success: false, message: 'Shop data not found for this logged in user' });
             return;
        }

        const orders = await orderService.getOrdersByShopId(shop.id);
        res.status(200).json({
            message: "Seller's order data get successfully!",
            orders: orders,
        })
    }catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
    }
}