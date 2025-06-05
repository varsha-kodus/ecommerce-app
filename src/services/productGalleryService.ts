import { error } from 'console';
import { pool } from '../config/dbConnection'; 
import fs from "fs";
import path from "path";

interface ProductGallery{
    productId?: string,
    galleryId?: string,
    imageUrl?:  string,
    isPrimary?: boolean
}

const saveGalleryItem = async (galleryItem: ProductGallery) : Promise<any> => {
        if (galleryItem.isPrimary) {
            await pool.query(
                `UPDATE product_gallery SET is_primary = false WHERE product_id = $1`,
                [galleryItem.productId]
            );
        }

        const result = await pool.query(
            `INSERT INTO product_gallery ( product_id, image_url, is_primary)
            VALUES ($1, $2, $3) RETURNING *`,
            [galleryItem.productId, galleryItem.imageUrl, galleryItem.isPrimary ]
        );

        if(result.rows[0]){
            result.rows[0].image_url =  `${process.env.BASE_URL}/uploads/${result.rows[0].image_url}`;
        }

       return result.rows[0];
}

const setImagePrimary = async (galleryItem: ProductGallery) : Promise<any> => {
    const resultGallery =  await pool.query(
        `SELECT image_url FROM product_gallery WHERE product_id = $1 and id=$2`,
        [galleryItem.productId, galleryItem.galleryId]
    );

    console.log(galleryItem.productId, galleryItem.galleryId, resultGallery.rows);
    
    if(!resultGallery.rows[0]) return null;

    await pool.query(
        `UPDATE product_gallery SET is_primary = false WHERE product_id = $1 RETURNING *`,
        [galleryItem.productId]
    );

    const result =  await pool.query(
        `UPDATE product_gallery SET is_primary = true WHERE product_id = $1 and id=$2 RETURNING *`,
        [galleryItem.productId, galleryItem.galleryId]
    );
    
    return result.rows[0];
}

const deleteProductGallery = async (galleryItem: ProductGallery) : Promise<any> => {
    const resultGallery =  await pool.query(
        `SELECT image_url FROM product_gallery WHERE product_id = $1 and id=$2`,
        [galleryItem.productId, galleryItem.galleryId]
    );

    if(!resultGallery.rows[0]) return null;

    const filePath = path.join(__dirname, "..", "..", "uploads", resultGallery.rows[0].image_url);

    await fs.unlink(filePath,(err)=>{
        console.log(err),'error in unlink file';
    });

    const result =  await pool.query(
        `DELETE FROM product_gallery WHERE product_id = $1 and id=$2 RETURNING *`,
        [galleryItem.productId, galleryItem.galleryId]
    );

    return result.rows[0];
}

export default {
    saveGalleryItem,
    setImagePrimary,
    deleteProductGallery
}