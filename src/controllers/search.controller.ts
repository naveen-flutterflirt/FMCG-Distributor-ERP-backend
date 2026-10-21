import { Request, Response } from 'express';
import { query } from '../config/db';

/**
 * GET /api/search?q=xyz
 * Global search across:
 * - Outlets (name, code, gstin, owner)
 * - Products / SKUs (sku, name, category, hsn)
 * - Orders / Invoices (id, outlet_name, route)
 * - Salesmen (name, beat, phone)
 */
export async function handleGlobalSearch(req: Request, res: Response) {
  try {
    const q = (req.query.q as string || '').trim();

    if (!q || q.length < 2) {
      return res.status(200).json({
        success: true,
        data: {
          outlets: [],
          products: [],
          orders: [],
          salesmen: [],
        },
      });
    }

    const pattern = `%${q}%`;

    // 1. Search Outlets
    const outletsRes = await query(
      `SELECT id, name, route, owner_name, phone, current_outstanding, status
       FROM outlets
       WHERE name ILIKE $1 OR id ILIKE $1 OR phone ILIKE $1 OR gstin ILIKE $1
       LIMIT 5`,
      [pattern]
    );

    // 2. Search Products / SKUs
    const productsRes = await query(
      `SELECT id, sku, category, mrp, godown_stock, company
       FROM products
       WHERE sku ILIKE $1 OR category ILIKE $1 OR company ILIKE $1
       LIMIT 5`,
      [pattern]
    );

    // 3. Search Orders / Invoices
    const ordersRes = await query(
      `SELECT id, outlet_name, route, total_value, checks, status
       FROM orders
       WHERE id ILIKE $1 OR outlet_name ILIKE $1 OR route ILIKE $1
       LIMIT 5`,
      [pattern]
    );

    // 4. Search Salesmen
    const salesmenRes = await query(
      `SELECT id, name, beat, phone, status
       FROM salesmen
       WHERE name ILIKE $1 OR beat ILIKE $1 OR phone ILIKE $1
       LIMIT 5`,
      [pattern]
    );

    return res.status(200).json({
      success: true,
      data: {
        outlets: outletsRes.rows,
        products: productsRes.rows,
        orders: ordersRes.rows,
        salesmen: salesmenRes.rows,
      },
    });
  } catch (error: any) {
    console.error('Global search error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to execute global search',
      error: error.message,
    });
  }
}
