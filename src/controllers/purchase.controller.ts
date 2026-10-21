import { Request, Response } from 'express';
import { query } from '../config/db';

/**
 * GET /api/purchase
 * List all primary purchase orders, items, and KPI summaries
 */
export async function getPurchaseOrders(req: Request, res: Response) {
  try {
    const { company, status } = req.query;

    let sql = 'SELECT * FROM purchase_orders WHERE 1=1';
    const params: any[] = [];

    if (company && company !== 'All') {
      params.push(`%${company}%`);
      sql += ` AND company ILIKE $${params.length}`;
    }

    if (status && status !== 'All') {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    const purchaseOrders = result.rows;
    const poIds = purchaseOrders.map((p) => p.id);

    let itemsMap: Record<string, any[]> = {};
    if (poIds.length > 0) {
      const itemsRes = await query(
        'SELECT * FROM purchase_order_items WHERE po_id = ANY($1) ORDER BY created_at ASC',
        [poIds]
      );
      for (const row of itemsRes.rows) {
        if (!itemsMap[row.po_id]) {
          itemsMap[row.po_id] = [];
        }
        itemsMap[row.po_id].push({
          id: row.id,
          sku: row.sku,
          batchNo: row.batch_no,
          orderedCases: parseInt(row.ordered_cases, 10) || 0,
          receivedCases: parseInt(row.received_cases, 10) || 0,
          unitRate: parseFloat(row.unit_rate) || 0,
          taxableAmount: parseFloat(row.taxable_amount) || 0,
        });
      }
    }

    // Compute live KPI aggregates
    let pendingInboundValue = 0;
    let mtdPurchasesValue = 0;
    let shortageTotal = 0;

    for (const po of purchaseOrders) {
      const gross = parseFloat(po.gross_value) || 0;
      const shortage = parseFloat(po.shortage_amount) || 0;

      mtdPurchasesValue += gross;
      shortageTotal += shortage;

      if (po.status === 'Goods in Transit') {
        pendingInboundValue += gross;
      }
    }

    const data = purchaseOrders.map((po) => ({
      id: po.id,
      company: po.company,
      orderDate: po.order_date,
      expectedDelivery: po.expected_delivery,
      itemsCount: parseInt(po.items_count, 10) || 1,
      grossValue: parseFloat(po.gross_value) || 0,
      taxAmount: parseFloat(po.tax_amount) || 0,
      eInvoiceIrn: po.e_invoice_irn,
      eWayBill: po.e_way_bill,
      status: po.status,
      shortageAmount: parseFloat(po.shortage_amount) || 0,
      grnDate: po.grn_date,
      items: itemsMap[po.id] || [],
    }));

    return res.status(200).json({
      success: true,
      data: {
        purchaseOrders: data,
        summary: {
          pendingInboundValue,
          mtdPurchasesValue,
          itcMatchRate: 98.6,
          shortageTotal,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching purchase orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase orders',
      error: error.message,
    });
  }
}

/**
 * POST /api/purchase/create-po
 * Create a new Primary Purchase Order against an FMCG principal
 */
export async function createPurchaseOrder(req: Request, res: Response) {
  try {
    const { company, expectedDelivery, items = [] } = req.body;

    if (!company || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Company and at least one SKU line item are required.',
      });
    }

    // Generate PO sequential ID: PO-2026-xxx
    const countRes = await query('SELECT COUNT(*) FROM purchase_orders');
    const seq = String(92 + parseInt(countRes.rows[0].count, 10)).padStart(3, '0');
    const generatedId = `PO-2026-${seq}`;

    let totalGross = 0;
    const verifiedItems: any[] = [];

    for (const item of items) {
      const cases = parseInt(item.orderedCases, 10) || 1;
      const rate = parseFloat(item.unitRate) || 100;
      const amount = cases * rate;
      totalGross += amount;

      verifiedItems.push({
        sku: item.sku || 'FMCG SKU',
        batchNo: item.batchNo || `B26-10-${Math.floor(10 + Math.random() * 90)}`,
        orderedCases: cases,
        receivedCases: cases,
        unitRate: rate,
        taxableAmount: amount,
      });
    }

    const gstEst = Math.round(totalGross * 0.18);
    const grossTotalWithTax = totalGross + gstEst;
    const now = new Date();
    const orderDate = `${now.getDate()} Oct 2026`;
    const randIrn = `${Math.random().toString(36).substring(2, 7)}...${Math.random().toString(36).substring(2, 6)}`;
    const randEwb = `EWB-${Math.floor(100000000 + Math.random() * 900000000)}`;

    await query(
      `INSERT INTO purchase_orders (
        id, company, order_date, expected_delivery, items_count, gross_value,
        tax_amount, e_invoice_irn, e_way_bill, status, shortage_amount, grn_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Goods in Transit', 0.00, NULL)`,
      [
        generatedId,
        company,
        orderDate,
        expectedDelivery || '12 Oct 2026',
        verifiedItems.length,
        grossTotalWithTax,
        gstEst,
        randIrn,
        randEwb,
      ]
    );

    for (const it of verifiedItems) {
      await query(
        `INSERT INTO purchase_order_items (
          po_id, sku, batch_no, ordered_cases, received_cases, unit_rate, taxable_amount
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [generatedId, it.sku, it.batchNo, it.orderedCases, it.receivedCases, it.unitRate, it.taxableAmount]
      );
    }

    return res.status(201).json({
      success: true,
      message: `Primary Purchase Order ${generatedId} created for ₹${grossTotalWithTax.toLocaleString()}! Status: Goods in Transit.`,
      data: {
        id: generatedId,
        company,
        grossValue: grossTotalWithTax,
        status: 'Goods in Transit',
      },
    });
  } catch (error: any) {
    console.error('Error creating purchase order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create purchase order',
      error: error.message,
    });
  }
}

/**
 * POST /api/purchase/complete-grn
 * Complete Goods Receipt Note (GRN): Inwards stock into Godown inventory
 */
export async function completeGRN(req: Request, res: Response) {
  try {
    const { id, shortageCases = 0, shortageAmount = 0 } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Purchase Order ID is required.',
      });
    }

    const poRes = await query('SELECT * FROM purchase_orders WHERE id = $1', [id]);
    if (poRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Order record not found.',
      });
    }

    const po = poRes.rows[0];
    if (po.status === 'GRN Completed' || po.status === 'Settled & Paid') {
      return res.status(400).json({
        success: false,
        message: 'GRN has already been completed for this Purchase Order.',
      });
    }

    // 1. Fetch line items and inward stock into Godown
    const itemsRes = await query('SELECT * FROM purchase_order_items WHERE po_id = $1', [id]);
    for (const it of itemsRes.rows) {
      const receivedCases = parseInt(it.received_cases, 10) || 1;
      // Inward to products table
      await query(
        `UPDATE products
         SET godown_stock = godown_stock + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE sku = $2`,
        [receivedCases, it.sku]
      );
    }

    const now = new Date();
    const grnDateStr = `${now.getDate()} Oct 2026`;
    const numericShortage = parseFloat(shortageAmount) || 0;
    const newStatus = numericShortage > 0 ? 'GRN Completed (Shortage Claimed)' : 'GRN Completed';

    // 2. Update PO status in database
    await query(
      `UPDATE purchase_orders
       SET status = $1,
           grn_date = $2,
           shortage_amount = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [newStatus, grnDateStr, numericShortage, id]
    );

    // 3. If shortage/damage detected, automatically create a Claim in the Claims module!
    if (numericShortage > 0) {
      const claimCountRes = await query('SELECT COUNT(*) FROM claims');
      const claimSeq = String(100 + parseInt(claimCountRes.rows[0].count, 10)).padStart(3, '0');
      const claimId = `CLM-2026-${claimSeq}`;
      const periodStr = `${now.toLocaleString('default', { month: 'short' })} 2026`;

      await query(
        `INSERT INTO claims (
          id, company, claim_type, period, amount, approved_amount, credit_note_no, status, age_days, query_text
        )
        VALUES ($1, $2, 'Damage', $3, $4, 0.00, NULL, 'Submitted', 1, $5)`,
        [
          claimId,
          po.company.split('·')[0].trim(),
          periodStr,
          numericShortage,
          `Transit shortage of ${shortageCases} cases detected during GRN physical inwarding of ${id}. Invoice: ${po.e_invoice_irn || 'Direct Primary'}`
        ]
      );

      // Add evidence item
      await query(
        `INSERT INTO claim_items (claim_id, invoice_no, outlet_name, sku, claim_basis, amount)
         VALUES ($1, $2, 'Warehouse Depo Inward Gate', 'Primary Consignment Shortage', 'Transit Damage / Shortage', $3)`,
        [claimId, id, numericShortage]
      );
    }

    return res.status(200).json({
      success: true,
      message: `GRN Completed for ${id}! Stock successfully added to Warehouse Godown Racks.`,
      data: {
        id,
        status: newStatus,
        grnDate: grnDateStr,
      },
    });
  } catch (error: any) {
    console.error('Error completing GRN:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete GRN',
      error: error.message,
    });
  }
}
