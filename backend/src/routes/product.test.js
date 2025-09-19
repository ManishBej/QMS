import { Router } from 'express';
import Product from '../models/Product.js';
import { connectDb } from '../config/db.js';

const productTestRouter = Router();

// Create product (POST /api/products-test)
productTestRouter.post('/products-test', async (req, res) => {
  try {
    await connectDb();
    const { name, sku, unit } = req.body;
    if (!name || !sku) {
      return res.status(400).json({ error: 'name and sku required' });
    }
    const doc = await Product.create({ name, sku, unit });
    res.status(201).json({ id: doc._id, name: doc.name, sku: doc.sku, unit: doc.unit });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'sku already exists' });
    }
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// List products (GET /api/products-test)
productTestRouter.get('/products-test', async (_req, res) => {
  try {
    await connectDb();
    const rows = await Product.find({}).sort({ createdAt: -1 }).limit(50).lean();
    res.json(rows.map(r => ({ id: r._id, name: r.name, sku: r.sku, unit: r.unit })));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default productTestRouter;
