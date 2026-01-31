// /api/health/db.ts

import { pool } from "@/lib/db";


export async function GET() {
    const { rows } = await pool.query('SELECT 1 as ok');
    return Response.json({ db: rows[0].ok === 1 });
}
