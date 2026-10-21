import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import salesmanRoutes from './routes/salesman.routes';
import outletRoutes from './routes/outlet.routes';
import productRoutes from './routes/product.routes';
import orderRoutes from './routes/order.routes';
import vanSalesRoutes from './routes/van-sales.routes';
import collectionRoutes from './routes/collection.routes';
import claimRoutes from './routes/claim.routes';
import schemeRoutes from './routes/scheme.routes';
import purchaseRoutes from './routes/purchase.routes';
import accountsRoutes from './routes/accounts.routes';
import reportsRoutes from './routes/reports.routes';
import settingsRoutes from './routes/settings.routes';
import dashboardRoutes from './routes/dashboard.routes';
import searchRoutes from './routes/search.routes';
import deliveryRoutes from './routes/delivery.routes';
import { initDB } from './models/initDB';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/salesmen', salesmanRoutes);
app.use('/api/outlets', outletRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/van-sales', vanSalesRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/delivery', deliveryRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'fmcg-distributor-backend', timestamp: new Date() });
});

// Start Server and initialize Database
async function startServer() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
