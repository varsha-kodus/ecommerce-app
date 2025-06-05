import { Request, Response } from "express";
import { query, body, validationResult } from "express-validator";
import { AuthenticatedRequest } from "../types/auth";
import productGalleryService from "../services/productGalleryService";

export const createProductGallery = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
        res.status(400).json({ error: "Image file is required" });
        return;
    }

    if ((req as any).fileValidationError) {
        res.status(400).json({ error: (req as any).fileValidationError });
    }

    let isPrimary = false;

    if (req.body.is_primary !== undefined) {
        if (req.body.is_primary === "true" || req.body.is_primary === true) {
            isPrimary = true;
        } else if (req.body.is_primary !== "false" && req.body.is_primary !== false) {
            res.status(400).json({ error: "is_primary must be a boolean" });
        }
    }

    const galleryItem = {
        productId: req.params.product_id,
        imageUrl: req.file.filename,
        isPrimary: isPrimary,
    };

    const savedItem = await productGalleryService.saveGalleryItem(galleryItem);

    res.status(201).json({
      message: "Image added to gallery",
      galleryItem: savedItem,
    });
  } catch (error:any) {
    res.status(500).json({ success:false, message: error.message });
  }
};

export const setImagePrimary = async (req: Request, res: Response): Promise<void> => {
  try {
    const galleryItem = {
        productId: req.params.product_id,
        galleryId: req.params.id
    };

    const savedItem = await productGalleryService.setImagePrimary(galleryItem);
    console.log(savedItem,'savedItem');
    
    if(!savedItem){      
        res.status(500).json({ success: false, message: "image gallery not found"});
        return;
    }

    res.status(200).json({
      message: "Primary image set"
    });
  } catch (error:any) {
    res.status(500).json({ success:false, message: error.message });
  }
};

export const deleteProductGallery = async (req: Request, res: Response): Promise<void> => {
    try {
    const galleryItem = {
        productId: req.params.product_id,
        galleryId: req.params.id
    };

    const deleteItem = await productGalleryService.deleteProductGallery(galleryItem);

    if(!deleteItem){      
        res.status(500).json({ success: false, message: "image gallery not found"});
        return;
    }

    res.status(200).json({
      message: "Image deleted"
    });
  } catch (error:any) {
    res.status(500).json({ success:false, message: error.message });
  }
}