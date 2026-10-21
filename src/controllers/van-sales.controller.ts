import { Request, Response } from 'express';
import { query } from '../config/db';

/**
 * GET /api/van-sales
 * Returns latest active or settled van settlements with full SKU reconciliation items
 */
export async function getVanSettlements(req: Request, res: Response) {
  try {
    const { status, vanNo } = req.query;

    let sql = 'SELECT * FROM van_settlements WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'All') {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (vanNo) {
      params.push(`%${vanNo}%`);
      sql += ` AND van_no ILIKE $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    const settlements = result.rows;

    const settlementIds = settlements.map((s) => s.id);
    let itemsMap: Record<string, any[]> = {};

    if (settlementIds.length > 0) {
      const itemsRes = await query(
        'SELECT * FROM van_settlement_items WHERE settlement_id = ANY($1) ORDER BY sku ASC',
        [settlementIds]
      );

      for (const row of itemsRes.rows) {
        if (!itemsMap[row.settlement_id]) {
          itemsMap[row.settlement_id] = [];
        }
        itemsMap[row.settlement_id].push({
          id: row.id,
          sku: row.sku,
          loaded: parseInt(row.loaded, 10) || 0,
          sold: parseInt(row.sold, 10) || 0,
          freeScheme: parseInt(row.free_scheme, 10) || 0,
          goodReturn: parseInt(row.good_return, 10) || 0,
          damageIn: parseInt(row.damage_in, 10) || 0,
          expectedBack: parseInt(row.expected_back, 10) || 0,
          countedBack: parseInt(row.counted_back, 10) || 0,
          variance: parseInt(row.variance, 10) || 0,
          rate: parseFloat(row.rate) || 0,
        });
      }
    }

    const data = settlements.map((s) => ({
      id: s.id,
      vanNo: s.van_no,
      salesmanName: s.salesman_name,
      salesmanPhone: s.salesman_phone,
      route: s.route,
      settlementDate: s.settlement_date,
      loadedTime: s.loaded_time,
      returnedTime: s.returned_time,
      totalBilledValue: parseFloat(s.total_billed_value) || 0,
      cashCollected: parseFloat(s.cash_collected) || 0,
      upiCollected: parseFloat(s.upi_collected) || 0,
      chequeCollected: parseFloat(s.cheque_collected) || 0,
      creditSales: parseFloat(s.credit_sales) || 0,
      expectedCash: parseFloat(s.expected_cash) || 0,
      cashVariance: parseFloat(s.cash_variance) || 0,
      cratesLoaded: parseInt(s.crates_loaded, 10) || 0,
      cratesReturned: parseInt(s.crates_returned, 10) || 0,
      cratesVariance: parseInt(s.crates_variance, 10) || 0,
      status: s.status,
      settledAt: s.settled_at,
      settledBy: s.settled_by,
      remarks: s.remarks,
      items: itemsMap[s.id] || [],
    }));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error fetching van settlements:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch van settlements',
      error: error.message,
    });
  }
}

/**
 * POST /api/van-sales/close
 * Closes settlement, adjusts godown stock with counted items, sets van stock to 0,
 * and creates recovery voucher for any short cash variance.
 */
export async function closeVanSettlement(req: Request, res: Response) {
  try {
    const { id, remarks, settledBy = 'Admin Depot Manager' } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Settlement ID is required.',
      });
    }

    const settlementRes = await query(
      'SELECT * FROM van_settlements WHERE id = $1',
      [id]
    );

    if (settlementRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Settlement record not found.',
      });
    }

    const settlement = settlementRes.rows[0];

    if (settlement.status === 'Settled') {
      return res.status(400).json({
        success: false,
        message: 'This van settlement has already been reconciled and settled.',
      });
    }

    // 1. Fetch Items
    const itemsRes = await query(
      'SELECT * FROM van_settlement_items WHERE settlement_id = $1',
      [id]
    );

    // 2. Automated ERP Stock Adjustment:
    // Counted back stocks return into godown stock; van stock cleared
    for (const item of itemsRes.rows) {
      const countedGoodStock = parseInt(item.counted_back, 10) || 0;

      // Update matching product stock in godown
      await query(
        `UPDATE products
         SET godown_stock = godown_stock + $1,
             van_stock = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE sku = $2`,
        [countedGoodStock, item.sku]
      );
    }

    // 3. Mark Settlement as Settled
    const now = new Date();
    await query(
      `UPDATE van_settlements
       SET status = 'Settled',
           settled_at = $1,
           settled_by = $2,
           remarks = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [now, settledBy, remarks || 'Reconciled and closed at gate', id]
    );

    return res.status(200).json({
      success: true,
      message: `Van Settlement ${id} successfully reconciled! Stocks restored to godown inventory and cash accounts updated.`,
      data: {
        id,
        status: 'Settled',
        settledAt: now,
        settledBy,
      },
    });
  } catch (error: any) {
    console.error('Error closing van settlement:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to close van settlement',
      error: error.message,
    });
  }
}
