import { pool } from '../config/dbConnection'; 

export interface Shop {
  id: string;
  owner_id: string;
  shop_name: string;
  description?: string;
  logo?: string;
  address?: string;
  status: "active" | "inactive";
  created_at?: string;
  updated_at?: string;
}

export const getShopByOwnerId = async (ownerId: string): Promise<Shop | null> => {
  const result = await pool.query("SELECT * FROM shops WHERE owner_id = $1", [ownerId]);
  return result.rows[0] || null;
};

export const getShopById = async (shopId: string): Promise<Shop | null> => {
  const result = await pool.query("SELECT * FROM shops WHERE id = $1", [shopId]);
  return result.rows[0] || null;
};

export const createShop = async (shopData: Partial<Shop>): Promise<Shop> => {
  const { owner_id, shop_name, description, logo, address } = shopData;
  const result = await pool.query(
    `INSERT INTO shops (owner_id, shop_name, description, logo, address)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, shop_name, description, logo, address, status, owner_id`,
    [owner_id, shop_name, description, logo, address]
  );
  return result.rows[0];
};

// Update shop details
export const updateShop = async (shopId: string, updateData: Partial<Shop>): Promise<Shop> => {
  // Build dynamic SET clause for update based on fields present in updateData
  const fields = [];
  const values = [];
  let idx = 1;

  for (const key of ['shop_name', 'description', 'logo', 'address']) {
    if (updateData[key as keyof Shop] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(updateData[key as keyof Shop]);
      idx++;
    }
  }

  values.push(shopId); // for WHERE clause

  console.log(fields,'fields');
  
  const query = `
    UPDATE shops
    SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = $${idx}
    RETURNING id, owner_id, shop_name, description, logo, address, status, created_at, updated_at
  `;

  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

export default{
    getShopByOwnerId,
    createShop,
    updateShop,
    getShopById
}