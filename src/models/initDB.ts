import { query } from '../config/db';
import bcrypt from 'bcryptjs';

export async function initDB() {
  try {
    console.log('🔄 Initializing database tables...');

    // 1. Create Users Table (for Admin, Manager, etc.)
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create Salesmen Table
    await query(`
      CREATE TABLE IF NOT EXISTS salesmen (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(255),
        beat VARCHAR(100) NOT NULL,
        target_sales NUMERIC(12, 2) DEFAULT 500000.00,
        daily_outlets_target INTEGER DEFAULT 32,
        sales NUMERIC(12, 2) DEFAULT 0.00,
        productive INTEGER DEFAULT 0,
        lpc NUMERIC(4, 2) DEFAULT 0.00,
        visited VARCHAR(50) DEFAULT '0/32',
        must_sell VARCHAR(50) DEFAULT '0/5',
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create Outlets Table
    await query(`
      CREATE TABLE IF NOT EXISTS outlets (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        owner_name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'General Trade',
        outlet_class VARCHAR(20) NOT NULL DEFAULT 'B',
        route VARCHAR(100) NOT NULL,
        beat_id VARCHAR(50) NOT NULL,
        address TEXT NOT NULL,
        phone VARCHAR(30) NOT NULL,
        gstin VARCHAR(30),
        credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 25000.00,
        current_outstanding NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        overdue_days INTEGER DEFAULT 0,
        loyalty_points INTEGER DEFAULT 0,
        last_order_date VARCHAR(50),
        status VARCHAR(30) DEFAULT 'Active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create Products & Godown Inventory Table
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        sku VARCHAR(150) NOT NULL,
        company VARCHAR(100) NOT NULL,
        category VARCHAR(100) NOT NULL DEFAULT 'General',
        batch VARCHAR(50) NOT NULL,
        mrp NUMERIC(10, 2) NOT NULL,
        purchase_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        sell_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        godown_stock INTEGER NOT NULL DEFAULT 0,
        van_stock INTEGER NOT NULL DEFAULT 0,
        cover_days INTEGER NOT NULL DEFAULT 15,
        expiry_date VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'Healthy',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Create Orders Table
    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        outlet_id VARCHAR(50),
        outlet_name VARCHAR(150) NOT NULL,
        outlet_class VARCHAR(20) DEFAULT 'B',
        route VARCHAR(100) NOT NULL,
        source VARCHAR(100) NOT NULL DEFAULT 'Salesman',
        lines_count INTEGER NOT NULL DEFAULT 1,
        total_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        scheme_saving NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        checks VARCHAR(50) NOT NULL DEFAULT 'OK',
        delivery_date VARCHAR(50) NOT NULL,
        gstin VARCHAR(30),
        balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 25000.00,
        status VARCHAR(30) NOT NULL DEFAULT 'Pending',
        invoice_number VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Create Order Items Table
    await query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id VARCHAR(50) NOT NULL,
        product_id VARCHAR(50),
        sku VARCHAR(150) NOT NULL,
        qty VARCHAR(50) NOT NULL,
        units INTEGER NOT NULL DEFAULT 1,
        rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        mrp NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        scheme VARCHAR(100) DEFAULT '—',
        amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        is_must_sell BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Create Van Settlements Master Table
    await query(`
      CREATE TABLE IF NOT EXISTS van_settlements (
        id VARCHAR(50) PRIMARY KEY,
        van_no VARCHAR(50) NOT NULL,
        salesman_name VARCHAR(100) NOT NULL,
        salesman_phone VARCHAR(20),
        route VARCHAR(100) NOT NULL,
        settlement_date VARCHAR(50) NOT NULL,
        loaded_time VARCHAR(20) DEFAULT '08:10',
        returned_time VARCHAR(20) DEFAULT '19:25',
        total_billed_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        cash_collected NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        upi_collected NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        cheque_collected NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        credit_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        expected_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        cash_variance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        crates_loaded INTEGER NOT NULL DEFAULT 0,
        crates_returned INTEGER NOT NULL DEFAULT 0,
        crates_variance INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'Pending',
        settled_at TIMESTAMP WITH TIME ZONE,
        settled_by VARCHAR(100),
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Create Van Settlement Items Table
    await query(`
      CREATE TABLE IF NOT EXISTS van_settlement_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        settlement_id VARCHAR(50) NOT NULL,
        product_id VARCHAR(50),
        sku VARCHAR(150) NOT NULL,
        loaded INTEGER NOT NULL DEFAULT 0,
        sold INTEGER NOT NULL DEFAULT 0,
        free_scheme INTEGER NOT NULL DEFAULT 0,
        good_return INTEGER NOT NULL DEFAULT 0,
        damage_in INTEGER NOT NULL DEFAULT 0,
        expected_back INTEGER NOT NULL DEFAULT 0,
        counted_back INTEGER NOT NULL DEFAULT 0,
        variance INTEGER NOT NULL DEFAULT 0,
        rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Create Collections & Market Receipts Table
    await query(`
      CREATE TABLE IF NOT EXISTS collections (
        id VARCHAR(50) PRIMARY KEY,
        outlet_id VARCHAR(50),
        outlet_name VARCHAR(150) NOT NULL,
        route VARCHAR(100) NOT NULL,
        salesman_name VARCHAR(100) NOT NULL,
        amount_collected NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        payment_mode VARCHAR(30) NOT NULL DEFAULT 'Cash',
        reference_no VARCHAR(100),
        bank_name VARCHAR(100),
        clearing_date VARCHAR(50),
        status VARCHAR(30) NOT NULL DEFAULT 'Cleared',
        previous_outstanding NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        new_outstanding NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        remarks TEXT,
        collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. Create Claims Master Table
    await query(`
      CREATE TABLE IF NOT EXISTS claims (
        id VARCHAR(50) PRIMARY KEY,
        company VARCHAR(100) NOT NULL,
        claim_type VARCHAR(50) NOT NULL,
        period VARCHAR(50) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        approved_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        credit_note_no VARCHAR(100),
        status VARCHAR(30) NOT NULL DEFAULT 'Submitted',
        age_days INTEGER NOT NULL DEFAULT 5,
        query_text TEXT,
        query_response TEXT,
        due_days_left INTEGER DEFAULT 10,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 11. Create Claim Items / Evidence Table
    await query(`
      CREATE TABLE IF NOT EXISTS claim_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        claim_id VARCHAR(50) NOT NULL,
        invoice_no VARCHAR(50),
        outlet_name VARCHAR(150) NOT NULL,
        sku VARCHAR(150) NOT NULL,
        claim_basis VARCHAR(100) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 12. Create Schemes Master Table
    await query(`
      CREATE TABLE IF NOT EXISTS schemes (
        id VARCHAR(50) PRIMARY KEY,
        company VARCHAR(100) NOT NULL,
        title VARCHAR(200) NOT NULL,
        scheme_type VARCHAR(100) NOT NULL,
        rule_description TEXT NOT NULL,
        funded_by VARCHAR(100) NOT NULL DEFAULT 'Company-funded (Claimable)',
        budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        utilized NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        valid_from VARCHAR(50) NOT NULL,
        valid_to VARCHAR(50) NOT NULL,
        outlet_filter VARCHAR(100) NOT NULL DEFAULT 'All Classes (A, B, C)',
        discount_percent NUMERIC(5, 2) DEFAULT 0.00,
        discount_amount NUMERIC(10, 2) DEFAULT 0.00,
        free_sku VARCHAR(150),
        status VARCHAR(30) NOT NULL DEFAULT 'Active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 13. Create Purchase Orders Master Table
    await query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id VARCHAR(50) PRIMARY KEY,
        company VARCHAR(100) NOT NULL,
        order_date VARCHAR(50) NOT NULL,
        expected_delivery VARCHAR(50) NOT NULL,
        items_count INTEGER NOT NULL DEFAULT 1,
        gross_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        e_invoice_irn VARCHAR(100),
        e_way_bill VARCHAR(100),
        status VARCHAR(50) NOT NULL DEFAULT 'Goods in Transit',
        shortage_amount NUMERIC(10, 2) DEFAULT 0.00,
        grn_date VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 14. Create Purchase Order Items Table
    await query(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        po_id VARCHAR(50) NOT NULL,
        sku VARCHAR(150) NOT NULL,
        batch_no VARCHAR(50) NOT NULL,
        ordered_cases INTEGER NOT NULL DEFAULT 1,
        received_cases INTEGER NOT NULL DEFAULT 1,
        unit_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        taxable_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 15. Create Operating Expenses Table (Day-to-day depot costs)
    await query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(50) PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        payment_mode VARCHAR(50) NOT NULL DEFAULT 'Bank Transfer',
        expense_date VARCHAR(50) NOT NULL,
        paid_to VARCHAR(150),
        voucher_ref VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 16. Create Bank & Cash Accounts Table
    await query(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id VARCHAR(50) PRIMARY KEY,
        account_name VARCHAR(100) NOT NULL,
        account_number VARCHAR(100) NOT NULL,
        bank_name VARCHAR(100) NOT NULL,
        account_type VARCHAR(50) NOT NULL DEFAULT 'Current Account',
        balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        reconciled_date VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 17. Create Settings Table
    await query(`
      CREATE TABLE IF NOT EXISTS settings (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'fmcg_distributor_settings',
        distributor_name VARCHAR(200) NOT NULL DEFAULT 'Shree Balaji FMCG Distributors',
        depot_address TEXT NOT NULL DEFAULT 'Depot #4, Transport Nagar, Station Road, Kanpur',
        contact_phone VARCHAR(50) NOT NULL DEFAULT '+91 98260 99887',
        contact_email VARCHAR(100) NOT NULL DEFAULT 'operations@balajidistributors.in',
        gstin VARCHAR(50) NOT NULL DEFAULT '09AAAFR0123M1ZV',
        fssai_licence VARCHAR(50) NOT NULL DEFAULT '10023400192837',
        pan_number VARCHAR(50) NOT NULL DEFAULT 'AAAFR0123M',
        eway_threshold NUMERIC(10, 2) NOT NULL DEFAULT 50000.00,
        mandatory_van_settle BOOLEAN NOT NULL DEFAULT true,
        credit_ceiling_enforce BOOLEAN NOT NULL DEFAULT true,
        period_lock_month VARCHAR(50) NOT NULL DEFAULT 'September 2026',
        connector_comp_a BOOLEAN NOT NULL DEFAULT true,
        connector_comp_b BOOLEAN NOT NULL DEFAULT true,
        connector_comp_c BOOLEAN NOT NULL DEFAULT true,
        connector_tally BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 18. Create Delivery Trips Table
    await query(`
      CREATE TABLE IF NOT EXISTS delivery_trips (
        id VARCHAR(50) PRIMARY KEY,
        route VARCHAR(150) NOT NULL,
        vehicle VARCHAR(100) NOT NULL,
        driver VARCHAR(100) NOT NULL,
        total_drops INTEGER NOT NULL DEFAULT 0,
        delivered INTEGER NOT NULL DEFAULT 0,
        pending INTEGER NOT NULL DEFAULT 0,
        value_to_collect NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        collected_so_far NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        status VARCHAR(50) NOT NULL DEFAULT 'Scheduled',
        cases_loaded INTEGER NOT NULL DEFAULT 0,
        trip_date VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Users, Salesmen, Outlets, Products, Orders, Van Settlements, Collections, Claims, Schemes, Purchase, Expenses, Bank Accounts, Settings, and Delivery Trips tables ready');

    // Seed Initial Admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

    const checkAdmin = await query('SELECT * FROM users WHERE email = $1', [adminEmail]);

    if (checkAdmin.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(adminPass, 10);
      await query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, $4)`,
        ['Super Admin', adminEmail, hashedPassword, 'admin']
      );
      console.log(`👤 Admin user seeded: ${adminEmail}`);
    }

    // Seed initial salesmen if empty
    const checkSalesmen = await query('SELECT COUNT(*) FROM salesmen');
    if (parseInt(checkSalesmen.rows[0].count, 10) === 0) {
      const initialSalesmen = [
        {
          name: 'Rakesh Sharma',
          phone: '9876543210',
          email: 'rakesh.sales@fmcg.com',
          beat: 'Gandhi Nagar (R4)',
          target_sales: 600000,
          sales: 48600,
          productive: 22,
          lpc: 7.1,
          visited: '28/32',
          must_sell: '5/5',
        },
        {
          name: 'Anil Verma',
          phone: '9876543211',
          email: 'anil.sales@fmcg.com',
          beat: 'Station Road (R2)',
          target_sales: 550000,
          sales: 41200,
          productive: 19,
          lpc: 6.8,
          visited: '26/30',
          must_sell: '4/5',
        },
        {
          name: 'Farhan Akhtar',
          phone: '9876543212',
          email: 'farhan.sales@fmcg.com',
          beat: 'Civil Lines (R1)',
          target_sales: 500000,
          sales: 38900,
          productive: 18,
          lpc: 6.2,
          visited: '24/28',
          must_sell: '3/5',
        },
        {
          name: 'Manoj Tiwari',
          phone: '9876543213',
          email: 'manoj.sales@fmcg.com',
          beat: 'Old Market (R3)',
          target_sales: 450000,
          sales: 29400,
          productive: 14,
          lpc: 5.4,
          visited: '20/35',
          must_sell: '2/5',
        },
      ];

      for (const sm of initialSalesmen) {
        await query(
          `INSERT INTO salesmen (name, phone, email, beat, target_sales, sales, productive, lpc, visited, must_sell)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            sm.name,
            sm.phone,
            sm.email,
            sm.beat,
            sm.target_sales,
            sm.sales,
            sm.productive,
            sm.lpc,
            sm.visited,
            sm.must_sell,
          ]
        );
      }
      console.log('👥 Initial salesmen seeded in Neon DB');
    }

    // Seed initial outlets if empty
    const checkOutlets = await query('SELECT COUNT(*) FROM outlets');
    if (parseInt(checkOutlets.rows[0].count, 10) === 0) {
      const initialOutlets = [
        {
          id: 'OUT-101',
          name: 'Gupta Kirana Store',
          owner_name: 'Ramprasad Gupta',
          category: 'General Trade',
          outlet_class: 'A',
          route: 'R4 Gandhi Nagar',
          beat_id: 'BEAT-GN-04',
          address: '14/2 Main Chowk, Gandhi Nagar',
          phone: '+91 98260 11223',
          gstin: '09AAECG1234F1Z8',
          credit_limit: 25000,
          current_outstanding: 4200,
          overdue_days: 4,
          loyalty_points: 1240,
          last_order_date: '09 Oct 2026',
          status: 'Active',
        },
        {
          id: 'OUT-102',
          name: 'Shree Ram General',
          owner_name: 'Shyamlal Sharma',
          category: 'General Trade',
          outlet_class: 'A',
          route: 'R4 Gandhi Nagar',
          beat_id: 'BEAT-GN-04',
          address: '88 Circular Road, Gandhi Nagar',
          phone: '+91 98261 44556',
          gstin: '09AAAFR9876C1Z3',
          credit_limit: 30000,
          current_outstanding: 8450,
          overdue_days: 8,
          loyalty_points: 1850,
          last_order_date: '09 Oct 2026',
          status: 'Active',
        },
        {
          id: 'OUT-103',
          name: 'New Bharat Stores',
          owner_name: 'Bharat Bhushan',
          category: 'General Trade',
          outlet_class: 'B',
          route: 'R2 Station Rd',
          beat_id: 'BEAT-SR-02',
          address: '4 Platform Road, Station Area',
          phone: '+91 98262 77889',
          gstin: '09AABCN4421D1Z9',
          credit_limit: 25000,
          current_outstanding: 26400,
          overdue_days: 24,
          loyalty_points: 420,
          last_order_date: '08 Oct 2026',
          status: 'Credit Blocked',
        },
        {
          id: 'OUT-104',
          name: 'Hotel Sagar (HoReCa)',
          owner_name: 'Vikas Rao',
          category: 'HoReCa',
          outlet_class: 'B',
          route: 'R1 Civil Lines',
          beat_id: 'BEAT-CL-01',
          address: '109 VIP Enclave, Civil Lines',
          phone: '+91 98263 99001',
          gstin: '09AAECB7829M1ZP',
          credit_limit: 50000,
          current_outstanding: 0,
          overdue_days: 0,
          loyalty_points: 3100,
          last_order_date: '09 Oct 2026',
          status: 'Active',
        },
        {
          id: 'OUT-105',
          name: 'Ma Durga Traders',
          owner_name: 'Kishore Agrawal',
          category: 'Wholesale',
          outlet_class: 'B',
          route: 'R3 Old Market',
          beat_id: 'BEAT-OM-03',
          address: 'Shop 12 Wholesale Gali, Old Market',
          phone: '+91 98264 33221',
          gstin: '09AADPT9902J1ZX',
          credit_limit: 150000,
          current_outstanding: 45000,
          overdue_days: 14,
          loyalty_points: 5400,
          last_order_date: '09 Oct 2026',
          status: 'Active',
        },
        {
          id: 'OUT-106',
          name: 'SuperMart #17 (modern trade)',
          owner_name: 'Apex Retail Ltd',
          category: 'Modern Trade',
          outlet_class: 'A',
          route: 'MT route',
          beat_id: 'BEAT-MT-01',
          address: 'Mall Level 1, Ring Road',
          phone: '+91 98265 88990',
          gstin: '09AAACS9988K1Z7',
          credit_limit: 500000,
          current_outstanding: 185000,
          overdue_days: 18,
          loyalty_points: 12500,
          last_order_date: '07 Oct 2026',
          status: 'Active',
        },
      ];

      for (const out of initialOutlets) {
        await query(
          `INSERT INTO outlets (
            id, name, owner_name, category, outlet_class, route, beat_id, address,
            phone, gstin, credit_limit, current_outstanding, overdue_days, loyalty_points, last_order_date, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            out.id,
            out.name,
            out.owner_name,
            out.category,
            out.outlet_class,
            out.route,
            out.beat_id,
            out.address,
            out.phone,
            out.gstin,
            out.credit_limit,
            out.current_outstanding,
            out.overdue_days,
            out.loyalty_points,
            out.last_order_date,
            out.status,
          ]
        );
      }
      console.log('🏪 Initial outlets seeded in Neon DB');
    }

    // Seed initial products & inventory if empty
    const checkProducts = await query('SELECT COUNT(*) FROM products');
    if (parseInt(checkProducts.rows[0].count, 10) === 0) {
      const initialProducts = [
        {
          id: 'SKU-001',
          sku: 'Premium CTC Tea 250 g',
          company: 'Company A',
          category: 'Beverages',
          batch: 'B26-10-A',
          mrp: 125.0,
          purchase_rate: 95.0,
          sell_rate: 108.0,
          godown_stock: 840,
          van_stock: 156,
          cover_days: 14,
          expiry_date: '15 Aug 2027',
          status: 'Healthy',
        },
        {
          id: 'SKU-002',
          sku: 'Glucose Biscuit ₹10 pack',
          company: 'Company B',
          category: 'Foods & Confectionery',
          batch: 'B26-09-F',
          mrp: 10.0,
          purchase_rate: 7.2,
          sell_rate: 8.4,
          godown_stock: 2400,
          van_stock: 492,
          cover_days: 18,
          expiry_date: '10 Feb 2027',
          status: 'Healthy',
        },
        {
          id: 'SKU-003',
          sku: 'Soft drink 600 ml Pet',
          company: 'Company C',
          category: 'Beverages',
          batch: 'B26-08-C',
          mrp: 40.0,
          purchase_rate: 31.0,
          sell_rate: 36.0,
          godown_stock: 180,
          van_stock: 44,
          cover_days: 3,
          expiry_date: '28 Nov 2026',
          status: 'Low Cover (< 5 d)',
        },
        {
          id: 'SKU-004',
          sku: 'Floor Cleaner 1L Citrus',
          company: 'Company D',
          category: 'Home Care',
          batch: 'B26-07-D',
          mrp: 145.0,
          purchase_rate: 108.0,
          sell_rate: 122.0,
          godown_stock: 45,
          van_stock: 12,
          cover_days: 2,
          expiry_date: '15 Dec 2026',
          status: 'Low Cover (< 5 d)',
        },
        {
          id: 'SKU-005',
          sku: 'Potato Crisps ₹10 Masala',
          company: 'Company B',
          category: 'Foods & Confectionery',
          batch: 'B26-05-B',
          mrp: 10.0,
          purchase_rate: 7.4,
          sell_rate: 8.5,
          godown_stock: 120,
          van_stock: 0,
          cover_days: 6,
          expiry_date: '20 Nov 2026',
          status: 'Near Expiry (40 d)',
        },
        {
          id: 'SKU-006',
          sku: 'Moisturizing Soap 4-pack',
          company: 'Company A',
          category: 'Personal Care',
          batch: 'B26-09-M',
          mrp: 140.0,
          purchase_rate: 105.0,
          sell_rate: 120.0,
          godown_stock: 620,
          van_stock: 48,
          cover_days: 12,
          expiry_date: '12 Sep 2027',
          status: 'Healthy',
        },
      ];

      for (const p of initialProducts) {
        await query(
          `INSERT INTO products (
            id, sku, company, category, batch, mrp, purchase_rate, sell_rate,
            godown_stock, van_stock, cover_days, expiry_date, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            p.id,
            p.sku,
            p.company,
            p.category,
            p.batch,
            p.mrp,
            p.purchase_rate,
            p.sell_rate,
            p.godown_stock,
            p.van_stock,
            p.cover_days,
            p.expiry_date,
            p.status,
          ]
        );
      }
      console.log('📦 Initial products & godown inventory seeded in Neon DB');
    }

    // Seed initial orders & order items if empty
    const checkOrders = await query('SELECT COUNT(*) FROM orders');
    if (parseInt(checkOrders.rows[0].count, 10) === 0) {
      const initialOrders = [
        {
          id: 'SO-61208',
          outlet_name: 'Gupta Kirana Store',
          outlet_class: 'A',
          route: 'R4 Gandhi Nagar',
          source: 'Salesman · Rakesh',
          lines_count: 4,
          total_value: 6871,
          scheme_saving: 420,
          checks: 'OK',
          delivery_date: 'Sat, 10 Oct',
          gstin: '09AAECG1234F1Z8',
          balance_due: 4200,
          credit_limit: 25000,
          items: [
            { sku: 'Premium CTC Tea 250 g', qty: '2 cs (48 pc)', units: 48, rate: 108.0, mrp: 125, scheme: 'QPS 2%', amount: 5080, is_must_sell: true },
            { sku: 'Glucose Biscuit ₹10 pack', qty: '1 cs (60 pc)', units: 60, rate: 8.4, mrp: 10, scheme: '12+1 free', amount: 504, is_must_sell: false },
            { sku: 'Bio Detergent Powder 1 kg', qty: '6 pc', units: 6, rate: 96.5, mrp: 110, scheme: '—', amount: 579, is_must_sell: false },
            { sku: 'Moisturizing Soap 4-pack', qty: '6 pc', units: 6, rate: 118.0, mrp: 140, scheme: 'Free 75 g soap', amount: 708, is_must_sell: false },
          ],
        },
        {
          id: 'SO-61211',
          outlet_name: 'Shree Ram General',
          outlet_class: 'A',
          route: 'R4 Gandhi Nagar',
          source: 'Retailer app',
          lines_count: 5,
          total_value: 11920,
          scheme_saving: 960,
          checks: 'OK',
          delivery_date: 'Sat, 10 Oct',
          gstin: '09AAAFR9876C1Z3',
          balance_due: 8450,
          credit_limit: 30000,
          items: [
            { sku: 'Instant Noodles 4-pack', qty: '3 cs (72 pc)', units: 72, rate: 42.0, mrp: 50, scheme: 'Special 5%', amount: 3024, is_must_sell: true },
            { sku: 'Premium CTC Tea 250 g', qty: '2 cs (48 pc)', units: 48, rate: 108.0, mrp: 125, scheme: 'QPS 2%', amount: 5080, is_must_sell: false },
            { sku: 'Potato Crisps ₹10', qty: '2 cs (80 pc)', units: 80, rate: 8.5, mrp: 10, scheme: '15+1', amount: 680, is_must_sell: false },
            { sku: 'Floor Cleaner 1L Citrus', qty: '12 pc', units: 12, rate: 125.0, mrp: 145, scheme: '₹10 off/pc', amount: 1500, is_must_sell: true },
            { sku: 'Dishwash Gel 500ml', qty: '18 pc', units: 18, rate: 91.0, mrp: 105, scheme: 'Free Scrubber', amount: 1636, is_must_sell: false },
          ],
        },
        {
          id: 'SO-61215',
          outlet_name: 'New Bharat Stores',
          outlet_class: 'B',
          route: 'R2 Station Rd',
          source: 'Salesman · Anil',
          lines_count: 3,
          total_value: 5310,
          scheme_saving: 180,
          checks: 'Credit hold',
          delivery_date: 'Sat, 10 Oct',
          gstin: '09AABCN4421D1Z9',
          balance_due: 26400,
          credit_limit: 25000,
          items: [
            { sku: 'Washing Bar 250g (Pack of 4)', qty: '1 cs (36 pc)', units: 36, rate: 45.0, mrp: 55, scheme: '—', amount: 1620, is_must_sell: false },
            { sku: 'Cooking Oil 1L Pouch', qty: '2 cs (24 pc)', units: 24, rate: 145.0, mrp: 160, scheme: '₹180 off slab', amount: 3300, is_must_sell: false },
            { sku: 'Toothpaste 150g', qty: '3 pc', units: 3, rate: 130.0, mrp: 150, scheme: '—', amount: 390, is_must_sell: false },
          ],
        },
        {
          id: 'SO-61219',
          outlet_name: 'Hotel Sagar (HoReCa)',
          outlet_class: 'HoReCa',
          route: 'R1 Civil Lines',
          source: 'Phone',
          lines_count: 3,
          total_value: 14200,
          scheme_saving: 0,
          checks: 'OK',
          delivery_date: 'Sat, 10 Oct',
          gstin: '09AAECB7829M1ZP',
          balance_due: 0,
          credit_limit: 50000,
          items: [
            { sku: 'Refined Soybean Oil 15L Tin', qty: '4 tins', units: 4, rate: 2150.0, mrp: 2350, scheme: 'Commercial Rate', amount: 8600, is_must_sell: false },
            { sku: 'Basmati Rice 25kg Bag', qty: '2 bags', units: 2, rate: 2400.0, mrp: 2650, scheme: '—', amount: 4800, is_must_sell: false },
            { sku: 'CTC Tea 5kg Catering Pack', qty: '1 pack', units: 1, rate: 800.0, mrp: 950, scheme: '—', amount: 800, is_must_sell: false },
          ],
        },
      ];

      for (const ord of initialOrders) {
        await query(
          `INSERT INTO orders (
            id, outlet_name, outlet_class, route, source, lines_count,
            total_value, scheme_saving, checks, delivery_date, gstin, balance_due, credit_limit
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            ord.id,
            ord.outlet_name,
            ord.outlet_class,
            ord.route,
            ord.source,
            ord.lines_count,
            ord.total_value,
            ord.scheme_saving,
            ord.checks,
            ord.delivery_date,
            ord.gstin,
            ord.balance_due,
            ord.credit_limit,
          ]
        );

        for (const it of ord.items) {
          await query(
            `INSERT INTO order_items (
              order_id, sku, qty, units, rate, mrp, scheme, amount, is_must_sell
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              ord.id,
              it.sku,
              it.qty,
              it.units,
              it.rate,
              it.mrp,
              it.scheme,
              it.amount,
              it.is_must_sell,
            ]
          );
        }
      }
      console.log('🛒 Initial orders and order items seeded in Neon DB');
    }

    // Seed initial van settlements if empty
    const checkSettlements = await query('SELECT COUNT(*) FROM van_settlements');
    if (parseInt(checkSettlements.rows[0].count, 10) === 0) {
      const initialSettlements = [
        {
          id: 'SETTLE-VAN2-1009',
          van_no: 'Van 2 (UP32-AK-4412)',
          salesman_name: 'Imran Khan',
          salesman_phone: '98263 77112',
          route: 'R6 Industrial Area',
          settlement_date: 'Fri 9 Oct',
          loaded_time: '08:10',
          returned_time: '19:25',
          total_billed_value: 48620.0,
          cash_collected: 31200.0,
          upi_collected: 8800.0,
          cheque_collected: 4500.0,
          credit_sales: 2880.0,
          expected_cash: 32440.0,
          cash_variance: -1240.0,
          crates_loaded: 45,
          crates_returned: 42,
          crates_variance: -3,
          status: 'Pending',
          items: [
            { sku: 'Floor Cleaner 1L Citrus', loaded: 36, sold: 28, free_scheme: 2, good_return: 2, damage_in: 0, expected_back: 8, counted_back: 8, variance: 0, rate: 122.0 },
            { sku: 'Refined Oil 15L Tin', loaded: 12, sold: 10, free_scheme: 0, good_return: 0, damage_in: 0, expected_back: 2, counted_back: 2, variance: 0, rate: 2150.0 },
            { sku: 'Glucose Biscuit ₹10 pack', loaded: 120, sold: 98, free_scheme: 8, good_return: 0, damage_in: 1, expected_back: 14, counted_back: 13, variance: -1, rate: 8.4 },
            { sku: 'Bio Detergent g', loaded: 48, sold: 34, free_scheme: 2, good_return: 1, damage_in: 0, expected_back: 13, counted_back: 13, variance: 0, rate: 96.5 },
            { sku: 'Premium CTC Tea 250 g', loaded: 60, sold: 48, free_scheme: 0, good_return: 0, damage_in: 0, expected_back: 12, counted_back: 12, variance: 0, rate: 108.0 },
            { sku: 'Moisturizing Soap 4-pack', loaded: 40, sold: 30, free_scheme: 4, good_return: 0, damage_in: 1, expected_back: 6, counted_back: 6, variance: 0, rate: 118.0 },
          ],
        },
      ];

      for (const st of initialSettlements) {
        await query(
          `INSERT INTO van_settlements (
            id, van_no, salesman_name, salesman_phone, route, settlement_date,
            loaded_time, returned_time, total_billed_value, cash_collected, upi_collected,
            cheque_collected, credit_sales, expected_cash, cash_variance, crates_loaded,
            crates_returned, crates_variance, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
          [
            st.id,
            st.van_no,
            st.salesman_name,
            st.salesman_phone,
            st.route,
            st.settlement_date,
            st.loaded_time,
            st.returned_time,
            st.total_billed_value,
            st.cash_collected,
            st.upi_collected,
            st.cheque_collected,
            st.credit_sales,
            st.expected_cash,
            st.cash_variance,
            st.crates_loaded,
            st.crates_returned,
            st.crates_variance,
            st.status,
          ]
        );

        for (const item of st.items) {
          await query(
            `INSERT INTO van_settlement_items (
              settlement_id, sku, loaded, sold, free_scheme, good_return,
              damage_in, expected_back, counted_back, variance, rate
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              st.id,
              item.sku,
              item.loaded,
              item.sold,
              item.free_scheme,
              item.good_return,
              item.damage_in,
              item.expected_back,
              item.counted_back,
              item.variance,
              item.rate,
            ]
          );
        }
      }
      console.log('🚚 Initial van settlements seeded in Neon DB');
    }

    // Seed initial collections if empty
    const checkCollections = await query('SELECT COUNT(*) FROM collections');
    if (parseInt(checkCollections.rows[0].count, 10) === 0) {
      const initialCollections = [
        {
          id: 'REC-202610-001',
          outlet_id: 'OUT-101',
          outlet_name: 'Gupta Kirana Store',
          route: 'R4 Gandhi Nagar',
          salesman_name: 'Rakesh Sharma',
          amount_collected: 8500.0,
          payment_mode: 'UPI',
          reference_no: 'UPI/6289190210/HDFC',
          bank_name: 'HDFC Bank',
          clearing_date: '09 Oct 2026',
          status: 'Cleared',
          previous_outstanding: 12700.0,
          new_outstanding: 4200.0,
          remarks: 'Daily market settlement via BharatPe QR',
        },
        {
          id: 'REC-202610-002',
          outlet_id: 'OUT-102',
          outlet_name: 'Shree Ram General',
          route: 'R4 Gandhi Nagar',
          salesman_name: 'Rakesh Sharma',
          amount_collected: 15000.0,
          payment_mode: 'Cheque',
          reference_no: 'CHQ-991204',
          bank_name: 'State Bank of India',
          clearing_date: '10 Oct 2026',
          status: 'Pending Bank',
          previous_outstanding: 23450.0,
          new_outstanding: 8450.0,
          remarks: 'PDC cheque deposited in clearing drop-box',
        },
        {
          id: 'REC-202610-003',
          outlet_id: 'OUT-105',
          outlet_name: 'Ma Durga Traders',
          route: 'R3 Old Market',
          salesman_name: 'Anil Verma',
          amount_collected: 25000.0,
          payment_mode: 'NEFT',
          reference_no: 'NEFT-N261009871',
          bank_name: 'ICICI Bank',
          clearing_date: '08 Oct 2026',
          status: 'Cleared',
          previous_outstanding: 70000.0,
          new_outstanding: 45000.0,
          remarks: 'RTGS clearance against Invoice #61189',
        },
        {
          id: 'REC-202610-004',
          outlet_id: 'OUT-103',
          outlet_name: 'New Bharat Stores',
          route: 'R2 Station Rd',
          salesman_name: 'Anil Verma',
          amount_collected: 5000.0,
          payment_mode: 'Cash',
          reference_no: 'CSH-REC-4412',
          bank_name: '—',
          clearing_date: '09 Oct 2026',
          status: 'Cleared',
          previous_outstanding: 31400.0,
          new_outstanding: 26400.0,
          remarks: 'Partial recovery against overdue balance',
        },
      ];

      for (const col of initialCollections) {
        await query(
          `INSERT INTO collections (
            id, outlet_id, outlet_name, route, salesman_name, amount_collected,
            payment_mode, reference_no, bank_name, clearing_date, status,
            previous_outstanding, new_outstanding, remarks
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            col.id,
            col.outlet_id,
            col.outlet_name,
            col.route,
            col.salesman_name,
            col.amount_collected,
            col.payment_mode,
            col.reference_no,
            col.bank_name,
            col.clearing_date,
            col.status,
            col.previous_outstanding,
            col.new_outstanding,
            col.remarks,
          ]
        );
      }
      console.log('💳 Initial collections and market receipts seeded in Neon DB');
    }

    // Seed initial claims if empty
    const checkClaims = await query('SELECT COUNT(*) FROM claims');
    if (parseInt(checkClaims.rows[0].count, 10) === 0) {
      const initialClaims = [
        {
          id: 'CL-26-086',
          company: 'Company B',
          claim_type: 'Scheme',
          period: 'Aug 2026',
          amount: 48620.0,
          approved_amount: 0.0,
          status: 'Query raised',
          age_days: 14,
          query_text: '3 invoices outside promotion period; retailer sign missing',
          query_response: 'Invoices verified against dispatch log and re-attached',
          due_days_left: 4,
          items: [
            { invoice_no: 'SO-61208', outlet_name: 'Gupta Kirana Store', sku: 'Glucose Biscuit ₹10 pack', claim_basis: '12+1 Scheme Free Pack', amount: 504.0 },
            { invoice_no: 'SO-61211', outlet_name: 'Shree Ram General', sku: 'Potato Crisps ₹10', claim_basis: '15+1 Scheme Free Pack', amount: 680.0 },
          ],
        },
        {
          id: 'CL-26-085',
          company: 'Company A',
          claim_type: 'Damage & Expiry',
          period: 'Jul 2026',
          amount: 18240.0,
          approved_amount: 18240.0,
          credit_note_no: 'CN-HUL-2026-9921',
          status: 'Credit note recd.',
          age_days: 42,
          query_text: null,
          due_days_left: 0,
          items: [
            { invoice_no: 'SO-61190', outlet_name: 'Hotel Sagar (HoReCa)', sku: 'Refined Soybean Oil 15L Tin', claim_basis: 'Transit Canister Dent / Leakage', amount: 2150.0 },
          ],
        },
        {
          id: 'CL-26-084',
          company: 'Company C',
          claim_type: 'Scheme',
          period: 'Jul 2026',
          amount: 62400.0,
          approved_amount: 0.0,
          status: 'Audit done',
          age_days: 58,
          query_text: null,
          due_days_left: 0,
          items: [],
        },
        {
          id: 'CL-26-083',
          company: 'Company D',
          claim_type: 'Display',
          period: 'Q1 FY27',
          amount: 15000.0,
          approved_amount: 15000.0,
          credit_note_no: 'CN-ITC-26-4401',
          status: 'Credit note recd.',
          age_days: 71,
          query_text: null,
          due_days_left: 0,
          items: [],
        },
        {
          id: 'CL-26-082',
          company: 'Company A',
          claim_type: 'Scheme',
          period: 'Jun 2026',
          amount: 51200.0,
          approved_amount: 0.0,
          status: 'Submitted',
          age_days: 96,
          query_text: null,
          due_days_left: 0,
          items: [],
        },
      ];

      for (const clm of initialClaims) {
        await query(
          `INSERT INTO claims (
            id, company, claim_type, period, amount, approved_amount,
            credit_note_no, status, age_days, query_text, query_response, due_days_left
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            clm.id,
            clm.company,
            clm.claim_type,
            clm.period,
            clm.amount,
            clm.approved_amount,
            clm.credit_note_no || null,
            clm.status,
            clm.age_days,
            clm.query_text,
            clm.query_response || null,
            clm.due_days_left,
          ]
        );

        for (const it of clm.items) {
          await query(
            `INSERT INTO claim_items (claim_id, invoice_no, outlet_name, sku, claim_basis, amount)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [clm.id, it.invoice_no, it.outlet_name, it.sku, it.claim_basis, it.amount]
          );
        }
      }
      console.log('📑 Initial claims and evidence packs seeded in Neon DB');
    }

    // Seed initial schemes if empty
    const checkSchemes = await query('SELECT COUNT(*) FROM schemes');
    if (parseInt(checkSchemes.rows[0].count, 10) === 0) {
      const initialSchemes = [
        {
          id: 'SCH-01',
          company: 'Company A',
          title: 'QPS 2% Turnover Incentive',
          scheme_type: 'Quantity Purchase Scheme',
          rule_description: '2% invoice rebate on gross purchase above ₹5,000 across Personal Care SKUs',
          funded_by: 'Company-funded (Claimable)',
          budget: 600000.0,
          utilized: 482300.0,
          valid_from: '01 Oct 2026',
          valid_to: '31 Oct 2026',
          outlet_filter: 'All Classes (A, B, C)',
          discount_percent: 2.0,
          discount_amount: 0.0,
          free_sku: null,
          status: 'Active',
        },
        {
          id: 'SCH-02',
          company: 'Company B',
          title: 'Biscuits 12+1 Free Goods',
          scheme_type: 'Free Goods',
          rule_description: 'Order 12 cases of Glucose ₹10 pack, receive 1 case complimentary free stock',
          funded_by: 'Company-funded (Claimable)',
          budget: 350000.0,
          utilized: 214600.0,
          valid_from: '01 Oct 2026',
          valid_to: '31 Oct 2026',
          outlet_filter: 'General Trade & Wholesale',
          discount_percent: 0.0,
          discount_amount: 0.0,
          free_sku: 'Glucose Biscuit ₹10 pack',
          status: 'Active',
        },
        {
          id: 'SCH-03',
          company: 'Company C',
          title: 'Visicooler Display Visibility',
          scheme_type: 'Display / Visibility',
          rule_description: 'Flat ₹500/month payout per verified chiller adhering to 100% brand planogram',
          funded_by: 'Company-funded (Claimable)',
          budget: 150000.0,
          utilized: 68000.0,
          valid_from: '01 Aug 2026',
          valid_to: '31 Oct 2026',
          outlet_filter: 'Approved Cooler Outlets',
          discount_percent: 0.0,
          discount_amount: 500.0,
          free_sku: null,
          status: 'Active',
        },
        {
          id: 'SCH-04',
          company: 'Company D',
          title: 'Combo Pack: Bio Detergent + Bar',
          scheme_type: 'Combo Bundle',
          rule_description: 'Buy 6 pcs Detergent 1kg, get 1 pack Moisturizing Soap 75g complimentary',
          funded_by: 'Distributor-funded (Shared Margin)',
          budget: 80000.0,
          utilized: 42100.0,
          valid_from: '05 Oct 2026',
          valid_to: '20 Oct 2026',
          outlet_filter: 'Urban Beats (R1, R4)',
          discount_percent: 0.0,
          discount_amount: 0.0,
          free_sku: 'Moisturizing Soap 4-pack',
          status: 'Active',
        },
      ];

      for (const s of initialSchemes) {
        await query(
          `INSERT INTO schemes (
            id, company, title, scheme_type, rule_description, funded_by,
            budget, utilized, valid_from, valid_to, outlet_filter,
            discount_percent, discount_amount, free_sku, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            s.id,
            s.company,
            s.title,
            s.scheme_type,
            s.rule_description,
            s.funded_by,
            s.budget,
            s.utilized,
            s.valid_from,
            s.valid_to,
            s.outlet_filter,
            s.discount_percent,
            s.discount_amount,
            s.free_sku,
            s.status,
          ]
        );
      }
      console.log('🎁 Initial trade schemes seeded in Neon DB');
    }

    // Seed initial purchase orders if empty
    const checkPOs = await query('SELECT COUNT(*) FROM purchase_orders');
    if (parseInt(checkPOs.rows[0].count, 10) === 0) {
      const initialPOs = [
        {
          id: 'PO-2026-091',
          company: 'Company A · Personal Care',
          order_date: '08 Oct 2026',
          expected_delivery: '10 Oct 2026',
          items_count: 42,
          gross_value: 1250000.0,
          tax_amount: 190678.0,
          e_invoice_irn: '4c8e718290fa...b901',
          e_way_bill: 'EWB-281900192',
          status: 'Goods in Transit',
          shortage_amount: 0.0,
          grn_date: null,
          items: [
            { sku: 'Moisturizing Soap 4-pack', batch_no: 'B26-09-M', ordered_cases: 200, received_cases: 200, unit_rate: 105.0, taxable_amount: 21000.0 },
            { sku: 'Premium CTC Tea 250 g', batch_no: 'B26-10-A', ordered_cases: 300, received_cases: 300, unit_rate: 95.0, taxable_amount: 28500.0 },
          ],
        },
        {
          id: 'PO-2026-088',
          company: 'Company B · Foods & Confectionery',
          order_date: '06 Oct 2026',
          expected_delivery: '08 Oct 2026',
          items_count: 65,
          gross_value: 1840000.0,
          tax_amount: 280678.0,
          e_invoice_irn: '9a1f29012a...d432',
          e_way_bill: 'EWB-281900144',
          status: 'GRN Completed',
          shortage_amount: 0.0,
          grn_date: '08 Oct 2026',
          items: [
            { sku: 'Glucose Biscuit ₹10 pack', batch_no: 'B26-09-F', ordered_cases: 800, received_cases: 800, unit_rate: 7.2, taxable_amount: 5760.0 },
          ],
        },
        {
          id: 'PO-2026-085',
          company: 'Company C · Beverages',
          order_date: '05 Oct 2026',
          expected_delivery: '07 Oct 2026',
          items_count: 18,
          gross_value: 620000.0,
          tax_amount: 94576.0,
          e_invoice_irn: '7e2c98811...a118',
          e_way_bill: 'EWB-281900112',
          status: 'GRN Completed (Shortage Claimed)',
          shortage_amount: 34200.0,
          grn_date: '07 Oct 2026',
          items: [
            { sku: 'Soft drink 600 ml Pet', batch_no: 'B26-08-C', ordered_cases: 150, received_cases: 146, unit_rate: 31.0, taxable_amount: 4526.0 },
          ],
        },
        {
          id: 'PO-2026-082',
          company: 'Company D · Home Care',
          order_date: '02 Oct 2026',
          expected_delivery: '04 Oct 2026',
          items_count: 30,
          gross_value: 910000.0,
          tax_amount: 138813.0,
          e_invoice_irn: '2b4a17721...e773',
          e_way_bill: 'EWB-281900088',
          status: 'Settled & Paid',
          shortage_amount: 0.0,
          grn_date: '04 Oct 2026',
          items: [
            { sku: 'Floor Cleaner 1L Citrus', batch_no: 'B26-07-D', ordered_cases: 80, received_cases: 80, unit_rate: 108.0, taxable_amount: 8640.0 },
          ],
        },
      ];

      for (const po of initialPOs) {
        await query(
          `INSERT INTO purchase_orders (
            id, company, order_date, expected_delivery, items_count, gross_value,
            tax_amount, e_invoice_irn, e_way_bill, status, shortage_amount, grn_date
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            po.id,
            po.company,
            po.order_date,
            po.expected_delivery,
            po.items_count,
            po.gross_value,
            po.tax_amount,
            po.e_invoice_irn,
            po.e_way_bill,
            po.status,
            po.shortage_amount,
            po.grn_date,
          ]
        );

        for (const it of po.items) {
          await query(
            `INSERT INTO purchase_order_items (
              po_id, sku, batch_no, ordered_cases, received_cases, unit_rate, taxable_amount
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [po.id, it.sku, it.batch_no, it.ordered_cases, it.received_cases, it.unit_rate, it.taxable_amount]
          );
        }
      }
      console.log('📦 Initial purchase orders and GRN records seeded in Neon DB');
    }

    // Seed initial bank accounts if empty
    const checkBank = await query('SELECT COUNT(*) FROM bank_accounts');
    if (parseInt(checkBank.rows[0].count, 10) === 0) {
      const initialBankAccounts = [
        {
          id: 'BANK-01',
          account_name: 'HDFC Bank Primary Current A/c',
          account_number: '50200038928192',
          bank_name: 'HDFC Bank',
          account_type: 'Current Account',
          balance: 3840000.0,
          reconciled_date: '08 Oct 2026',
        },
        {
          id: 'BANK-02',
          account_name: 'ICICI Bank Overdraft (OD) Facility',
          account_number: '001905008271',
          bank_name: 'ICICI Bank',
          account_type: 'Overdraft Account',
          balance: 820000.0,
          reconciled_date: '08 Oct 2026',
        },
        {
          id: 'BANK-03',
          account_name: 'Depot Main Cash Safe / Vault',
          account_number: 'CASH-VAULT-01',
          bank_name: 'Cash in Hand',
          account_type: 'Cash Account',
          balance: 160000.0,
          reconciled_date: '09 Oct 2026',
        },
      ];

      for (const b of initialBankAccounts) {
        await query(
          `INSERT INTO bank_accounts (id, account_name, account_number, bank_name, account_type, balance, reconciled_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [b.id, b.account_name, b.account_number, b.bank_name, b.account_type, b.balance, b.reconciled_date]
        );
      }
      console.log('🏦 Initial bank accounts seeded in Neon DB');
    }

    // Seed initial expenses if empty
    const checkExpenses = await query('SELECT COUNT(*) FROM expenses');
    if (parseInt(checkExpenses.rows[0].count, 10) === 0) {
      const initialExpenses = [
        {
          id: 'EXP-2026-001',
          category: 'Salaries & Incentives',
          description: 'Salesmen & Driver monthly salary + beat incentive payout',
          amount: 220000.0,
          payment_mode: 'NEFT / Bank Transfer',
          expense_date: '05 Oct 2026',
          paid_to: 'Field Staff Payroll Ledger',
          voucher_ref: 'VCH-SAL-OCT',
        },
        {
          id: 'EXP-2026-002',
          category: 'Vehicle & Fuel',
          description: 'Weekly Diesel fuel recharge for Delivery Vans V1 to V4',
          amount: 45000.0,
          payment_mode: 'UPI / Fleet Card',
          expense_date: '07 Oct 2026',
          paid_to: 'Indian Oil Depot Outlet',
          voucher_ref: 'VCH-FUEL-092',
        },
        {
          id: 'EXP-2026-003',
          category: 'Rent, Power & Warehouse',
          description: 'Godown electricity bill & cold room chiller power',
          amount: 32000.0,
          payment_mode: 'Net Banking',
          expense_date: '06 Oct 2026',
          paid_to: 'State Electricity Board',
          voucher_ref: 'VCH-ELEC-SEP',
        },
        {
          id: 'EXP-2026-004',
          category: 'Vehicle & Fuel',
          description: 'Van V2 brake pad replacement & servicing maintenance',
          amount: 14500.0,
          payment_mode: 'Cash',
          expense_date: '08 Oct 2026',
          paid_to: 'National Auto Garage',
          voucher_ref: 'VCH-VEH-104',
        },
      ];

      for (const e of initialExpenses) {
        await query(
          `INSERT INTO expenses (id, category, description, amount, payment_mode, expense_date, paid_to, voucher_ref)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [e.id, e.category, e.description, e.amount, e.payment_mode, e.expense_date, e.paid_to, e.voucher_ref]
        );
      }
      console.log('🧾 Initial expenses seeded in Neon DB');
    }

    // Seed default settings row if empty
    const checkSettings = await query('SELECT COUNT(*) FROM settings');
    if (parseInt(checkSettings.rows[0].count, 10) === 0) {
      await query(`
        INSERT INTO settings (
          id, distributor_name, depot_address, contact_phone, contact_email,
          gstin, fssai_licence, pan_number, eway_threshold, mandatory_van_settle,
          credit_ceiling_enforce, period_lock_month, connector_comp_a,
          connector_comp_b, connector_comp_c, connector_tally
        ) VALUES (
          'fmcg_distributor_settings',
          'Shree Balaji FMCG Distributors',
          'Depot #4, Transport Nagar, Station Road, Kanpur',
          '+91 98260 99887',
          'operations@balajidistributors.in',
          '09AAAFR0123M1ZV',
          '10023400192837',
          'AAAFR0123M',
          50000.00,
          true,
          true,
          'September 2026',
          true,
          true,
          true,
          true
        )
      `);
      console.log('⚙️ Default settings initialized in Neon DB');
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}
