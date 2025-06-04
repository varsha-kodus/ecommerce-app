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

interface GetProductsParams {
  status: string | undefined;
  shopId: string | undefined;
  categoryId: string | undefined;
  search: string | undefined;
  limit: number;
  offset: number;
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

export const getProductById = async (productId: string): Promise<any | null> => {
  const result = await pool.query(
    `
    SELECT 
      products.*, 
      shops.owner_id,
      shops.shop_name,
      product_variants.id as variant_id,
      product_variants.label,
      product_variants.quantity,
      product_variants.base_price,
      product_variants.created_at as variant_created_at
    FROM products
    JOIN shops ON shops.id = products.shop_id
    JOIN product_variants ON product_variants.product_id = products.id
    WHERE products.id = $1
    `,
    [productId]
  );

  if (result.rows.length === 0) return null;

  const firstRow = result.rows[0];

  // Extract product and shop info from the first row
  const {
    owner_id,
    shop_name,
    variant_id, // will not be used here
    label,
    quantity,
    base_price,
    variant_created_at,
    ...productData
  } = firstRow;

  // Collect all variants
  const variants = result.rows.map(row => ({
    id: row.variant_id,
    label: row.label,
    quantity: row.quantity,
    base_price: row.base_price,
    createdAt: row.variant_created_at
  }));

  return {
    ...productData,
    shop: {
      owner_id,
      shop_name
    },
    variants
  };
};

// Update shop details
export const updateProduct = async (productId: string, updateData: Partial<Product>): Promise<Product> => {
  // Build dynamic SET clause for update based on fields present in updateData
  const fields = [];
  const values = [];
  let idx = 1;

  for (const key of ['category_id', 'title', 'description', 'slug', 'discount_type', 'discount_amount', 'status', 'unit_type']) {
    if (updateData[key as keyof Product] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(updateData[key as keyof Product]);
      idx++;
    }
  }

  values.push(productId); // for WHERE clause
  
  const query = `
    UPDATE products
    SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = $${idx}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

export const getProducts = async ({
  status,
  shopId,
  categoryId,
  search,
  limit,
  offset
}: GetProductsParams): Promise<any> => {
  const values: any[] = [];
  const whereClauses: string[] = [];

  if (status) {
    values.push(status);
    whereClauses.push(`products.status = $${values.length}`);
  }

  if (shopId) {
    values.push(shopId);
    whereClauses.push(`products.shop_id = $${values.length}`);
  }

  if (categoryId) {
    values.push(categoryId);
    whereClauses.push(`products.category_id = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    values.push(`%${search}%`);
    whereClauses.push(`(products.title ILIKE $${values.length - 1} OR products.description ILIKE $${values.length})`);
  }

  const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Build main query
  const query = `
    SELECT products.*
    FROM products
    ${whereSQL}
    ORDER BY products.created_at DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  values.push(limit);
  values.push(offset);

  const productsResult = await pool.query(query, values);

  // Build count query with same filters
  const countQuery = `SELECT COUNT(*) FROM products ${whereSQL}`;
  const countValues = values.slice(0, values.length - 2);
  const countResult = await pool.query(countQuery, countValues);

  return {
    products: productsResult.rows,
    pagination: {
      total: parseInt(countResult.rows[0].count, 10),
      limit,
      offset
    }
  };
};

export const updateProductStatus = async (id:string, status:string): Promise<any> => {
  const query = `
    UPDATE products
    SET status = $1
    WHERE id = $2
    RETURNING status;
  `;

  const values = [status, id];
  const { rows } = await pool.query(query, values);

  const row = rows[0];
  if (!row) return null;

  return rows[0].status;
};

export default{
    createProduct,
    getProductById,
    updateProduct,
    getProducts,
    updateProductStatus
}