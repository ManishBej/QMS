import { Router } from 'express';
import ExcelJS from 'exceljs';
import { authenticate } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';
import RFQ from '../models/RFQ.js';
import Quote from '../models/Quote.js';
import { connectDb } from '../config/db.js';

const router = Router();

// Export RFQ with quotes to Excel
router.get('/reports/export', authenticate, async (req, res) => {
  try {
    await connectDb();
    const { rfqId } = req.query;
    
    if (!rfqId) {
      return res.status(400).json({ 
        error: 'validation_error',
        message: 'RFQ ID is required' 
      });
    }
    
    // Find RFQ with quotes
    const rfq = await RFQ.findById(rfqId).populate('createdBy', 'username');
    if (!rfq) {
      return res.status(404).json({ 
        error: 'not_found',
        message: 'RFQ not found' 
      });
    }
    
    // Find quotes for this RFQ
    const quotes = await Quote.find({ rfqId });
    
    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('RFQ Comparison');
    
    // Add headers
    const headers = ['SKU/Description', 'Quantity', 'Unit'];
    const supplierColumns = quotes.map(quote => quote.supplierName);
    headers.push(...supplierColumns);
    
    worksheet.addRow(headers);
    
    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Add RFQ items with quote prices
    rfq.items.forEach(item => {
      const row = [item.sku || item.description, item.quantity, item.unit];
      
      // Add prices from each quote
      quotes.forEach(quote => {
        const quoteItem = quote.items.find(qi => 
          (qi.sku && qi.sku.toLowerCase() === (item.sku || '').toLowerCase()) ||
          (qi.description && qi.description.toLowerCase() === item.description.toLowerCase())
        );
        row.push(quoteItem ? quoteItem.unitPrice : 'N/A');
      });
      
      worksheet.addRow(row);
    });
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = Math.max(column.width || 10, 15);
    });
    
    // Add summary information
    worksheet.addRow([]);
    worksheet.addRow(['RFQ Information:']);
    worksheet.addRow(['Title:', rfq.title]);
    worksheet.addRow(['Description:', rfq.description]);
    worksheet.addRow(['Created By:', rfq.createdBy?.username || 'Unknown']);
    worksheet.addRow(['Created Date:', new Date(rfq.createdAt).toLocaleDateString()]);
    worksheet.addRow(['Number of Quotes:', quotes.length]);
    
    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="rfq-${rfqId}-comparison.xlsx"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    
    // Write to response
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    console.error('Export RFQ error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'internal_server_error',
        message: 'Failed to export RFQ data' 
      });
    }
  }
});

// Get dashboard reports data
router.get('/reports/dashboard', authenticate, async (req, res) => {
  try {
    await connectDb();
    
    const [rfqCount, quoteCount, recentRfqs] = await Promise.all([
      RFQ.countDocuments(),
      Quote.countDocuments(),
      RFQ.find()
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);
    
    // Calculate average quotes per RFQ
    const rfqsWithQuoteCounts = await RFQ.aggregate([
      {
        $lookup: {
          from: 'quotes',
          localField: '_id',
          foreignField: 'rfqId',
          as: 'quotes'
        }
      },
      {
        $project: {
          quoteCount: { $size: '$quotes' }
        }
      },
      {
        $group: {
          _id: null,
          avgQuotes: { $avg: '$quoteCount' }
        }
      }
    ]);
    
    const avgQuotesPerRfq = rfqsWithQuoteCounts[0]?.avgQuotes || 0;
    
    res.json({
      success: true,
      data: {
        summary: {
          totalRfqs: rfqCount,
          totalQuotes: quoteCount,
          averageQuotesPerRfq: Math.round(avgQuotesPerRfq * 100) / 100
        },
        recentRfqs
      }
    });
    
  } catch (error) {
    console.error('Get dashboard reports error:', error);
    res.status(500).json({ 
      error: 'internal_server_error',
      message: 'Failed to fetch dashboard data' 
    });
  }
});

export default router;
