import { Request, Response } from 'express';
import { query } from '../config/db';

export async function getOutlets(req: Request, res: Response) {
  try {
    const { route, search, status } = req.query;

    let sql = 'SELECT * FROM outlets WHERE 1=1';
    const params: any[] = [];

    if (route && route !== 'All') {
      params.push(`%${route}%`);
      sql += ` AND route ILIKE $${params.length}`;
    }

    if (status && status !== 'All') {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (name ILIKE $${params.length} OR owner_name ILIKE $${params.length} OR phone ILIKE $${params.length} OR gstin ILIKE $${params.length})`;
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);

    const outlets = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      ownerName: row.owner_name,
      category: row.category,
      outletClass: row.outlet_class,
      route: row.route,
      beatId: row.beat_id,
      address: row.address,
      phone: row.phone,
      gstin: row.gstin,
      creditLimit: parseFloat(row.credit_limit) || 0,
      currentOutstanding: parseFloat(row.current_outstanding) || 0,
      overdueDays: row.overdue_days || 0,
      loyaltyPoints: row.loyalty_points || 0,
      lastOrderDate: row.last_order_date || 'New',
      status: row.status || 'Active',
      createdAt: row.created_at,
    }));

    return res.status(200).json({
      success: true,
      data: outlets,
    });
  } catch (error: any) {
    console.error('Error fetching outlets:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch outlets',
      error: error.message,
    });
  }
}

export async function createOutlet(req: Request, res: Response) {
  try {
    const {
      name,
      ownerName,
      category = 'General Trade',
      outletClass = 'B',
      route,
      beatId,
      address,
      phone,
      gstin,
      creditLimit = 25000,
    } = req.body;

    if (!name || !ownerName || !route || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name, Owner Name, Route, Phone, and Address are mandatory.',
      });
    }

    // Auto generate sequential outlet ID if not provided: OUT-xxx
    const countRes = await query('SELECT COUNT(*) FROM outlets');
    const nextSeq = parseInt(countRes.rows[0].count, 10) + 101;
    const generatedId = `OUT-${nextSeq}`;

    // Auto compute beat ID if not passed
    const computedBeatId =
      beatId ||
      `BEAT-${route.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}`;

    const insertResult = await query(
      `INSERT INTO outlets (
        id, name, owner_name, category, outlet_class, route, beat_id, address,
        phone, gstin, credit_limit, current_outstanding, overdue_days, loyalty_points, last_order_date, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, 0, 0, 'New', 'Active')
      RETURNING *`,
      [
        generatedId,
        name.trim(),
        ownerName.trim(),
        category,
        outletClass,
        route.trim(),
        computedBeatId,
        address.trim(),
        phone.trim(),
        gstin ? gstin.trim().toUpperCase() : null,
        creditLimit,
      ]
    );

    const row = insertResult.rows[0];

    return res.status(201).json({
      success: true,
      message: 'Outlet onboarded successfully',
      data: {
        id: row.id,
        name: row.name,
        ownerName: row.owner_name,
        category: row.category,
        outletClass: row.outlet_class,
        route: row.route,
        beatId: row.beat_id,
        address: row.address,
        phone: row.phone,
        gstin: row.gstin,
        creditLimit: parseFloat(row.credit_limit) || 0,
        currentOutstanding: parseFloat(row.current_outstanding) || 0,
        overdueDays: row.overdue_days || 0,
        loyaltyPoints: row.loyalty_points || 0,
        lastOrderDate: row.last_order_date,
        status: row.status,
      },
    });
  } catch (error: any) {
    console.error('Error creating outlet:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create outlet',
      error: error.message,
    });
  }
}
