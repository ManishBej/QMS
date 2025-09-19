// Weekly report job using node-cron
// - Generates a timestamped JSON report into exports/ once a week
// - Exports a start() to schedule the cron and a runOnce() for manual trigger

import cron from 'node-cron';
import path from 'path';
import { connectDb } from '../config/db.js';
import RFQ from '../models/RFQ.js';
import Quote from '../models/Quote.js';
import { secureWriteFile, secureCreateDirectory, generateSecureFilename } from '../utils/fileOperations.js';

const EXPORT_DIR = path.join(process.cwd(), 'exports');

async function ensureDir(dir) {
  await secureCreateDirectory(dir);
}

export async function generateWeeklyReport() {
  await connectDb();

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const [rfqCount, quoteCount] = await Promise.all([
    RFQ.countDocuments({ createdAt: { $gte: since } }),
    Quote.countDocuments({ createdAt: { $gte: since } })
  ]);

  const summary = {
    ts: new Date().toISOString(),
    windowStart: since.toISOString(),
    rfqCreated: rfqCount,
    quotesSubmitted: quoteCount
  };

  await ensureDir(EXPORT_DIR);
  
  // Generate secure filename
  const filename = generateSecureFilename('weekly_report', '.json');
  const filePath = path.join(EXPORT_DIR, filename);
  await secureWriteFile(filePath, JSON.stringify(summary, null, 2), 'utf8');
  return { filePath, summary };
}

let scheduled;
export function start() {
  if (scheduled) return scheduled; // idempotent
  // Run at 02:00 every Monday
  scheduled = cron.schedule('0 2 * * 1', async () => {
    try {
      const { filePath } = await generateWeeklyReport();
      // eslint-disable-next-line no-console
      console.log(`[weeklyReport] generated: ${filePath}`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[weeklyReport] error:', e);
    }
  }, { timezone: 'UTC' });
  return scheduled;
}

export async function runOnce() {
  return generateWeeklyReport();
}

export default { start, runOnce };
