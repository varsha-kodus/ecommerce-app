import { pool } from '../config/dbConnection'; 

 interface Shop {
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

interface GetShopsParams {
  status: string | undefined;
  ownerId: string | undefined;
  limit: number;
  offset: number;
}

const getShopByOwnerId = async (ownerId: string): Promise<Shop | null> => {
  const result = await pool.query("SELECT * FROM shops WHERE owner_id = $1", [ownerId]);
  return result.rows[0] || null;
};

const getShopById = async (shopId: string): Promise<any | null> => {
  const result = await pool.query(
    `
    SELECT 
      shops.*, 
      users.id AS owner_id, 
      users.name AS owner_name, 
      users.email AS owner_email
    FROM shops
    JOIN users ON shops.owner_id = users.id
    WHERE shops.id = $1
    `,
    [shopId]
  );

  const row = result.rows[0];
  if (!row) return null;

  const { owner_id, owner_name, owner_email, ...shopData } = row;

  return {
    ...shopData,
    owner: {
      id: owner_id,
      name: owner_name,
      email: owner_email
    }
  };
};


const createShop = async (shopData: Partial<Shop>): Promise<Shop> => {
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
const updateShop = async (shopId: string, updateData: Partial<Shop>): Promise<Shop> => {
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
  
  const query = `
    UPDATE shops
    SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = $${idx}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

const getShops = async ({
  status,
  ownerId,
  limit,
  offset
}: GetShopsParams): Promise<any> => {
  const values: any[] = [];
  const whereClauses: string[] = [];

  if (status) {
    values.push(status);
    whereClauses.push(`status = $${values.length}`);
  }

  if (ownerId) {
    values.push(ownerId);
    whereClauses.push(`owner_id = $${values.length}`);
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Build main query
  const shopsQuery = `
    SELECT * FROM shops
    ${whereSQL}
    ORDER BY created_at DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;
  values.push(limit);
  values.push(offset);

  const shopsResult = await pool.query(shopsQuery, values);

  // Build count query with same filters
  const countQuery = `SELECT COUNT(*) FROM shops ${whereSQL}`;
  const countValues = values.slice(0, values.length - 2);
  const countResult = await pool.query(countQuery, countValues);

  return {
    shops: shopsResult.rows,
    pagination: {
      total: parseInt(countResult.rows[0].count, 10),
      limit,
      offset
    }
  };
};

const updateShopStatus = async (id:string, status:string): Promise<any> => {
  const query = `
    UPDATE shops
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
    getShopByOwnerId,
    createShop,
    updateShop,
    getShopById,
    getShops,
    updateShopStatus
}