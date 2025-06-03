import { pool } from '../config/dbConnection'; 

 interface Product {
  id: string;
  shop_id: string;
  category_id: string;
  title: string;
  description?: string;
  slug: string;
  discount_type?: 'flat' | 'percentage';
  discount_amount?: number;
  status: 'active' | 'inactive' | 'out_of_stock';
  unit_type: 'unit' | 'kg' | 'litre' | 'size';
  created_at?: string;
  updated_at?: string;
}

export const createProduct = async (productData: Partial<Product>): Promise<Product> => {
   const keys: string[] = [];
  const values: any[] = [];
  const placeholders: string[] = [];

  let i = 1;
  for (const [key, value] of Object.entries(productData)) {
    if (value !== undefined) {
      keys.push(key);
      values.push(value);
      placeholders.push(`$${i++}`);
    }
  }

  const query = `
    INSERT INTO products (${keys.join(', ')})
    VALUES (${placeholders.join(', ')})
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};


export default{
    createProduct
}