const mongoose = require('mongoose');

// ─── CLIENT MASTER ────────────────────────────────────────────────
const ClientSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  address:   String,
  gstNo:     String,
  state:     { type: String, default: 'Maharashtra' }, // determines CGST+SGST vs IGST
  email:     String,
  contactNo: String
}, { timestamps: true });

// ─── QUOTATION ────────────────────────────────────────────────────
const QuotationSchema = new mongoose.Schema({
  quoteNo:  { type: String, required: true, unique: true },
  date:     { type: Date, default: Date.now },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  kindAttn: { type: String, required: true },
  items: [{
    partNo:   String,
    partName: String,
    hsnCode:  { type: String, default: '87084000' },
    unitRate: Number,
    qty:      { type: Number, default: 1 }
  }],
  // costing breakdown stored with quote
  operations: [{
    name:        String,
    ratePerHour: Number,
    timeInSec:   Number,
    amount:      Number
  }],
  material: {
    inputWeight:  Number,
    finishWeight: Number,
    scrapRate:    Number
  },
  profitPercent: { type: Number, default: 10 },
  taxableValue:  Number,
  cgst:          Number,
  sgst:          Number,
  igst:          Number,
  grandTotal:    Number,
  notes:         String,
  
}, { timestamps: true });

// ─── PURCHASE ORDER ───────────────────────────────────────────────
const POSchema = new mongoose.Schema({
  poNumber:    { type: String, required: true, unique: true },
  poDate:      { type: Date, required: true },
  clientId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true },
  items: [{
    partNo:   String,
    partName: String,
    hsnCode:  { type: String, default: '87084000' },
    unitRate: Number,
    qty:      Number,
    programNo: String
  }],
  location: String,
  status:   { type: String, default: 'Open', enum: ['Open', 'Closed', 'Cancelled'] }
}, { timestamps: true });

// ─── MATERIAL INWARD ──────────────────────────────────────────────
const InwardSchema = new mongoose.Schema({
  clientId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  poId:          { type: mongoose.Schema.Types.ObjectId, ref: 'PO' },
  partNo:        String,
  partName:      String,
  challanNo:     { type: String, required: true },
  date:          { type: Date, default: Date.now },
  challanQty:    Number,
  receivedQty:   Number,
  shortQty:      Number,  // auto-calculated: challanQty - receivedQty
  vehicleNo:     String,
  transportName: String,
  driverName:    String
}, { timestamps: true });

// ─── DISPATCH / INVOICE ───────────────────────────────────────────
const DispatchSchema = new mongoose.Schema({
  invoiceNo:     { type: String, required: true, unique: true },
  clientId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  inwardId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Inward' },
  poId:          { type: mongoose.Schema.Types.ObjectId, ref: 'PO' },
  date:          { type: Date, default: Date.now },
  items: [{
    partNo:       String,
    partName:     String,
    hsnCode:      { type: String, default: '87084000' },
    description:  String,
    qty:          Number,
    rate:         Number,
    amount:       Number
  }],
  vehicleNo:     String,
  transport:     String,
  driverName:    String,
  challanNo:     String,
  challanDate:   Date,
  isInterState:  { type: Boolean, default: false },
  taxableValue:  Number,
  cgst:          Number,
  sgst:          Number,
  igst:          Number,
  grandTotal:    Number,
  bankName:      { type: String, default: 'Janaseva Sahkari Bank' },
  accountNo:     { type: String, default: '26021000109' },
  ifsc:          { type: String, default: 'JANA0000026' },
  amountInWords: String
}, { timestamps: true });

// ─── PRODUCTION / COSTING ─────────────────────────────────────────
const CostingSchema = new mongoose.Schema({
  partNo:        { type: String, required: true },
  partName:      String,
  clientId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  operations: [{
    name:        String,
    ratePerHour: Number,
    timeInSec:   Number,
    amount:      Number
  }],
  inputWeight:   Number,   // grams
  finalWeight:   Number,   // grams
  scrapWeight:   Number,   // auto = input - final
  scrapPercent:  Number,
  costPerKg:     Number,
  scrapValue:    Number,
  totalCost:     Number,
  profitPercent: Number,
  finalAmount:   Number
}, { timestamps: true });

module.exports = {
  Client:   mongoose.model('Client',   ClientSchema),
  Quotation: mongoose.model('Quotation', QuotationSchema),
  PO:       mongoose.model('PO',       POSchema),
  Inward:   mongoose.model('Inward',   InwardSchema),
  Dispatch: mongoose.model('Dispatch', DispatchSchema),
  Costing:  mongoose.model('Costing',  CostingSchema)
};
