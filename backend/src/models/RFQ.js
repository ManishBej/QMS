import mongoose from 'mongoose';

const rfqItemSchema = new mongoose.Schema({
  productText: { type: String, required: true, trim: true }, // Free text description
  productId: { type: String, trim: true }, // Optional SKU/Product ID
  quantity: { type: Number, required: true, min: 1 },
  uom: { type: String, required: true, default: 'Nos' }, // Unit of Measure
  targetDeliveryDays: { type: Number, min: 0, default: 14 }
}, { _id: false });

const rfqSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  department: { type: String, trim: true, default: 'General' }, // Add department
  currency: { type: String, default: 'INR' }, // Add currency
  description: { type: String, trim: true },
  items: { type: [rfqItemSchema], validate: v => v.length > 0 },
  status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN' },
  config: { // Add scoring weights configuration
    weights: {
      price: { type: Number, default: 0.5 },
      delivery: { type: Number, default: 0.2 },
      vendor: { type: Number, default: 0.2 },
      compliance: { type: Number, default: 0.1 }
    }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Virtual to get quotes for this RFQ
rfqSchema.virtual('quotes', {
  ref: 'Quote',
  localField: '_id',
  foreignField: 'rfq'
});

export const RFQ = mongoose.models.RFQ || mongoose.model('RFQ', rfqSchema);
export default RFQ;
