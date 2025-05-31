import { Pool } from 'pg';

import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection(){
    try{
        const res = await pool.query('Select NOW()');
        // await pool.end();

        console.log('Database connected...');
        
    }catch (error) {
        console.error('Database connection error:', error);
    } 
}

export { pool, testConnection };