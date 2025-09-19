// Excel RFQ Export Controller
// Generates an Excel workbook approximating legacy "FILLED-SHEET 2" structure.
// Endpoint: GET /api/rfqs/:id/export  (auth + procurement/admin roles)

import ExcelJS from 'exceljs';
import RFQ from '../models/RFQ.js';
import Quote from '../models/Quote.js';
import { connectDb } from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mappingPath = path.join(__dirname, '../mapping/mapping.json');
const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));

// Utility: find matching quote line by SKU (case-insensitive)
function findQuoteLine(quote, sku) {
  if (!quote || !Array.isArray(quote.items)) return null;
  const upper = sku.toUpperCase();
  return quote.items.find(li => li.sku.toUpperCase() === upper) || null;
}

export async function exportRfqExcel(req, res) {
  try {
    await connectDb();
    const rfq = await RFQ.findById(req.params.id).lean();
    if (!rfq) return res.status(404).json({ error: 'not_found' });
    // Ensure stable vendor column order (by quote creation time)
    const quotes = await Quote.find({ rfq: rfq._id }).sort({ createdAt: 1 }).lean();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('RFQ Export');

    // Header rows (meta can be expanded later)
    sheet.addRow([`DOC NO - ${rfq._id}`]);
    sheet.addRow([`TITLE - ${rfq.title}`]);
    sheet.addRow([`CREATED - ${rfq.createdAt?.toISOString?.() || ''}`]);
    sheet.addRow([]); // blank

    // Build dynamic supplier header row replicating grouped vendor columns
    // Base columns (first mapping.baseColumns.length cells) then for each quote we add supplier name spanning quoteColumnSet length
    const baseColumns = mapping.baseColumns.map(c => c.header);
    const quoteSetHeaders = mapping.quoteColumnSet.map(c => c.header);
    const supplierHeader = [...baseColumns];
    quotes.forEach(q => {
      // For legacy aesthetic we repeat supplier name over its columns; ExcelJS merge afterwards
      supplierHeader.push(q.supplierName, ...Array(quoteSetHeaders.length - 1).fill(''));
    });
    sheet.addRow(supplierHeader);

    // Merge cells for supplier names across their column set
    let colIndex = baseColumns.length + 1; // 1-based index
    quotes.forEach(() => {
      const start = colIndex;
      const end = colIndex + quoteSetHeaders.length - 1;
      if (start < end) sheet.mergeCells(5, start, 5, end); // row 5 because added 4 rows meta + blank; this is supplierHeaderRow
      colIndex = end + 1;
    });

    // Second header row: column labels (base + repeated quote set per supplier)
    const secondHeader = [...baseColumns];
    quotes.forEach(() => secondHeader.push(...quoteSetHeaders));
    sheet.addRow(secondHeader);

    // Data rows: one per rfq item
    rfq.items.forEach((item, idx) => {
      const row = [];
      // base columns
      mapping.baseColumns.forEach(col => {
        switch (col.source) {
          case 'rfq._id':
            row.push(rfq._id.toString());
            break;
          case 'itemIndex':
            row.push(idx + 1);
            break;
          case 'item.sku':
            row.push(item.sku);
            break;
          case 'item.unit':
            row.push(item.unit);
            break;
          case 'item.quantity':
            row.push(item.quantity);
            break;
          default:
            row.push('');
        }
      });
      // quote columns per supplier
      quotes.forEach(q => {
        const line = findQuoteLine(q, item.sku);
        mapping.quoteColumnSet.forEach(col => {
          if (!line) { row.push(''); return; }
          switch (col.source) {
            case 'quote.items[i].unitPrice':
              row.push(line.unitPrice);
              break;
            case 'quote.items[i].total':
              row.push(Number((line.unitPrice * line.quantity).toFixed(2)));
              break;
            case 'quote.supplierName':
              row.push(q.supplierName);
              break;
            default:
              row.push('');
          }
        });
      });
      sheet.addRow(row);
    });

    // Freeze top headers for readability
    sheet.views = [{ state: 'frozen', ySplit: 6 }];

    // Apply number formats to price/amount columns across vendors
    const baseLen = baseColumns.length;
    const setLen = quoteSetHeaders.length;
    const numericOffsets = quoteSetHeaders
      .map((h, i) => (h === 'RATE/PCS' || h === 'NET RATE' || h === 'TOTAL AMOUNT') ? i : null)
      .filter(i => i !== null);
    for (let v = 0; v < quotes.length; v++) {
      const start = baseLen + v * setLen + 1; // 1-based
      numericOffsets.forEach(off => {
        sheet.getColumn(start + off).numFmt = '#,##0.00';
        sheet.getColumn(start + off).alignment = { horizontal: 'right' };
      });
    }

    // Compute reasonable column widths from header labels
    const totalCols = baseLen + quotes.length * setLen;
    for (let c = 1; c <= totalCols; c++) {
      let label = '';
      if (c <= baseLen) label = baseColumns[c - 1] || '';
      else label = quoteSetHeaders[(c - baseLen - 1) % setLen] || '';
      const width = Math.min(30, Math.max(10, String(label).length + 2));
      sheet.getColumn(c).width = width;
    }

    // Make the two header rows bold
    sheet.getRow(5).font = { bold: true };
    sheet.getRow(6).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=rfq-${rfq._id}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: 'export_failed' });
  }
}

export default { exportRfqExcel };
