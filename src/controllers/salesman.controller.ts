import { Request, Response } from 'express';
import { query } from '../config/db';

export async function getSalesmen(req: Request, res: Response) {
  try {
    const result = await query(
      'SELECT * FROM salesmen ORDER BY created_at DESC'
    );

    const salesmen = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      beat: row.beat,
      targetSales: parseFloat(row.target_sales) || 0,
      dailyOutletsTarget: row.daily_outlets_target || 32,
      sales: parseFloat(row.sales) || 0,
      productive: row.productive || 0,
      lpc: parseFloat(row.lpc) || 0,
      visited: row.visited || '0/32',
      mustSell: row.must_sell || '0/5',
      status: row.status || 'Active',
      createdAt: row.created_at,
    }));

    return res.status(200).json({
      success: true,
      data: salesmen,
    });
  } catch (error: any) {
    console.error('Error fetching salesmen:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch salesmen',
      error: error.message,
    });
  }
}

export async function createSalesman(req: Request, res: Response) {
  try {
    const {
      name,
      phone,
      email,
      beat,
      targetSales = 500000,
      dailyOutletsTarget = 32,
    } = req.body;

    if (!name || !phone || !beat) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone number, and assigned beat/route are required.',
      });
    }

    // Check if phone number already exists
    const existing = await query('SELECT id FROM salesmen WHERE phone = $1', [
      phone.trim(),
    ]);

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A salesman with this phone number already exists.',
      });
    }

    const insertResult = await query(
      `INSERT INTO salesmen (
        name, phone, email, beat, target_sales, daily_outlets_target, visited, must_sell
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        name.trim(),
        phone.trim(),
        email ? email.trim() : null,
        beat.trim(),
        targetSales,
        dailyOutletsTarget,
        `0/${dailyOutletsTarget}`,
        '0/5',
      ]
    );

    const row = insertResult.rows[0];

    return res.status(201).json({
      success: true,
      message: 'Salesman added successfully',
      data: {
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        beat: row.beat,
        targetSales: parseFloat(row.target_sales) || 0,
        dailyOutletsTarget: row.daily_outlets_target,
        sales: parseFloat(row.sales) || 0,
        productive: row.productive || 0,
        lpc: parseFloat(row.lpc) || 0,
        visited: row.visited,
        mustSell: row.must_sell,
        status: row.status,
      },
    });
  } catch (error: any) {
    console.error('Error creating salesman:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create salesman',
      error: error.message,
    });
  }
}
