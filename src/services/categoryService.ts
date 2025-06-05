import { log } from 'console';
import { pool } from '../config/dbConnection'; 

 interface Category {
    id:string;
    category_name:string;
    slug:string;
    parent_id?:string;
    status?: "active" | "inactive";
    created_at?: string;
    updated_at?: string;
    parent:object|null;
 }

 interface NestedCategory {
  id: string;
  category_name: string;
  slug: string;
  children: NestedCategory[];
}

 const createCategory = async (CategoryData: Partial<Category>): Promise<any> => {
    const { category_name, slug, parent_id } = CategoryData;
  const result = await pool.query(
        `INSERT INTO categories (category_name, slug, parent_id)
        VALUES ($1, $2, $3)
        RETURNING *`,
        [category_name, slug, parent_id]
    );
    return result.rows[0];
}

const getCategoryById = async (id: string): Promise<Category | null> => {
    const query = `
    SELECT 
      c.id, 
      c.category_name, 
      c.slug, 
      c.created_at, 
      c.updated_at,
      c.status,
      p.id AS parent_id,
      p.category_name AS parent_name
    FROM categories c
    LEFT JOIN categories p ON c.parent_id = p.id
    WHERE c.id = $1
  `;
  
  const result = await pool.query(query, [id]);

   if (result.rows.length === 0) return null;

  const category = result.rows[0];

  const categoryData = {
    id: category.id,
    category_name: category.category_name,
    slug: category.slug,
    status: category.status,
    parent: category.parent_id
      ? {
          id: category.parent_id,
          category_name: category.parent_name,
        }
      : null,
    created_at: category.created_at,
    updated_at: category.updated_at,
  };

  return categoryData;
};

const updateCategory =  async (categoryId: string, updateData: Partial<Category>): Promise<Category> => {
    // Build dynamic SET clause for update based on fields present in updateData
      const fields = [];
      const values = [];
      let idx = 1;
    
      for (const key of ['category_name', 'slug', 'parent_id']) {
        if (updateData[key as keyof Category] !== undefined) {
          fields.push(`${key} = $${idx}`);
          values.push(updateData[key as keyof Category]);
          idx++;
        }
      }
    
      values.push(categoryId); // for WHERE clause
      
      const query = `
        UPDATE categories
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${idx}
        RETURNING *
      `;
    
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    }
    
    const getCategories = async (flat: any): Promise<any> => {
        console.log(flat,'flat');
        
        var query = `SELECT * FROM categories`;

        const result = await pool.query(query);

        if (result.rows.length === 0) return null;
        
    if(flat){
        return result.rows;
    }else{
        const map = new Map<string, NestedCategory>();
        const roots: NestedCategory[] = [];

         for (const row of result.rows) {
            map.set(row.id, {
            id: row.id,
            category_name: row.category_name,
            slug: row.slug,
            children: [],
            });
        }

        // Build the tree
        for (const row of result.rows) {
            const category = map.get(row.id)!;
            if (row.parent_id) {
            const parent = map.get(row.parent_id);
                if (parent) {
                    parent.children.push(category);
                }
            } else {
                roots.push(category);
            }
        }

        return roots;
    }
};

 const updateCategoryStatus = async (id:string, status:string): Promise<any> => {
  const query = `
    UPDATE categories
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

export default {
    createCategory,
    getCategoryById,
    updateCategory,
    getCategories,
    updateCategoryStatus
}