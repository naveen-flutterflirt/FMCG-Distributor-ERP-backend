import { Request, Response } from 'express';
import { query } from '../config/db';

export async function getOrders(req: Request, res: Response) {
  try {
    const { route, search, status, checks } = req.query;

    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params: any[] = [];

    if (route && route !== 'All') {
      params.push(`%${route}%`);
      sql += ` AND route ILIKE $${params.length}`;
    }

    if (checks && checks !== 'All') {
      params.push(checks);
      sql += ` AND checks = $${params.length}`;
    }

    if (status && status !== 'All') {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (id ILIKE $${params.length} OR outlet_name ILIKE $${params.length} OR route ILIKE $${params.length})`;
    }

    sql += ' ORDER BY created_at DESC';

    const ordersResult = await query(sql, params);

    // Fetch items for all matching orders
    const orderIds = ordersResult.rows.map((r) => r.id);
    let itemsMap: Record<string, any[]> = {};

    if (orderIds.length > 0) {
      const itemsResult = await query(
        'SELECT * FROM order_items WHERE order_id = ANY($1) ORDER BY created_at ASC',
        [orderIds]
      );

      for (const item of itemsResult.rows) {
        if (!itemsMap[item.order_id]) {
          itemsMap[item.order_id] = [];
        }
        itemsMap[item.order_id].push({
          id: item.id,
          sku: item.sku,
          qty: item.qty,
          units: item.units,
          rate: parseFloat(item.rate) || 0,
          mrp: parseFloat(item.mrp) || 0,
          scheme: item.scheme || '—',
          amount: parseFloat(item.amount) || 0,
          isMustSell: item.is_must_sell,
        });
      }
    }

    const orders = ordersResult.rows.map((row) => ({
      id: row.id,
      outlet: row.outlet_name,
      outletClass: row.outlet_class,
      route: row.route,
      source: row.source,
      lines: row.lines_count,
      value: parseFloat(row.total_value) || 0,
      schemeSaving: parseFloat(row.scheme_saving) || 0,
      checks: row.checks,
      deliveryDate: row.delivery_date,
      gstin: row.gstin,
      balanceDue: parseFloat(row.balance_due) || 0,
      creditLimit: parseFloat(row.credit_limit) || 0,
      status: row.status,
      items: itemsMap[row.id] || [],
    }));

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message,
    });
  }
}

export async function createOrder(req: Request, res: Response) {
  try {
    const {
      outletId,
      outletName,
      route,
      source = 'Salesman · App',
      deliveryDate = 'Tomorrow',
      items = [],
    } = req.body;

    if (!outletName || !route || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Outlet Name, Route, and at least one order line item are required.',
      });
    }

    // 1. Fetch Outlet to verify Credit Limit & Outstanding Balance
    const outletRes = await query(
      'SELECT id, name, outlet_class, gstin, credit_limit, current_outstanding FROM outlets WHERE id = $1 OR name ILIKE $2 LIMIT 1',
      [outletId || '', outletName]
    );

    const outlet = outletRes.rows[0] || {
      name: outletName,
      outlet_class: 'B',
      gstin: 'Unregistered',
      credit_limit: 25000,
      current_outstanding: 0,
    };

    // 2. Calculate line items, total value, and scheme savings
    let calculatedTotal = 0;
    let totalSchemeSaving = 0;
    let hasStockShortage = false;

    // Check inventory stock for each SKU
    const verifiedItems = [];
    for (const item of items) {
      const productRes = await query(
        'SELECT id, sku, mrp, sell_rate, godown_stock FROM products WHERE sku ILIKE $1 OR id = $2 LIMIT 1',
        [item.sku, item.productId || '']
      );

      const product = productRes.rows[0];
      const rate = item.rate || (product ? parseFloat(product.sell_rate) : 100);
      const mrp = item.mrp || (product ? parseFloat(product.mrp) : 120);
      const units = item.units || 1;
      const amount = units * rate;
      calculatedTotal += amount;

      // Simple scheme discount demo calculation
      const schemeSaving = item.schemeSaving || (mrp - rate > 0 ? (mrp - rate) * units * 0.1 : 0);
      totalSchemeSaving += schemeSaving;

      // Stock check
      if (product && product.godown_stock < units) {
        hasStockShortage = true;
      }

      verifiedItems.push({
        productId: product ? product.id : null,
        sku: item.sku,
        qty: item.qty || `${units} pc`,
        units: units,
        rate: rate,
        mrp: mrp,
        scheme: item.scheme || '—',
        amount: amount,
        isMustSell: Boolean(item.isMustSell),
      });
    }

    // 3. Automated Senior ERP Checks
    // Check A: Credit Limit Check
    const newProjectedBalance = parseFloat(outlet.current_outstanding) + calculatedTotal;
    let orderCheckStatus = 'OK';

    if (newProjectedBalance > parseFloat(outlet.credit_limit)) {
      orderCheckStatus = 'Credit hold';
    } else if (hasStockShortage) {
      orderCheckStatus = 'Short 3 SKUs';
    }

    // 4. Generate Order ID: SO-xxxxx
    const countRes = await query('SELECT COUNT(*) FROM orders');
    const orderSeq = 61200 + parseInt(countRes.rows[0].count, 10) + 1;
    const generatedOrderId = `SO-${orderSeq}`;

    // 5. Insert Order
    await query(
      `INSERT INTO orders (
        id, outlet_id, outlet_name, outlet_class, route, source, lines_count,
        total_value, scheme_saving, checks, delivery_date, gstin, balance_due, credit_limit, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'Pending')`,
      [
        generatedOrderId,
        outlet.id || null,
        outlet.name,
        outlet.outlet_class || 'B',
        route,
        source,
        verifiedItems.length,
        calculatedTotal,
        totalSchemeSaving,
        orderCheckStatus,
        deliveryDate,
        outlet.gstin,
        outlet.current_outstanding,
        outlet.credit_limit,
      ]
    );

    // 6. Insert Order Items
    for (const it of verifiedItems) {
      await query(
        `INSERT INTO order_items (
          order_id, product_id, sku, qty, units, rate, mrp, scheme, amount, is_must_sell
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          generatedOrderId,
          it.productId,
          it.sku,
          it.qty,
          it.units,
          it.rate,
          it.mrp,
          it.scheme,
          it.amount,
          it.isMustSell,
        ]
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        id: generatedOrderId,
        outlet: outlet.name,
        outletClass: outlet.outlet_class,
        route,
        source,
        lines: verifiedItems.length,
        value: calculatedTotal,
        schemeSaving: totalSchemeSaving,
        checks: orderCheckStatus,
        deliveryDate,
        gstin: outlet.gstin,
        balanceDue: parseFloat(outlet.current_outstanding),
        creditLimit: parseFloat(outlet.credit_limit),
        status: 'Pending',
        items: verifiedItems,
      },
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message,
    });
  }
}

