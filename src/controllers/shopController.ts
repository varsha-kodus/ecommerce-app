import { Request, Response } from "express";
import shopService from "../services/shopService";
import { body, validationResult } from "express-validator";
import { AuthenticatedRequest } from "../types/auth";

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

export const createShop = async (req: Request, res: Response) : Promise<void> => {
  
    await body("shop_name")
      .notEmpty().withMessage("Shop name is required")
      .isLength({ min: 2, max: 40 }).withMessage("Shop name must be between 2 and 40 characters")
      .run(req);
    await body("description")
      .optional()
      .run(req);
    await body("logo")
      .optional({ checkFalsy: true }) // Makes it optional
      .isURL().withMessage("Logo must be a valid URL")
      .matches(/\.(jpg|jpeg|png|webp|gif)$/i).withMessage("Logo URL must point to an image file")
      .run(req);
    await body("address")
      .optional()
      .isLength({ min: 2, max: 255 }).withMessage("Shop name must be between 2 and 255 characters")
      .run(req);

      const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: getFieldErrors(req) });
            return;
        }

      try {
        const authUser = req as AuthenticatedRequest;
        const existingShop = await shopService.getShopByOwnerId(authUser.user.id);
        if (existingShop) {
          res.status(403).json({ message: "You already own a shop." });
        }

        const newShop = await shopService.createShop({
          owner_id: authUser.user.id,
          shop_name: req.body.shop_name,
          description: req.body.description,
          logo: req.body.logo,
          address: req.body.address
        });

        res.status(201).json({
          message: "Shop created successfully",
          shop: newShop
        });

      } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
      }
};

export const updateShop = async (req: Request, res: Response): Promise<void> => {

  // Validate input
  await body("shop_name")
    .optional()
    .isLength({ min: 2, max: 40 }).withMessage("Shop name must be between 2 and 40 characters")
    .run(req);

  await body("description")
    .optional()
    .run(req);

  await body("logo")
    .optional({ checkFalsy: true })
    .isURL().withMessage("Logo must be a valid URL")
    .matches(/\.(jpg|jpeg|png|webp|gif)$/i).withMessage("Logo URL must point to an image file")
    .run(req);

  await body("address")
    .optional()
    .isLength({ min: 2, max: 255 }).withMessage("Address must be between 2 and 255 characters")
    .run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: getFieldErrors(req) });
    return;
  }

  try {
    const shopId = req.params.id;
    // Get existing shop by id
    const shop = await shopService.getShopById(shopId);
    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
      return;
    }
    const authUser = req as AuthenticatedRequest;
    if(authUser.user.role == 'user'){
      if(shop.owner_id !== authUser.user.id){
          res.status(403).json({ success: false, message: "Access forbidden.. Only shop's owner or admin allow to update shop data" });
      }
    }

    // Prepare update data only for fields present in body
    const updateData: Partial<typeof shop> = {};
    if (req.body.shop_name !== undefined) updateData.shop_name = req.body.shop_name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.logo !== undefined) updateData.logo = req.body.logo;
    if (req.body.address !== undefined) updateData.address = req.body.address;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ success: false, message: "No valid fields provided for update" });
      return;
    }

    // Call service to update
    const updatedShop = await shopService.updateShop(shopId, updateData);

    if (!updatedShop) {
      res.status(500).json({ success: false, message: "Failed to update shop" });
      return;
    }

    res.status(200).json({
      message: "Shop updated successfully",
      shop: updatedShop,
    });
  } catch (err: any) {
    console.error("Error updating shop:", err);
    res.status(500).json({ success: false, message: err.message });
  }

};

export const getShop = async (req: Request, res: Response): Promise<void> => {
  try{
    const shop = await shopService.getShopById(req.params.id);

    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
      return;
    }else{
      res.status(201).json({
          shop: shop
        });
    }
  } catch (err : any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export const getShops = async (req: Request, res: Response): Promise<void> => {
  try {
    
    const status = req.query.status as string | undefined;
    const ownerId = req.query.owner_id as string | undefined;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await shopService.getShops({
      status,
      ownerId: ownerId,
      limit: Number(limit),
      offset: Number(offset)
    });

    res.status(200).json(result);
  } catch (err: any) {
    console.error('Error fetching shops:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

export const updateShopStatus = async (req: Request, res: Response): Promise<void> => {
  
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
    const shop = await shopService.getShopById(req.params.id);
    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
      return;
    }
    const authUser = req as AuthenticatedRequest;
    if(authUser.user.role == 'user'){
      if(shop.owner_id !== authUser.user.id){
          res.status(403).json({ success: false, message: "Access forbidden.. Only shop's owner or admin allow to update shop data" });
      }
    }

    const updatedStatus = await shopService.updateShopStatus(req.params.id, status);

    if(!updatedStatus){
      res.status(404).json({ success: false, message: 'Shop not found' });
    }

    res.status(200).json({
      message: 'Shop status updated',
      status: updatedStatus,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}