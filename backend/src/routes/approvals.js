import { Router } from 'express';
import { connectDb } from '../config/db.js';
import RFQ from '../models/RFQ.js';
import Approval from '../models/Approval.js';
import { authenticate } from '../middleware/auth.js';
import requireRole from '../middleware/roles.js';

const router = Router();

// Sequential approval endpoint
// POST /api/rfqs/:id/approvals { sequence, remarks }
router.post('/rfqs/:id/approvals', authenticate, requireRole(['procurement','admin']), async (req, res) => {
  try {
    await connectDb();
    const { sequence, remarks } = req.body || {};
    if (sequence === undefined || sequence === null) return res.status(400).json({ error: 'missing_sequence' });
    const rfq = await RFQ.findById(req.params.id);
    if (!rfq) return res.status(404).json({ error: 'rfq_not_found' });

    // Fetch existing approvals ordered
    const existing = await Approval.find({ rfq: rfq._id }).sort({ sequence: 1 });
    const expectedNext = existing.length === 0 ? 1 : existing[existing.length - 1].sequence + 1;
    if (sequence !== expectedNext) {
      return res.status(400).json({ error: 'sequence_violation', message: `Next required sequence is ${expectedNext}` });
    }

    const approval = await Approval.create({ rfq: rfq._id, sequence, approverUser: req.user.sub, remarks });
    res.status(201).json({ id: approval._id, sequence: approval.sequence, approverUser: approval.approverUser, approvedAt: approval.approvedAt });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
