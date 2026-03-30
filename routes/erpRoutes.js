
const express = require('express');
const router  = express.Router();
const { Client, Quotation, PO, Inward, Dispatch, Costing } = require('../models/ERPModels');

// ═══════════════════════════════════════════════
//  CLIENTS
// ═══════════════════════════════════════════════
router.get('/clients', async (req, res) => {
  try {
    const clients = await Client.find().sort({ name: 1 });
    res.json(clients);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/clients', async (req, res) => {
  try {
    const client = new Client(req.body);
    const saved  = await client.save();
    res.status(201).json(saved);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/clients/:id', async (req, res) => {
  try {
    const updated = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/clients/:id', async (req, res) => {
  try {
    await Client.findByIdAndDelete(req.params.id);
    res.json({ message: 'Client deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════
//  COSTING CALCULATOR (stateless)
// ═══════════════════════════════════════════════
router.post('/calculate', async (req, res) => {
  try {
    const { operations = [], material = {}, profitPercent = 10, isInterState = false } = req.body;

    // Operation cost: (ratePerHour / 3600) * timeSec
    let opTotal = 0;
    const processedOps = operations.map(op => {
      const amt = ((parseFloat(op.ratePerHour) || 0) / 3600) * (parseFloat(op.timeInSec) || 0);
      opTotal += amt;
      return { ...op, amount: parseFloat(amt.toFixed(2)) };
    });

    // Scrap: (inputWeight - finishWeight) / 1000 kg * costPerKg
    const inputW    = parseFloat(material.inputWeight)  || 0;
    const finishW   = parseFloat(material.finishWeight) || 0;
    const scrapRate = parseFloat(material.scrapRate)    || 0;
    const scrapKg   = (inputW - finishW) / 1000;
    const scrapValue = scrapKg * scrapRate;

    const subTotal     = opTotal - scrapValue;
    const profitAmount = (subTotal * parseFloat(profitPercent)) / 100;
    const taxableValue = subTotal + profitAmount;

    const GST = 0.18;
    const cgst = isInterState ? 0 : taxableValue * (GST / 2);
    const sgst = isInterState ? 0 : taxableValue * (GST / 2);
    const igst = isInterState ? taxableValue * GST : 0;
    const grandTotal = taxableValue + cgst + sgst + igst;

    res.json({
      processedOps,
      scrapKg:       parseFloat(scrapKg.toFixed(3)),
      scrapValue:    parseFloat(scrapValue.toFixed(2)),
      opTotal:       parseFloat(opTotal.toFixed(2)),
      profitAmount:  parseFloat(profitAmount.toFixed(2)),
      taxableValue:  parseFloat(taxableValue.toFixed(2)),
      cgst:          parseFloat(cgst.toFixed(2)),
      sgst:          parseFloat(sgst.toFixed(2)),
      igst:          parseFloat(igst.toFixed(2)),
      grandTotal:    Math.round(grandTotal)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════
//  QUOTATIONS
// ═══════════════════════════════════════════════
router.get('/quotations', async (req, res) => {
  try {
    let query = {};
    if (req.query.clientId) query.clientId = req.query.clientId;
    // date filter support: ?from=2026-01-01&to=2026-03-31
    if (req.query.from || req.query.to) {
      query.date = {};
      if (req.query.from) query.date.$gte = new Date(req.query.from);
      if (req.query.to)   query.date.$lte = new Date(req.query.to + 'T23:59:59');
    }
    const quotations = await Quotation.find(query).populate('clientId').sort({ date: -1 });
    res.json(quotations);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/quotations/:id', async (req, res) => {
  try {
    const q = await Quotation.findById(req.params.id).populate('clientId');
    if (!q) return res.status(404).json({ error: 'Not found' });
    res.json(q);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/quotations', async (req, res) => {
  try {
    const q = new Quotation(req.body);
    const saved = await q.save();
    res.status(201).json(saved);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/quotations/:id', async (req, res) => {
  try {
    const updated = await Quotation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/quotations/:id', async (req, res) => {
  try {
    await Quotation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════
//  PURCHASE ORDERS
// ═══════════════════════════════════════════════
router.get('/purchase-orders', async (req, res) => {
  try {
    const pos = await PO.find().populate('clientId').populate('quotationId').sort({ poDate: -1 });
    res.json(pos);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/purchase-orders/:id', async (req, res) => {
  try {
    const po = await PO.findById(req.params.id).populate('clientId').populate('quotationId');
    if (!po) return res.status(404).json({ error: 'Not found' });
    res.json(po);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/purchase-orders', async (req, res) => {
  try {
    const po = new PO(req.body);
    await po.save();
    res.status(201).json(po);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/purchase-orders/:id', async (req, res) => {
  try {
    const updated = await PO.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════
//  MATERIAL INWARD
// ═══════════════════════════════════════════════
router.get('/inward', async (req, res) => {
  try {
    const inwards = await Inward.find().populate('clientId').populate('poId').sort({ date: -1 });
    res.json(inwards);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/inward/:id', async (req, res) => {
  try {
    const inward = await Inward.findById(req.params.id).populate('clientId').populate('poId');
    if (!inward) return res.status(404).json({ error: 'Not found' });
    res.json(inward);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/inward', async (req, res) => {
  try {
    const { challanQty, receivedQty } = req.body;
    const shortQty = (parseFloat(challanQty) || 0) - (parseFloat(receivedQty) || 0);
    const inward   = new Inward({ ...req.body, shortQty });
    const saved    = await inward.save();
    res.status(201).json(saved);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/inward/:id', async (req, res) => {
  try {
    const updated = await Inward.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════
//  DISPATCH / INVOICE
// ═══════════════════════════════════════════════
router.get('/dispatch', async (req, res) => {
  try {
    let query = {};
    if (req.query.clientId) query.clientId = req.query.clientId;
    if (req.query.from || req.query.to) {
      query.date = {};
      if (req.query.from) query.date.$gte = new Date(req.query.from);
      if (req.query.to)   query.date.$lte = new Date(req.query.to + 'T23:59:59');
    }
    const dispatches = await Dispatch.find(query).populate('clientId').populate('inwardId').sort({ date: -1 });
    res.json(dispatches);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/dispatch/:id', async (req, res) => {
  try {
    const d = await Dispatch.findById(req.params.id).populate('clientId').populate('inwardId').populate('poId');
    if (!d) return res.status(404).json({ error: 'Not found' });
    res.json(d);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/dispatch', async (req, res) => {
  try {
    const dispatch = new Dispatch(req.body);
    const saved    = await dispatch.save();
    res.status(201).json(saved);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/dispatch/:id', async (req, res) => {
  try {
    const updated = await Dispatch.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════
//  COSTING RECORDS (saved)
// ═══════════════════════════════════════════════
router.get('/costing', async (req, res) => {
  try {
    const costings = await Costing.find().populate('clientId').sort({ createdAt: -1 });
    res.json(costings);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/costing', async (req, res) => {
  try {
    const costing = new Costing(req.body);
    const saved   = await costing.save();
    res.status(201).json(saved);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════
//  DASHBOARD STATS
// ═══════════════════════════════════════════════
router.get('/dashboard', async (req, res) => {
  try {
    const [clients, quotations, pos, inwards, dispatches] = await Promise.all([
      Client.countDocuments(),
      Quotation.countDocuments(),
      PO.countDocuments(),
      Inward.countDocuments(),
      Dispatch.countDocuments()
    ]);

    // Recent quotations for dashboard (last 10)
    const recentQuotations = await Quotation.find()
      .populate('clientId')
      .sort({ date: -1 })
      .limit(10);

    // Total revenue from dispatches
    const revenueResult = await Dispatch.aggregate([
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    res.json({
      stats: { clients, quotations, purchaseOrders: pos, inwards, dispatches, totalRevenue },
      recentQuotations
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Legacy compatibility aliases
router.get('/inward-list',   (req, res) => { req.url = '/inward';   router.handle(req, res, () => {}); });
router.post('/inward-entry', (req, res) => { req.url = '/inward';   router.handle(req, res, () => {}); });
router.get('/clients',       (req, res) => { req.url = '/clients';  router.handle(req, res, () => {}); });
router.post('/calculate-quotation', (req, res) => {
  req.url = '/calculate';
  router.handle(req, res, () => {});
});

module.exports = router;
