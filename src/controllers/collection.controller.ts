import { Request, Response } from 'express';
import { query } from '../config/db';

/**
 * GET /api/collections
 * List all market collection receipts with filter by route, status, payment mode
 */
export async function getCollections(req: Request, res: Response) {
  try {
    const { route, status, mode, search } = req.query;

    let sql = 'SELECT * FROM collections WHERE 1=1';
    const params: any[] = [];

    if (route && route !== 'All') {
      params.push(`%${route}%`);
      sql += ` AND route ILIKE $${params.length}`;
    }

    if (status && status !== 'All') {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (mode && mode !== 'All') {
      params.push(mode);
      sql += ` AND payment_mode = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (outlet_name ILIKE $${params.length} OR id ILIKE $${params.length} OR reference_no ILIKE $${params.length})`;
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);

    // Compute live Aging Analysis across all active outlets
    const outletsRes = await query(
      'SELECT id, name, current_outstanding, overdue_days, credit_limit FROM outlets WHERE current_outstanding > 0'
    );

    let totalMarketOutstanding = 0;
    let aging0to7 = 0;
    let aging8to15 = 0;
    let aging16to30 = 0;
    let agingOver30 = 0;

    for (const out of outletsRes.rows) {
      const balance = parseFloat(out.current_outstanding) || 0;
      const days = parseInt(out.overdue_days, 10) || 0;
      totalMarketOutstanding += balance;

      if (days <= 7) aging0to7 += balance;
      else if (days <= 15) aging8to15 += balance;
      else if (days <= 30) aging16to30 += balance;
      else agingOver30 += balance;
    }

    const receipts = result.rows.map((row) => ({
      id: row.id,
      outletId: row.outlet_id,
      outletName: row.outlet_name,
      route: row.route,
      salesmanName: row.salesman_name,
      amountCollected: parseFloat(row.amount_collected) || 0,
      paymentMode: row.payment_mode,
      referenceNo: row.reference_no,
      bankName: row.bank_name,
      clearingDate: row.clearing_date,
      status: row.status,
      previousOutstanding: parseFloat(row.previous_outstanding) || 0,
      newOutstanding: parseFloat(row.new_outstanding) || 0,
      remarks: row.remarks,
      collectedAt: row.collected_at,
    }));

    return res.status(200).json({
      success: true,
      data: {
        receipts,
        summary: {
          totalMarketOutstanding,
          aging0to7,
          aging8to15,
          aging16to30,
          agingOver30,
          totalReceiptsCount: receipts.length,
          totalCollectedToday: receipts.reduce((acc, r) => acc + r.amountCollected, 0),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching collections:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch collections',
      error: error.message,
    });
  }
}

/**
 * POST /api/collections/record
 * Records payment receipt, auto-deducts outlet current_outstanding,
 * and auto-unblocks credit if balance is within credit_limit.
 */
export async function recordPayment(req: Request, res: Response) {
  try {
    const {
      outletId,
      amount,
      paymentMode = 'Cash',
      referenceNo = '—',
      bankName = '—',
      clearingDate,
      salesmanName = 'Admin Cashier',
      remarks = 'Market collection received',
    } = req.body;

    const numericAmount = parseFloat(amount);
    if (!outletId || isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid Outlet ID and positive collection amount are required.',
      });
    }

    // 1. Fetch Outlet
    const outletRes = await query('SELECT * FROM outlets WHERE id = $1', [outletId]);
    if (outletRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Retailer outlet not found in database.',
      });
    }

    const outlet = outletRes.rows[0];
    const prevOutstanding = parseFloat(outlet.current_outstanding) || 0;
    const newOutstanding = Math.max(0, prevOutstanding - numericAmount);
    const creditLimit = parseFloat(outlet.credit_limit) || 0;

    // 2. Determine new outlet status
    let updatedOutletStatus = outlet.status;
    if (outlet.status === 'Credit Blocked' && newOutstanding <= creditLimit) {
      updatedOutletStatus = 'Active';
    }

    // 3. Update Outlet Outstanding & Status in Neon DB
    await query(
      `UPDATE outlets
       SET current_outstanding = $1,
           status = $2,
           last_order_date = CURRENT_DATE,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newOutstanding, updatedOutletStatus, outletId]
    );

    // 4. Generate Sequential Receipt ID: REC-YYYYMM-XXX
    const countRes = await query('SELECT COUNT(*) FROM collections');
    const nextSeq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(3, '0');
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const generatedReceiptId = `REC-${yearMonth}-${nextSeq}`;

    // 5. Insert Collection Receipt
    const receiptStatus = paymentMode === 'Cheque' ? 'Pending Bank' : 'Cleared';

    await query(
      `INSERT INTO collections (
        id, outlet_id, outlet_name, route, salesman_name, amount_collected,
        payment_mode, reference_no, bank_name, clearing_date, status,
        previous_outstanding, new_outstanding, remarks
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        generatedReceiptId,
        outlet.id,
        outlet.name,
        outlet.route,
        salesmanName,
        numericAmount,
        paymentMode,
        referenceNo,
        bankName,
        clearingDate || 'Today',
        receiptStatus,
        prevOutstanding,
        newOutstanding,
        remarks,
      ]
    );

    return res.status(201).json({
      success: true,
      message: `Payment of ₹${numericAmount.toLocaleString()} successfully recorded for ${outlet.name}! Outstanding reduced to ₹${newOutstanding.toLocaleString()}.`,
      data: {
        receiptId: generatedReceiptId,
        outletName: outlet.name,
        amountCollected: numericAmount,
        previousOutstanding: prevOutstanding,
        newOutstanding,
        outletStatus: updatedOutletStatus,
      },
    });
  } catch (error: any) {
    console.error('Error recording payment collection:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record payment collection',
      error: error.message,
    });
  }
}
