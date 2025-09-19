import mongoose from 'mongoose';

const approvalSchema = new mongoose.Schema({
  rfq: { type: mongoose.Schema.Types.ObjectId, ref: 'RFQ', required: true, index: true },
  sequence: { type: Number, required: true },
  approverUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['approved'], default: 'approved' },
  remarks: { type: String, trim: true },
  approvedAt: { type: Date, default: Date.now }
}, { timestamps: true });

approvalSchema.index({ rfq: 1, sequence: 1 }, { unique: true });

export const Approval = mongoose.models.Approval || mongoose.model('Approval', approvalSchema);
export default Approval;
