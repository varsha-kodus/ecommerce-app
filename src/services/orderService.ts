import { pool } from '../config/dbConnection'; 

const createOrder = async (userId: string, billingAddress: string) : Promise<any> => {
     const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const cartRes = await client.query(
            'SELECT * FROM cart_items WHERE user_id = $1',
            [userId]
        );
        const cartItems = cartRes.rows;
        if (cartItems.length === 0) {
            throw new Error('Cart is empty');
        }

        for (const item of cartItems) {
            const stockRes = await client.query(
                'SELECT quantity FROM product_variants WHERE id = $1',
                [item.variant_id]
            );
            if (stockRes.rows.length === 0 || stockRes.rows[0].quantity < item.quantity) {
                throw new Error(`Insufficient stock for product ${item.product_id}`);
            }
        }

        for (const item of cartItems) {
            await client.query(
                'UPDATE product_variants SET quantity = quantity - $1 WHERE id = $2',
                [item.quantity, item.variant_id]
            );
        }

        const totalAmount = cartItems.reduce((total, item) => total + parseFloat(item.total_price), 0);
        const now = Date.now(); // Milliseconds timestamp
        const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const orderNumber = `ORD-${now}-${rand}`;

        const orderRes = await client.query(
        `INSERT INTO orders (user_id, order_number, total_amount, billing_address)
        VALUES ($1, $2, $3, $4) RETURNING *`,
        [userId, orderNumber, totalAmount, billingAddress]
        );

        const order = orderRes.rows[0];
        const orderItems = [];

        for (const item of cartItems) {
            const itemRes = await client.query(
                `INSERT INTO order_items ( order_id, product_id, shop_id, variant_id, quantity, unit_price, total_price)
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [order.id, item.product_id, item.shop_id, item.variant_id, item.quantity, item.unit_price, item.total_price]
            );
            orderItems.push(itemRes.rows[0]);
        }

        await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
        await client.query('COMMIT');

        return { ...order, items: orderItems };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

const getOrders = async (userId: string, status?: string) : Promise<any> => {
    const values: any[] = [userId];
     let query = `
    SELECT 
      o.id AS order_id,
      o.order_number,
      o.total_amount,
      o.order_status,
      o.payment_status,
      o.created_at,
      oi.product_id,
      oi.variant_id,
      oi.shop_id,
      oi.quantity,
      oi.unit_price,
      oi.total_price
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.user_id = $1
  `;

  if (status) {
    values.push(status);
    query += ` AND o.order_status = $2`;
  }

  query += ` ORDER BY o.created_at DESC`;

  const result = await pool.query(query, values);

  // Group rows by order_id and nest items
  const ordersMap: any = {};

  result.rows.forEach(row => {
    
    const orderId = row.order_id;
    if (!ordersMap[orderId]) {
      ordersMap[orderId] = {
        id: orderId,
        order_number: row.order_number,
        total_amount: row.total_amount,
        order_status: row.order_status,
        payment_status: row.payment_status,
        created_at: row.created_at,
        items: [],
      };
    }

    // If product_id exists, add item (in case LEFT JOIN returns null)
    if (row.product_id) {
      ordersMap[orderId].items.push({
        product_id: row.product_id,
        variant_id: row.variant_id,
        shop_id: row.shop_id,
        quantity: row.quantity,
        unit_price: row.unit_price,
        total_price: row.total_price,
      });
    }
  });
  
  return Object.values(ordersMap);
}

const getOrderById = async (orderId:string) : Promise<any> => {
      let query = `
    SELECT 
      o.id AS order_id,
      o.order_number,
      o.total_amount,
      o.order_status,
      o.payment_status,
      o.created_at,
      o.user_id,
      oi.product_id,
      oi.variant_id,
      oi.shop_id,
      oi.quantity,
      oi.unit_price,
      oi.total_price
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.id = $1
  `;

  const result = await pool.query(query, [orderId]);

   if (result.rows.length === 0) {
        return null; // Or throw an error if you prefer
    }

     const row = result.rows[0];

    const order = {
        id: row.order_id,
        order_number: row.order_number,
        user_id: row.user_id,
        total_amount: row.total_amount,
        order_status: row.order_status,
        payment_status: row.payment_status,
        billing_address: row.billing_address,
        created_at: row.created_at,
        items: [] as any[],
    };

    for (const r of result.rows) {
        if (r.product_id) {
            order.items.push({
                product_id: r.product_id,
                variant_id: r.variant_id,
                shop_id: r.shop_id,
                quantity: r.quantity,
                unit_price: r.unit_price,
                total_price: r.total_price,
            });
        }
    }

    return order;
}

const getAllOrders = async (
  userId?: string,
  status?: string,
  shopId?: string
): Promise<any> => {
    const values: any[] = [];
    let conditions: string[] = [];

    let query = `
        SELECT 
        o.id AS order_id,
        o.order_number,
        o.user_id,
        o.total_amount,
        o.order_status,
        o.payment_status,
        o.created_at,
        oi.product_id,
        oi.variant_id,
        oi.shop_id,
        oi.quantity,
        oi.unit_price,
        oi.total_price
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
    `;

    // Filters
    if (userId) {
        values.push(userId);
        conditions.push(`o.user_id = $${values.length}`);
    }

    if (status) {
        values.push(status);
        conditions.push(`o.order_status = $${values.length}`);
    }

    if (shopId) {
        values.push(shopId);
        conditions.push(`oi.shop_id = $${values.length}`);
    }

    if (conditions.length > 0) {
        query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY o.created_at DESC`;

    const result = await pool.query(query, values);

    // Group by order_id
    const ordersMap: any = {};

    result.rows.forEach(row => {
        const orderId = row.order_id;
        if (!ordersMap[orderId]) {
        ordersMap[orderId] = {
            id: orderId,
            order_number: row.order_number,
            user_id: row.user_id,
            total_amount: row.total_amount,
            order_status: row.order_status,
            payment_status: row.payment_status,
            created_at: row.created_at,
            items: [],
        };
        }

        if (row.product_id) {
        ordersMap[orderId].items.push({
            product_id: row.product_id,
            variant_id: row.variant_id,
            shop_id: row.shop_id,
            quantity: row.quantity,
            unit_price: row.unit_price,
            total_price: row.total_price,
        });
        }
    });

    return Object.values(ordersMap);
};

const updateOrderStatus = async (orderId: string, status: string): Promise<any> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get the current status
    const currentStatusQuery = `
      SELECT order_status
      FROM orders
      WHERE id = $1
      FOR UPDATE
    `;
    const currentStatusResult = await client.query(currentStatusQuery, [orderId]);
    const currentOrder = currentStatusResult.rows[0];

    if (!currentOrder) {
      await client.query('ROLLBACK');
      return null;
    }

    const previousStatus = currentOrder.order_status;

    // Update the status
    const updateQuery = `
      UPDATE orders
      SET order_status = $1
      WHERE id = $2
      RETURNING order_status;
    `;
    const updateResult = await client.query(updateQuery, [status, orderId]);
    const updatedOrder = updateResult.rows[0];

    // Only restore stock if transitioning from a non-cancelled status → 'cancelled'
    if (status === 'cancelled' && previousStatus !== 'cancelled') {
      const itemsQuery = `
        SELECT variant_id, quantity
        FROM order_items
        WHERE order_id = $1
      `;
      const itemsResult = await client.query(itemsQuery, [orderId]);

      for (const item of itemsResult.rows) {
        await client.query(
          `UPDATE product_variants
           SET quantity = quantity + $1
           WHERE id = $2`,
          [item.quantity, item.variant_id]
        );
      }
    }

    await client.query('COMMIT');
    return updatedOrder.order_status;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default{
    createOrder,
    getOrders,
    getOrderById,
    getAllOrders,
    updateOrderStatus
}