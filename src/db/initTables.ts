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
        // return true;
    }catch(error){
        console.log('Error in initializing tables:', error);
        throw error;
    }
}
 