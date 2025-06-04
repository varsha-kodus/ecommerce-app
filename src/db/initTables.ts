import { pool } from "../config/dbConnection";

export async function initTables() {
    try{
        await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

        // Create ENUM types (only once)
        await pool.query(`DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
            CREATE TYPE user_role AS ENUM ('user', 'admin');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
            CREATE TYPE user_status AS ENUM ('active', 'inactive');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shop_status') THEN
            CREATE TYPE shop_status AS ENUM ('active', 'inactive');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'category_status') THEN
            CREATE TYPE category_status AS ENUM ('active', 'inactive');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_type') THEN
            CREATE TYPE discount_type AS ENUM ('flat', 'percentage');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status') THEN
            CREATE TYPE product_status AS ENUM ('active', 'inactive', 'out_of_stock');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unit_type') THEN
            CREATE TYPE unit_type AS ENUM ('unit', 'kg', 'litre', 'size');
            END IF;
        END$$;
        `);

        //Create the users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users(
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(30) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                role user_role NOT NULL DEFAULT 'user',
                status user_status NOT NULL DEFAULT 'active',
                profile_image VARCHAR(255),
                created_at TIMESTAMP default CURRENT_TIMESTAMP,
                updated_at TIMESTAMP default CURRENT_TIMESTAMP
            )
        `);

        console.log('Users table created (or already exists).');

         await pool.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id),
            token TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('refresh_tokens table created (or already exists).');

         await pool.query(`
            CREATE TABLE IF NOT EXISTS shops (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            owner_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            shop_name VARCHAR(40) NOT NULL,
            description TEXT,
            logo VARCHAR(255),
            address VARCHAR(255),
            status shop_status NOT NULL DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('shops table created (or already exists).');

         await pool.query(`
            CREATE TABLE IF NOT EXISTS categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            category_name VARCHAR(50) NOT NULL,
            slug VARCHAR(50) UNIQUE NOT NULL,
            parent_id UUID REFERENCES categories(id),
            status category_status NOT NULL DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('category table created (or already exists).');


        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
                category_id UUID NOT NULL REFERENCES categories(id) ON DELETE SET NULL,
                title VARCHAR(100) NOT NULL,
                description TEXT,
                slug VARCHAR(100) UNIQUE NOT NULL,
                discount_type discount_type,
                discount_amount DECIMAL(10,2),
                status product_status NOT NULL DEFAULT 'active',
                unit_type unit_type NOT NULL DEFAULT 'size',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('products table created (or already exists).');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS product_variants (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                label VARCHAR(15) NOT NULL,
                quantity INTEGER,
                base_price DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

         console.log('product_variants table created (or already exists).');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS product_gallery (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                image_url VARCHAR(255) NOT NULL,
                is_primary BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('product_gallery table created (or already exists).');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS carts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('carts table created (or already exists).');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS cart_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
                product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
                variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(10,2) NOT NULL,
                total_price DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

    console.log('cart_items table created (or already exists).');

        // return true;
    }catch(error){
        console.log('Error in initializing tables:', error);
        throw error;
    }
}

 