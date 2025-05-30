import pg from 'pg';
const { Pool } = pg

import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
//   user: 'dbuser',
//   password: 'secretpassword',
//   host: 'database.server.com',
//   port: 3211,
//   database: 'mydb',
});

async function testConnection(){
    try{
        // const client = pool.connect();

        await pool.query("CREATE TABLE users(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name varchar(20))");
        await pool.end();

        console.log('Database connected...');
        
        
        // const res = (await client).query('Select NOW()');
        // console.log('Database connected:',res);
        
    }catch (error) {
        console.error('Database connection error:', error);
    } 
}

export default testConnection;