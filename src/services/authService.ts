import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from '../config/dbConnection'; 

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: string;
}

interface LoginInput {
  email: string;
  password: string;
}

 const register = async ({ name, email, password, role }: RegisterInput) => {
    const query = `SELECT 1 FROM users WHERE email = $1 LIMIT 1`;
    const userExists = await pool.query(query, [email]);

    if (userExists.rowCount !== null && userExists.rowCount > 0) {
        throw new Error("User with this email already exists!");
    }

    // Hash password
   const hashedPassword = await bcrypt.hash(password, 10);

   const query1 = `
    INSERT INTO users (name, email, password, role)
    VALUES ($1, $2, $3, COALESCE($4::user_role, 'user'))
    RETURNING id, name, email, role, status, created_at
    `;

    const user = (await pool.query(query1, [name, email, hashedPassword, role ?? null])).rows[0];

    return { id: user['id'], name:user['name'], email: user['email'], role: user['role'], status: user['status'] };
  
}

const login = async ({ email, password }: LoginInput) => {
    
    
    const query = `SELECT * FROM users WHERE email = $1 LIMIT 1`;
    const user = (await pool.query(query, [email])).rows[0];

    if (!user) throw new Error("Invalid email or password");

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid email or password");

    
    // Generate JWT
    const accessToken = jwt.sign(
        { user: { id: user.id, name: user.name, email: user.email } },
        process.env.ACCESS_TOKEN_SECRET!,
        { expiresIn: "1day" }
    );

    // Generate Refresh Token
    const refreshToken = jwt.sign(
    { user: { id: user.id } }, // keep payload minimal
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: "7d" } // longer-lived token
    );

     return { accessToken , refreshToken,  user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    }};
}

export default{
    register,
    login
}