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
        { user: { id: user.id, name: user.name, email: user.email, role: user.role } },
        process.env.ACCESS_TOKEN_SECRET!,
        { expiresIn: "15min" }
    );

    // Generate Refresh Token
    const refreshToken = jwt.sign(
    { user: { id: user.id } }, // keep payload minimal
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: "7d" } // longer-lived token
    );

    const queryRefreshToken = `
        INSERT INTO refresh_tokens (user_id, token)
        VALUES ($1, $2)
        RETURNING *;

    `;

    await pool.query(queryRefreshToken, [user.id, refreshToken]);

     return { accessToken , refreshToken,  user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    }};
}

const currentUser = async (id: string) => {
    const query = `SELECT * FROM users WHERE id = $1 LIMIT 1`;
    const user = (await pool.query(query, [id])).rows[0];

    return { id: user['id'], name:user['name'], email: user['email'], role: user['role'], status: user['status'], profile_image: user['profile_image'] };
}

export const refreshAccessToken = async (refreshToken: string) => {
  const result = await pool.query(
    "SELECT * FROM refresh_tokens WHERE token = $1",
    [refreshToken]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid refresh token");
  }

  // Optionally delete used refresh token (rotation strategy)
  await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [refreshToken]);

  // Verify refresh token
  const decoded = jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET!
  ) as { user: { id: string; name: string; email: string; role:string } };

  const user = decoded.user;

  // Generate new access token
  const newAccessToken = jwt.sign(
    { user },
    process.env.ACCESS_TOKEN_SECRET!,
    { expiresIn: "15m" }
  );

  // Generate new refresh token
  const newRefreshToken = jwt.sign(
    { user: { id: user.id } }, // keep payload small
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: "7d" }
  );

  // Save new refresh token
  await pool.query(
    "INSERT INTO refresh_tokens (token, user_id) VALUES ($1, $2)",
    [newRefreshToken, user.id]
  );

  return { newAccessToken, newRefreshToken };
};

export const logout = async (refreshToken: string, userId: string) => {
    if(refreshToken){
        const result = await pool.query(
            "SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2",
            [refreshToken, userId]
        );

        if (result.rows.length === 0) {
        throw new Error("Refresh token not found or already deleted.");
        }
        
        await pool.query(
        "DELETE FROM refresh_tokens WHERE token = $1 AND user_id = $2",
        [refreshToken, userId]
        );
    }else{        
         await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);
    }

    // return true;
}

export default{
    register,
    login,
    currentUser,
    refreshAccessToken,
    logout
}