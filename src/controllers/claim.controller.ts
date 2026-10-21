import { Request, Response } from 'express';
import { query } from '../config/db';

/**
 * GET /api/claims
 * Returns all claims with evidence items and KPI summaries
 */
export async function getClaims(req: Request, res: Response) {
  try {
    const { company, status, type } = req.query;

    let sql = 'SELECT * FROM claims WHERE 1=1';
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
      sql += ` AND claim_type = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC';

    const claimsRes = await query(sql, params);
    const claims = claimsRes.rows;
    const claimIds = claims.map((c) => c.id);

    let itemsMap: Record<string, any[]> = {};
    if (claimIds.length > 0) {
      const itemsRes = await query(
        'SELECT * FROM claim_items WHERE claim_id = ANY($1) ORDER BY created_at ASC',
        [claimIds]
      );
      for (const item of itemsRes.rows) {
        if (!itemsMap[item.claim_id]) {
          itemsMap[item.claim_id] = [];
        }
        itemsMap[item.claim_id].push({
          id: item.id,
          invoiceNo: item.invoice_no,
          outletName: item.outlet_name,
          sku: item.sku,
          claimBasis: item.claim_basis,
          amount: parseFloat(item.amount) || 0,
        });
      }
    }

    // Compute live KPI summaries
    const allClaimsRes = await query('SELECT amount, approved_amount, status FROM claims');
    let totalRaisedYTD = 0;
    let totalSettled = 0;
    let totalPending = 0;
    let totalRejected = 0;

    for (const c of allClaimsRes.rows) {
      const amt = parseFloat(c.amount) || 0;
      const appAmt = parseFloat(c.approved_amount) || 0;
      totalRaisedYTD += amt;

      if (c.status === 'Credit note recd.') {
        totalSettled += appAmt > 0 ? appAmt : amt;
      } else if (c.status === 'Rejected') {
        totalRejected += amt;
      } else {
        totalPending += amt;
      }
    }

    const data = claims.map((c) => ({
      id: c.id,
      company: c.company,
      type: c.claim_type,
      period: c.period,
      amount: parseFloat(c.amount) || 0,
      approvedAmount: parseFloat(c.approved_amount) || 0,
      creditNoteNo: c.credit_note_no,
      status: c.status,
      age: parseInt(c.age_days, 10) || 0,
      queryText: c.query_text,
      queryResponse: c.query_response,
      dueDaysLeft: parseInt(c.due_days_left, 10) || 0,
      items: itemsMap[c.id] || [],
    }));

    return res.status(200).json({
      success: true,
      data: {
        claims: data,
        summary: {
          totalRaisedYTD,
          totalSettled,
          totalPending,
          totalRejected,
          recoveryRate: totalRaisedYTD > 0 ? Math.round((totalSettled / totalRaisedYTD) * 100) : 84,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching claims:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch claims',
      error: error.message,
    });
  }
}

/**
 * POST /api/claims/raise
 * Raise a new claim against an FMCG principal company
 */
export async function raiseClaim(req: Request, res: Response) {
  try {
    const { company, claimType, period, amount, items = [] } = req.body;

    const numericAmount = parseFloat(amount);
    if (!company || !claimType || !period || isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Company, Claim Type, Period, and valid positive Amount are required.',
      });
    }

    // Auto-generate claim ID: CL-26-XXX
    const countRes = await query('SELECT COUNT(*) FROM claims');
    const seq = String(87 + parseInt(countRes.rows[0].count, 10));
    const generatedClaimId = `CL-26-${seq.padStart(3, '0')}`;

    await query(
      `INSERT INTO claims (
        id, company, claim_type, period, amount, approved_amount, status, age_days, due_days_left
      )
      VALUES ($1, $2, $3, $4, $5, 0.00, 'Submitted', 1, 14)`,
      [generatedClaimId, company, claimType, period, numericAmount]
    );

    // Insert Evidence Items
    for (const item of items) {
      await query(
        `INSERT INTO claim_items (claim_id, invoice_no, outlet_name, sku, claim_basis, amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          generatedClaimId,
          item.invoiceNo || 'SO-MANUAL',
          item.outletName || 'General Retail Trade',
          item.sku || 'FMCG Scheme SKU',
          item.claimBasis || 'Trade Scheme Promotion',
          parseFloat(item.amount) || numericAmount,
        ]
      );
    }

    return res.status(201).json({
      success: true,
      message: `Claim ${generatedClaimId} for ₹${numericAmount.toLocaleString()} successfully filed with ${company}.`,
      data: {
        id: generatedClaimId,
        company,
        amount: numericAmount,
        status: 'Submitted',
      },
    });
  } catch (error: any) {
    console.error('Error raising claim:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to raise claim',
      error: error.message,
    });
  }
}

/**
 * POST /api/claims/resolve-query
 * Reply to company audit queries and re-submit evidence
 */
export async function resolveQuery(req: Request, res: Response) {
  try {
    const { id, responseText } = req.body;

    if (!id || !responseText) {
      return res.status(400).json({
        success: false,
        message: 'Claim ID and Query Reply text are required.',
      });
    }

    await query(
      `UPDATE claims
       SET status = 'Audit done',
           query_response = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [responseText, id]
    );

    return res.status(200).json({
      success: true,
      message: `Query for Claim ${id} resolved. Status updated to 'Audit done'.`,
      data: {
        id,
        status: 'Audit done',
        queryResponse: responseText,
      },
    });
  } catch (error: any) {
    console.error('Error resolving claim query:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve claim query',
      error: error.message,
    });
  }
}
