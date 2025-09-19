/* Scoring Engine
 * computeScores(rfq, quotes, vendorHistories, config)
 * rfq: { items:[{sku, quantity}] }
 * quotes: [{ id, supplierName, items:[{sku, quantity, unitPrice, currency, leadTimeDays}] }]
 * vendorHistories: { [supplierName]: { onTimeRate, defectRate, avgLeadTimeDays } }
 * config: { weights:{ price, leadTime, quality, reliability }, currencyRates:{ USD:1, ... } }
 */

function safeNumber(n, fallback = 0) {
  return Number.isFinite(n) ? n : fallback;
}

function computeLandedCostPerUnit(qItem, config) {
  const unitPrice = safeNumber(qItem.unitPrice, 0);
  const fx = (config.currencyRates && config.currencyRates[qItem.currency]) || 1;
  return unitPrice * fx; // placeholder for freight/duty in future
}

function normalizeScores(rawScores) {
  // rawScores: [{vendor, price, leadTime, quality, reliability}]
  const mins = {}, maxs = {};
  const keys = ['price', 'leadTime', 'quality', 'reliability'];
  keys.forEach(k => {
    const vals = rawScores.map(r => r[k]).filter(v => Number.isFinite(v));
    mins[k] = Math.min(...vals);
    maxs[k] = Math.max(...vals);
  });
  return rawScores.map(r => {
    const norm = { vendor: r.vendor };
    keys.forEach(k => {
      if (!Number.isFinite(r[k])) { norm[k] = 0; return; }
      if (maxs[k] === mins[k]) { norm[k] = 1; return; }
      // For price & leadTime: lower is better -> inverse normalization
      if (k === 'price' || k === 'leadTime') {
        norm[k] = (maxs[k] - r[k]) / (maxs[k] - mins[k]);
      } else { // quality & reliability higher is better
        norm[k] = (r[k] - mins[k]) / (maxs[k] - mins[k]);
      }
    });
    return norm;
  });
}

export function computeScores(rfq, quotes, vendorHistories = {}, config = {}) {
  const weights = Object.assign({ price: 0.4, leadTime: 0.2, quality: 0.2, reliability: 0.2 }, config.weights || {});
  const totalWeight = Object.values(weights).reduce((a,b)=>a+b,0) || 1;
  // Normalize weight proportions
  Object.keys(weights).forEach(k => { weights[k] = weights[k] / totalWeight; });

  const rfqQuantities = {}; (rfq.items||[]).forEach(i=>{ rfqQuantities[i.sku] = safeNumber(i.quantity,0); });

  const rawScores = quotes.map(q => {
    // Aggregate price: sum (quoted unit landed cost * rfq quantity) using rfq quantity (not quoted quantity) to compare.
    let totalCost = 0;
    (rfq.items||[]).forEach(rItem => {
      const qItem = (q.items||[]).find(it => it.sku === rItem.sku);
      if (!qItem) { // missing line -> penalize heavily by adding large cost
        totalCost += safeNumber(rItem.quantity,0) * 1e9;
      } else {
        totalCost += safeNumber(rItem.quantity,0) * computeLandedCostPerUnit(qItem, config);
      }
    });

    // Lead time: max of provided quote item lead times, fallback vendor history avg, else high penalty.
    let leadTime = 0;
    const leadTimes = (q.items||[]).map(i => i.leadTimeDays).filter(Number.isFinite);
    if (leadTimes.length) leadTime = Math.max(...leadTimes);
    else if (vendorHistories[q.supplierName]?.avgLeadTimeDays) leadTime = vendorHistories[q.supplierName].avgLeadTimeDays;
    else leadTime = 9999;

    const history = vendorHistories[q.supplierName] || {};
    const quality = 1 - safeNumber(history.defectRate, 0.05); // defectRate -> quality invert; default 5% defects
    const reliability = safeNumber(history.onTimeRate, 0.90); // default 90%

    return {
      vendor: q.supplierName,
      price: totalCost,
      leadTime,
      quality,
      reliability
    };
  });

  const normalized = normalizeScores(rawScores);
  const final = normalized.map(n => ({
    vendor: n.vendor,
    components: {
      price: n.price,
      leadTime: n.leadTime,
      quality: n.quality,
      reliability: n.reliability
    },
    score: n.price * weights.price + n.leadTime * weights.leadTime + n.quality * weights.quality + n.reliability * weights.reliability
  })).sort((a,b)=> b.score - a.score);

  return { weights, vendors: final, winner: final[0] || null };
}

export default computeScores;
