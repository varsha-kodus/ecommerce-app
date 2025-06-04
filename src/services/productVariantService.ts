import { pool } from '../config/dbConnection'; 

 interface ProductVariant {
  id: string;
  product_id: string;
  label: string;
  quantity?: string;
  base_price?: number;
  created_at?: string;
  updated_at?: string;
}

export const createProductVariant = async (productVariant: Partial<ProductVariant>): Promise<ProductVariant> => {
    const { product_id, label, quantity, base_price } = productVariant;

    const result = await pool.query(
        `INSERT INTO product_variants (product_id, label, quantity, base_price)
        VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [product_id, label, quantity, base_price]
    );
    return result.rows[0];
}

export const getVariantById = async (variantId: string): Promise<any | null> => {
  const result = await pool.query(
    `
    SELECT 
      product_variants.* 
    FROM product_variants
    WHERE product_variants.id = $1
    `,
    [variantId]
  );

  const row = result.rows[0];
  if (!row) return null;

  const { ...variantData } = row;

  return {
    ...variantData
  };
};

export const updateProductVariant = async (variantId: string, updateData: Partial<ProductVariant>): Promise<ProductVariant> => {
  // Build dynamic SET clause for update based on fields present in updateData
  const fields = [];
  const values = [];
  let idx = 1;

  for (const key of ['label', 'quantity', 'base_price']) {
    
    if (updateData[key as keyof ProductVariant] !== undefined) {        
      fields.push(`${key} = $${idx}`);
      values.push(updateData[key as keyof ProductVariant]);
      idx++;
    }
  }

  values.push(variantId); // for WHERE clause
  
  const query = `
    UPDATE product_variants
    SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = $${idx}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

export const getProductVariants = async (productId: string): Promise<any> => {
     const result = await pool.query(`
        SELECT 
        product_variants.* 
        FROM product_variants
        WHERE product_variants.product_id = $1
        `,
        [productId]
    );    
     
    if (!result.rows) return null;

   return {
    variants: result.rows
   }
}

export default {
    createProductVariant,
    getVariantById,
    updateProductVariant,
    getProductVariants
}