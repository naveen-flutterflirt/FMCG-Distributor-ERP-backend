import { Request, Response } from 'express';
import { query } from '../config/db';

/**
 * GET /api/schemes
 * Returns all trade schemes with live budget utilization metrics
 */
export async function getSchemes(req: Request, res: Response) {
  try {
    const { company, status, type } = req.query;

    let sql = 'SELECT * FROM schemes WHERE 1=1';
    const params: any[] = [];

    if (company && company !== 'All') {
      params.push(`%${company}%`);
      sql += ` AND company ILIKE $${params.length}`;
    }

    if (status && status !== 'All') {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (type && type !== 'All') {
      params.push(type);
      sql += ` AND scheme_type = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);

    // Compute live scheme budget aggregates
    let totalBudget = 0;
    let totalUtilized = 0;

    for (const s of result.rows) {
      totalBudget += parseFloat(s.budget) || 0;
      totalUtilized += parseFloat(s.utilized) || 0;
    }

    const schemes = result.rows.map((row) => ({
      id: row.id,
      company: row.company,
      title: row.title,
      type: row.scheme_type,
      rule: row.rule_description,
      fundedBy: row.funded_by,
      budget: parseFloat(row.budget) || 0,
      utilized: parseFloat(row.utilized) || 0,
      utilizationPercent:
        parseFloat(row.budget) > 0
          ? Math.round(((parseFloat(row.utilized) || 0) / parseFloat(row.budget)) * 100)
          : 0,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      outletFilter: row.outlet_filter,
      discountPercent: parseFloat(row.discount_percent) || 0,
      discountAmount: parseFloat(row.discount_amount) || 0,
      freeSku: row.free_sku,
      status: row.status,
    }));

    return res.status(200).json({
      success: true,
      data: {
        schemes,
        summary: {
          totalBudget,
          totalUtilized,
          activeCount: schemes.filter((s) => s.status === 'Active').length,
          overallUtilizationPercent:
            totalBudget > 0 ? Math.round((totalUtilized / totalBudget) * 100) : 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching schemes:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch schemes',
      error: error.message,
    });
  }
}

/**
 * POST /api/schemes
 * Configure a new trade scheme
 */
export async function createScheme(req: Request, res: Response) {
  try {
    const {
      company,
      title,
      type,
      rule,
      fundedBy = 'Company-funded (Claimable)',
      budget = 0,
      validFrom,
      validTo,
      outletFilter = 'All Classes (A, B, C)',
      discountPercent = 0,
      discountAmount = 0,
      freeSku,
    } = req.body;

    if (!company || !title || !type || !rule) {
      return res.status(400).json({
        success: false,
        message: 'Company, Scheme Title, Scheme Type, and Rule Description are mandatory.',
      });
    }

    // Auto-generate sequential scheme ID: SCH-0x
    const countRes = await query('SELECT COUNT(*) FROM schemes');
    const seq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(2, '0');
    const generatedId = `SCH-${seq}`;

    await query(
      `INSERT INTO schemes (
        id, company, title, scheme_type, rule_description, funded_by,
        budget, utilized, valid_from, valid_to, outlet_filter,
        discount_percent, discount_amount, free_sku, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0.00, $8, $9, $10, $11, $12, $13, 'Active')`,
      [
        generatedId,
        company,
        title,
        type,
        rule,
        fundedBy,
        parseFloat(budget) || 0,
        validFrom || '01 Oct 2026',
        validTo || '31 Oct 2026',
        outletFilter,
        parseFloat(discountPercent) || 0,
        parseFloat(discountAmount) || 0,
        freeSku || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: `Trade Scheme ${generatedId} (${title}) configured successfully!`,
      data: {
        id: generatedId,
        company,
        title,
        status: 'Active',
      },
    });
  } catch (error: any) {
    console.error('Error configuring scheme:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to configure scheme',
      error: error.message,
    });
  }
}
