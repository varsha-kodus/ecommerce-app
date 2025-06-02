import { Request, Response } from "express";
import shopService from "../services/shopService";
import { body, validationResult } from "express-validator";
import { pool } from '../config/dbConnection'; 
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
  console.log(req.body);
  
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
          res.status(403).json({ error: "You already own a shop." });
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
        console.error("Shop creation error:", err);
        res.status(500).json({ error: "Internal Server Error" });
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
      res.status(404).json({ error: "Shop not found" });
      return;
    }

    // Prepare update data only for fields present in body
    const updateData: Partial<typeof shop> = {};
    if (req.body.shop_name !== undefined) updateData.shop_name = req.body.shop_name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.logo !== undefined) updateData.logo = req.body.logo;
    if (req.body.address !== undefined) updateData.address = req.body.address;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "No valid fields provided for update" });
      return;
    }

    // Call service to update
    const updatedShop = await shopService.updateShop(shopId, updateData);

    if (!updatedShop) {
      res.status(500).json({ error: "Failed to update shop" });
      return;
    }

    res.status(200).json({
      message: "Shop updated successfully",
      shop: updatedShop,
    });
  } catch (err) {
    console.error("Error updating shop:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};