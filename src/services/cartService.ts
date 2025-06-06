import { pool } from '../config/dbConnection'; 

interface Cart{
    id: string,
    user_id : string;
    created_at?: string;
    updated_at?: string;
}

interface CartItem{
    userId: string;
    cartId: string | undefined;
    productId: string;
    variantId: string;
    quantity: number;
}

const createCartIfNotExists = async (userId: string): Promise<Cart|null> => {
    const result = await pool.query(`
        SELECT * FROM carts WHERE user_id = $1`,[userId]
    );

   if (result.rows.length > 0) return result.rows[0];

    const newCart = await pool.query(
        `INSERT INTO carts (user_id)
        VALUES ($1)
        RETURNING *`,
        [userId]
    );
    return newCart.rows[0];
}

const addCartItem = async ({
  userId,
  cartId,
  productId,
  variantId,
  quantity,
}: CartItem) => {

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    //Get product discount (optional)
    const productRes = await client.query(
      `SELECT id,discount_type, discount_amount, status FROM products WHERE id = $1 LIMIT 1`,
      [productId]
    );
    if (productRes.rows.length === 0) throw new Error("Product not found");
    
    const { discount_type, discount_amount, status } = productRes.rows[0];
     if (status === 'inactive') {
      throw {
        success: false,
        message: "This product is inactive and cannot be added to the cart",
      };
    }else if(status === 'out_of_stock'){
      throw {
        success: false,
        message: "This product is out_of_stock and cannot be added to the cart",
      };
    }

    // Get variant price
    const variantRes = await client.query(
      `SELECT id, base_price, quantity FROM product_variants WHERE id = $1 LIMIT 1`,
      [variantId]
    );
    if (variantRes.rows.length === 0) throw new Error("Variant not found");

    if (variantRes.rows[0].quantity < quantity) {
        throw {
            success: false,
            message: "Insufficient stock available for this variant",
        };
    }


    const basePrice = parseFloat(variantRes.rows[0].base_price); // original price
    let unitPrice = basePrice;

    if (discount_type === "percentage") {
        const discountAmount = (basePrice * discount_amount) / 100;
        unitPrice = basePrice - discountAmount;
    } else if (discount_type === "flat") {
        unitPrice = basePrice - discount_amount;
    }

    if (unitPrice < 0) unitPrice = 0;

    const total_price = unitPrice * quantity;

    //Get shopId
    const shopRes = await client.query(
      `SELECT shop_id FROM products WHERE id = $1`,
      [productId]
    );
    const shopId = shopRes.rows[0].shop_id;

    //Insert into cart_items
    const cariItemRes = await client.query(
      `INSERT INTO cart_items
      (user_id,cart_id, product_id, shop_id, variant_id, quantity, unit_price, total_price)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        userId,
        cartId,
        productId,
        shopId,
        variantId,
        quantity,
        unitPrice.toFixed(2),
        total_price.toFixed(2),
      ]
    );

    await client.query("COMMIT");
    return cariItemRes.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const getCartItem = async (userId: string): Promise<Cart|any> => {
    const result = await pool.query(
    `SELECT
        c.id AS cart_id,
        ci.id AS cart_item_id,
        ci.user_id,
        ci.product_id,
        p.title AS product_title,
        p.shop_id,
        ci.variant_id,
        v.label AS variant_label,
        v.base_price,
        ci.quantity,
        ci.unit_price,
        ci.total_price
    FROM carts c
    JOIN cart_items ci ON ci.user_id = c.user_id
    JOIN products p ON ci.product_id = p.id
    JOIN product_variants v ON ci.variant_id = v.id
    WHERE c.user_id = $1`,
    [userId]
    );

    const rows = result.rows;

    if (rows.length === 0) {
    // No items in cart or no cart found for user
    return {
        cart: "Your cart is empty"
    };
    }

    const cartId = rows[0].cart_id;

    const items = rows.map(row => ({
        id: row.cart_item_id,
        product: {
            id: row.product_id,
            title: row.product_title,
            shop_id: row.shop_id,
        },
        variant: {
            id: row.variant_id,
            label: row.variant_label,
            base_price: parseFloat(row.base_price),
        },
        quantity: row.quantity,
        unit_price: parseFloat(row.unit_price),
        total_price: parseFloat(row.total_price),
    }));

    const total_cart_value = items.reduce((sum, item) => sum + item.total_price, 0);

    return {
        cart: {
            user_id: userId,
            cart_id: cartId,
            items,
            total_cart_value,
        }
    };

}

const updateCartItem = async (cartItemId: string, quantity: number): Promise<any> => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Step 1: Get current cart item details
        const cartItemRes = await client.query(
        `SELECT quantity, unit_price, variant_id FROM cart_items WHERE id = $1 LIMIT 1`,
        [cartItemId]
        );

        if (cartItemRes.rowCount === 0) {
        throw new Error("Cart item not found");
        }

        const oldQuantity = cartItemRes.rows[0].quantity;
        const unitPrice = parseFloat(cartItemRes.rows[0].unit_price);
        const variantId = cartItemRes.rows[0].variant_id;

        const quantityDiff = quantity - oldQuantity;

        // Step 2: If increasing, check stock
        if (quantityDiff > 0) {
        const variantRes = await client.query(
            `SELECT quantity FROM product_variants WHERE id = $1`,
            [variantId]
        );

        if (variantRes.rowCount === 0) {
            throw new Error("Variant not found");
        }

        const availableQty = variantRes.rows[0].quantity;
        if (availableQty < quantityDiff) {
            throw new Error("Insufficient stock for the variant");
        }
        }

        const totalPrice = quantity * unitPrice;

        // Step 3: Update cart item
        const updateRes = await client.query(
        `UPDATE cart_items
        SET quantity = $1, total_price = $2
        WHERE id = $3
        RETURNING id, quantity, total_price`,
        [quantity, totalPrice, cartItemId]
        );

        await client.query("COMMIT");

        return {
        cart_item: updateRes.rows[0],
        };

    } catch (error:any) {
        await client.query("ROLLBACK");
        throw {
        success: false,
        message: error.message || "Failed to update cart item",
        };
    } finally {
        client.release();
    }
};

const deleteCartItem = async (userId: string, cartItemId: string): Promise<any> => {
    // Fetch quantity and variant_id before deleting
    const itemRes = await pool.query(
        `SELECT quantity, variant_id FROM cart_items WHERE id = $1 AND user_id = $2`,
        [cartItemId.trim(), userId.trim()]
    );

    if (itemRes.rowCount === 0) {
        throw {
        success: false,
        message: "Cart item not found or does not belong to user",
        };
    }

    //Delete the cart item
    const deleteRes = await pool.query(
        `DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING id`,
        [cartItemId.trim(), userId.trim()]
    );

    return deleteRes.rows[0];
}

const deleteAllCartItem = async (userId: string): Promise<any> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Get all cart items for user
    const itemsRes = await client.query(
      `SELECT variant_id, quantity FROM cart_items WHERE user_id = $1`,
      [userId.trim()]
    );

    if (itemsRes.rowCount === 0) {
      throw {
        success: false,
        message: "No cart items found for this user",
      };
    }

    // Delete all cart items for this user
    const deleteRes = await client.query(
      `DELETE FROM cart_items WHERE user_id = $1 RETURNING id`,
      [userId.trim()]
    );

    await client.query("COMMIT");

    return {
      success: true,
      message: "All cart items removed and stock restored",
      deleted_items: deleteRes.rows.map(row => row.id),
    };
  } catch (error:any) {
    await client.query("ROLLBACK");
    throw {
      success: false,
      message: error.message || "Failed to clear cart items",
    };
  } finally {
    client.release();
  }
};

export default{
    createCartIfNotExists,
    addCartItem,
    getCartItem,
    updateCartItem,
    deleteCartItem,
    deleteAllCartItem
}