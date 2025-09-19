import mongoose from 'mongoose';

const quoteItemSchema = new mongoose.Schema({
  productText: { type: String, required: true, trim: true },
  productId: { type: String, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  uom: { type: String, required: true, trim: true },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  deliveryDays: { type: Number, min: 0 },
  
  // Additional cost components from prototype
  freight: { type: Number, default: 0, min: 0 },
  insurance: { type: Number, default: 0, min: 0 },
  customsDuty: { type: Number, default: 0, min: 0 },
  amc: { type: Number, default: 0, min: 0 },
  warranty: { type: Number, default: 0, min: 0 },
  installation: { type: Number, default: 0, min: 0 },
  training: { type: Number, default: 0, min: 0 },
  taxes: { type: Number, default: 0, min: 0 }
}, { _id: false });

const attachmentSchema = new mongoose.Schema({
  filename: { type: String, required: true, trim: true },
  contentType: { type: String, required: true },
  size: { type: Number, required: true, min: 0 },
  // Store file bytes as MongoDB BinData (Buffer in Node)
  data: { type: Buffer, required: true, select: false },
  checksum: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true, timestamps: false });

const quoteSchema = new mongoose.Schema({
  rfq: { type: mongoose.Schema.Types.ObjectId, ref: 'RFQ', required: true, index: true },
  supplierName: { type: String, required: true, trim: true },
  supplierContact: { type: String, trim: true },
  currency: { type: String, required: true, default: 'INR', uppercase: true },
  
  items: { type: [quoteItemSchema], validate: v => v.length > 0 },
  
  // Total calculations
  subtotal: { type: Number, default: 0, min: 0 },
  totalFreight: { type: Number, default: 0, min: 0 },
  totalInsurance: { type: Number, default: 0, min: 0 },
  totalCustomsDuty: { type: Number, default: 0, min: 0 },
  totalAMC: { type: Number, default: 0, min: 0 },
  totalWarranty: { type: Number, default: 0, min: 0 },
  totalInstallation: { type: Number, default: 0, min: 0 },
  totalTraining: { type: Number, default: 0, min: 0 },
  totalTaxes: { type: Number, default: 0, min: 0 },
  grandTotal: { type: Number, default: 0, min: 0 },
  
  // Scoring and evaluation
  scores: {
    price: { type: Number, min: 0, max: 100 },
    delivery: { type: Number, min: 0, max: 100 },
    vendor: { type: Number, min: 0, max: 100 },
    compliance: { type: Number, min: 0, max: 100 },
    total: { type: Number, min: 0, max: 100 }
  },
  
  notes: { type: String, trim: true },
  status: { type: String, enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'], default: 'DRAFT' },
  
  // Enhanced approval status tracking
  approvalStatus: {
    type: String,
    enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'],
    default: 'SUBMITTED',
    index: true
  },
  approvedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Edit tracking for permission management
  lastEditedAt: { type: Date },
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  editCount: { type: Number, default: 0 },
  
  submittedAt: { type: Date, default: Date.now },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Audit trail
  evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  evaluatedAt: { type: Date }
  
  // Attachments stored as BinData with metadata
  , attachments: { type: [attachmentSchema], default: [] }
}, { timestamps: true });

// Pre-save middleware to calculate totals
quoteSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    this.totalFreight = this.items.reduce((sum, item) => sum + (item.freight || 0), 0);
    this.totalInsurance = this.items.reduce((sum, item) => sum + (item.insurance || 0), 0);
    this.totalCustomsDuty = this.items.reduce((sum, item) => sum + (item.customsDuty || 0), 0);
    this.totalAMC = this.items.reduce((sum, item) => sum + (item.amc || 0), 0);
    this.totalWarranty = this.items.reduce((sum, item) => sum + (item.warranty || 0), 0);
    this.totalInstallation = this.items.reduce((sum, item) => sum + (item.installation || 0), 0);
    this.totalTraining = this.items.reduce((sum, item) => sum + (item.training || 0), 0);
    this.totalTaxes = this.items.reduce((sum, item) => sum + (item.taxes || 0), 0);
    
    this.grandTotal = this.subtotal + this.totalFreight + this.totalInsurance + 
                     this.totalCustomsDuty + this.totalAMC + this.totalWarranty + 
                     this.totalInstallation + this.totalTraining + this.totalTaxes;
  }
  next();
});

export const Quote = mongoose.models.Quote || mongoose.model('Quote', quoteSchema);
export default Quote;