/**
 * Bulk Invoicing & Billing Engine:
 * 1. Verifies order is 'OK'
 * 2. Generates Tax Invoice number
 * 3. Automatically DEDUCTS stock from godown
 * 4. Automatically INCREASES outlet current_outstanding balance
 */
export async function bulkBillOrders(req: Request, res: Response) {
  try {
    const { orderIds } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No orders selected for billing',
      });
    }

    const billedOrders = [];
    const heldOrders = [];

    for (const orderId of orderIds) {
      const orderRes = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
      if (orderRes.rows.length === 0) continue;

      const order = orderRes.rows[0];

      // Block billing if Credit Hold
      if (order.checks !== 'OK') {
        heldOrders.push({ id: order.id, reason: order.checks });
        continue;
      }

      // Fetch items to deduct stock
      const itemsRes = await query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);

      // Deduct stock in database
      for (const item of itemsRes.rows) {
        if (item.product_id) {
          await query(
            'UPDATE products SET godown_stock = GREATEST(0, godown_stock - $1) WHERE id = $2',
            [item.units, item.product_id]
          );
        } else {
          await query(
            'UPDATE products SET godown_stock = GREATEST(0, godown_stock - $1) WHERE sku ILIKE $2',
            [item.units, item.sku]
          );
        }
      }

      // Update outlet outstanding balance
      if (order.outlet_id) {
        await query(
          'UPDATE outlets SET current_outstanding = current_outstanding + $1 WHERE id = $2',
          [order.total_value, order.outlet_id]
        );
      } else {
        await query(
          'UPDATE outlets SET current_outstanding = current_outstanding + $1 WHERE name ILIKE $2',
          [order.total_value, order.outlet_name]
        );
      }

      // Mark Order as Billed with Invoice number
      const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await query(
        `UPDATE orders
         SET status = 'Billed', invoice_number = $1, delivery_date = 'Dispatched Today'
         WHERE id = $2`,
        [invoiceNumber, orderId]
      );

      billedOrders.push({
        id: order.id,
        outlet: order.outlet_name,
        invoiceNumber,
        value: parseFloat(order.total_value),
      });
    }

    return res.status(200).json({
      success: true,
      message: `Billed ${billedOrders.length} orders successfully. Stock deducted and invoices generated.`,
      data: {
        billedOrders,
        heldOrders,
      },
    });
  } catch (error: any) {
    console.error('Error billing orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to bill orders',
      error: error.message,
    });
  }
}
