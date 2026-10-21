import { Request, Response } from 'express';
import { query } from '../config/db';

export async function getProducts(req: Request, res: Response) {
  try {
    const { company, search, status } = req.query;

    let sql = 'SELECT * FROM products WHERE 1=1';
    const params: any[] = [];

    if (company && company !== 'All') {
      params.push(`%${company}%`);
      sql += ` AND company ILIKE $${params.length}`;
    }

    if (status && status !== 'All') {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (sku ILIKE $${params.length} OR batch ILIKE $${params.length} OR category ILIKE $${params.length})`;
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);

    const products = result.rows.map((row) => ({
      id: row.id,
      sku: row.sku,
      company: row.company,
      category: row.category,
      batch: row.batch,
      mrp: parseFloat(row.mrp) || 0,
      purchaseRate: parseFloat(row.purchase_rate) || 0,
      sellRate: parseFloat(row.sell_rate) || 0,
      godownStock: parseInt(row.godown_stock, 10) || 0,
      vanStock: parseInt(row.van_stock, 10) || 0,
      totalStock: (parseInt(row.godown_stock, 10) || 0) + (parseInt(row.van_stock, 10) || 0),
      coverDays: parseInt(row.cover_days, 10) || 15,
      expiryDate: row.expiry_date,
      status: row.status || 'Healthy',
      createdAt: row.created_at,
    }));

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message,
    });
  }
}

export async function createProduct(req: Request, res: Response) {
  try {
    const {
      sku,
      company,
      category = 'General',
      batch,
      mrp,
      purchaseRate = 0,
      sellRate = 0,
      godownStock = 0,
      coverDays = 15,
      expiryDate,
    } = req.body;

    if (!sku || !company || !batch || !mrp || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'SKU Name, FMCG Company, Batch No, MRP, and Expiry Date are mandatory.',
      });
    }

    // Auto generate sequential SKU ID: SKU-xxx
    const countRes = await query('SELECT COUNT(*) FROM products');
    const nextSeq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(3, '0');
    const generatedId = `SKU-${nextSeq}`;

    // Auto determine status based on cover days and stock
    let status = 'Healthy';
    if (godownStock < 50 || coverDays < 5) {
      status = 'Low Cover (< 5 d)';
    }

    const insertResult = await query(
      `INSERT INTO products (
        id, sku, company, category, batch, mrp, purchase_rate, sell_rate,
        godown_stock, van_stock, cover_days, expiry_date, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, $10, $11, $12)
      RETURNING *`,
      [
        generatedId,
        sku.trim(),
        company.trim(),
        category.trim(),
        batch.trim().toUpperCase(),
        mrp,
        purchaseRate,
        sellRate,
        godownStock,
        coverDays,
        expiryDate.trim(),
        status,
      ]
    );

    const row = insertResult.rows[0];

    return res.status(201).json({
      success: true,
      message: 'Product & initial batch added successfully',
      data: {
        id: row.id,
        sku: row.sku,
        company: row.company,
        category: row.category,
        batch: row.batch,
        mrp: parseFloat(row.mrp) || 0,
        purchaseRate: parseFloat(row.purchase_rate) || 0,
        sellRate: parseFloat(row.sell_rate) || 0,
        godownStock: parseInt(row.godown_stock, 10) || 0,
        vanStock: parseInt(row.van_stock, 10) || 0,
        totalStock: (parseInt(row.godown_stock, 10) || 0) + (parseInt(row.van_stock, 10) || 0),
        coverDays: parseInt(row.cover_days, 10) || 15,
        expiryDate: row.expiry_date,
        status: row.status,
      },
    });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message,
    });
  }
}
