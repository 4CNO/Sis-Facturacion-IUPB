'use strict';
require('dotenv').config();
const mongoose = require('mongoose');

// ── Connections ────────────────────────────────────────────────────────────────
const authDB  = mongoose.createConnection(process.env.MONGO_URI_AUTH,  { serverSelectionTimeoutMS: 8000 });
const storeDB = mongoose.createConnection(process.env.MONGO_URI_STORE, { serverSelectionTimeoutMS: 8000 });

authDB.on('connected',  () => console.log('✅ Cluster AUTH  conectado'));
authDB.on('error',  err => console.error('❌ Cluster AUTH  error:', err.message));
storeDB.on('connected', () => console.log('✅ Cluster STORE conectado'));
storeDB.on('error', err => console.error('❌ Cluster STORE error:', err.message));

// ── AUTH schemas ───────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
    name:          { type: String, required: true, trim: true, maxlength: 100 },
    email:         { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    password_hash: { type: String, required: true },
    profile_image: { type: String, default: null, maxlength: 500 },
    created_at:    { type: Date, default: Date.now },
});

const notificationSchema = new mongoose.Schema({
    user_id:    { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    message:    { type: String, required: true, maxlength: 500 },
    created_at: { type: Date, default: Date.now },
});

const invoiceSchema = new mongoose.Schema({
    user_id:     { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    description: { type: String, required: true, maxlength: 500 },
    total:       { type: Number, required: true },
    created_at:  { type: Date, default: Date.now },
});

const userEventSchema = new mongoose.Schema({
    user_id:    { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    action:     { type: String, required: true, maxlength: 64 },
    detail:     { type: String, default: null, maxlength: 255 },
    created_at: { type: Date, default: Date.now },
});

// ── STORE schemas ──────────────────────────────────────────────────────────────
const clientSchema = new mongoose.Schema({
    name:       { type: String, required: true, trim: true, maxlength: 100 },
    document:   { type: String, required: true, trim: true, maxlength: 50, index: true },
    phone:      { type: String, required: true, trim: true, maxlength: 20 },
    created_at: { type: Date, default: Date.now },
});

const companySchema = new mongoose.Schema({
    name:       { type: String, required: true, trim: true, maxlength: 100 },
    nit:        { type: String, required: true, trim: true, maxlength: 30, index: true },
    phone:      { type: String, required: true, trim: true, maxlength: 20 },
    address:    { type: String, required: true, trim: true, maxlength: 200 },
    created_at: { type: Date, default: Date.now },
});

const productSchema = new mongoose.Schema({
    name:       { type: String, required: true, trim: true, maxlength: 100 },
    brand:      { type: String, required: true, trim: true, maxlength: 100, default: '' },
    price:      { type: Number, required: true, min: 0 },
    stock:      { type: Number, required: true, default: 0, min: 0 },
    created_at: { type: Date, default: Date.now },
});

const orderItemSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    quantity:   { type: Number, required: true },
    price:      { type: Number, required: true },
    pct_desc:   { type: Number, default: 0 },
    subtotal:   { type: Number, required: true },
});

const orderSchema = new mongoose.Schema({
    user_id:    { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    client_id:  { type: mongoose.Schema.Types.ObjectId, required: true },
    company_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    items:      [orderItemSchema],
    total:      { type: Number, required: true },
    created_at: { type: Date, default: Date.now },
});

// ── Models ─────────────────────────────────────────────────────────────────────
const User         = authDB.model('User',         userSchema);
const Notification = authDB.model('Notification', notificationSchema);
const Invoice      = authDB.model('Invoice',      invoiceSchema);
const UserEvent    = authDB.model('UserEvent',    userEventSchema);

const Client   = storeDB.model('Client',   clientSchema);
const Company  = storeDB.model('Company',  companySchema);
const Product  = storeDB.model('Product',  productSchema);
const Order    = storeDB.model('Order',    orderSchema);

// ── Users ──────────────────────────────────────────────────────────────────────
async function createUser({ name, email, passwordHash }) {
    const u = await User.create({ name, email, password_hash: passwordHash });
    return { id: u._id, name: u.name, email: u.email };
}
async function getUserByEmail(email) {
    return User.findOne({ email: email.toLowerCase().trim() }).lean();
}
async function getAllUsers() {
    const rows = await User.find({}, 'name email created_at').sort({ created_at: -1 }).lean();
    return rows.map(u => ({ id: u._id, name: u.name, email: u.email, created_at: u.created_at }));
}
async function getUserById(id) {
    const u = await User.findById(id, 'name email profile_image created_at').lean();
    if (!u) return null;
    return { id: u._id, name: u.name, email: u.email, profile_image: u.profile_image, created_at: u.created_at };
}
async function updateUserProfileImage(userId, imgPath) {
    const r = await User.updateOne({ _id: userId }, { profile_image: imgPath });
    return r.modifiedCount > 0;
}

// ── Notifications (RLS: filtered by user_id) ──────────────────────────────────
async function addNotification(userId, message) {
    const n = await Notification.create({ user_id: userId, message });
    return { id: n._id, userId, message };
}
async function getNotificationsByUser(userId) {
    const rows = await Notification.find({ user_id: userId })
        .sort({ created_at: -1 }).limit(20).lean();
    return rows.map(n => ({ id: n._id, message: n.message, created_at: n.created_at }));
}

// ── Invoices (RLS) ─────────────────────────────────────────────────────────────
async function addInvoice(userId, description, total) {
    const inv = await Invoice.create({ user_id: userId, description, total });
    return { id: inv._id, userId, description, total };
}
async function getInvoicesByUser(userId) {
    const rows = await Invoice.find({ user_id: userId }).sort({ created_at: -1 }).lean();
    return rows.map(i => ({ id: i._id, description: i.description, total: i.total, created_at: i.created_at }));
}

// ── Events ─────────────────────────────────────────────────────────────────────
async function addUserEvent(userId, action, detail) {
    const ev = await UserEvent.create({ user_id: userId, action, detail: detail || null });
    return { id: ev._id, userId, action, detail };
}

// ── Clients ────────────────────────────────────────────────────────────────────
async function createClient({ name, document, phone }) {
    const c = await Client.create({ name, document, phone });
    return { id: c._id, name: c.name, document: c.document, phone: c.phone };
}
async function getClients() {
    const rows = await Client.find().sort({ created_at: -1 }).lean();
    return rows.map(c => ({ id: c._id, name: c.name, document: c.document, phone: c.phone }));
}
async function getClientByDocument(document) {
    const c = await Client.findOne({ document }).lean();
    if (!c) return null;
    return { id: c._id, name: c.name, document: c.document, phone: c.phone };
}

// ── Companies ──────────────────────────────────────────────────────────────────
async function createCompany({ name, nit, phone, address }) {
    const c = await Company.create({ name, nit, phone, address });
    return { id: c._id, name: c.name, nit: c.nit, phone: c.phone, address: c.address };
}
async function getCompanies() {
    const rows = await Company.find().sort({ created_at: -1 }).lean();
    return rows.map(c => ({ id: c._id, name: c.name, nit: c.nit, phone: c.phone, address: c.address }));
}
async function getCompanyByNit(nit) {
    const c = await Company.findOne({ nit }).lean();
    if (!c) return null;
    return { id: c._id, name: c.name, nit: c.nit, phone: c.phone, address: c.address };
}

// ── Products ───────────────────────────────────────────────────────────────────
async function createProduct({ name, brand, price, stock }) {
    const p = await Product.create({ name, brand: brand || '', price, stock: stock || 0 });
    return { id: p._id, name: p.name, brand: p.brand, price: p.price, stock: p.stock };
}
async function getProducts() {
    const rows = await Product.find().sort({ created_at: -1 }).lean();
    return rows.map(p => ({ id: p._id, name: p.name, brand: p.brand || '', price: p.price, stock: p.stock ?? 0 }));
}
async function getProductById(productId) {
    const p = await Product.findById(productId).lean();
    if (!p) return null;
    return { id: p._id, name: p.name, brand: p.brand, price: p.price, stock: p.stock };
}

// ── Orders ─────────────────────────────────────────────────────────────────────
async function createOrder({ userId, clientId, companyId, items, total }) {
    const o = await Order.create({ user_id: userId || null, client_id: clientId, company_id: companyId, items, total });
    return { id: o._id, total: o.total };
}
async function getOrders() {
    const rows = await Order.find()
        .populate('client_id',  'name')
        .populate('company_id', 'name')
        .sort({ created_at: -1 }).lean();
    return rows.map(o => ({
        id:           o._id,
        total:        o.total,
        created_at:   o.created_at,
        client_name:  o.client_id?.name  || '—',
        company_name: o.company_id?.name || '—',
    }));
}
async function getOrdersByUser(userId) {
    const rows = await Order.find({ user_id: userId })
        .populate('client_id',  'name')
        .populate('company_id', 'name')
        .sort({ created_at: -1 }).lean();
    return rows.map(o => ({
        id: o._id, total: o.total, created_at: o.created_at,
        client_name: o.client_id?.name || '—', company_name: o.company_id?.name || '—',
    }));
}

module.exports = {
    createUser, getUserByEmail, getAllUsers, getUserById, updateUserProfileImage,
    addNotification, getNotificationsByUser,
    addInvoice, getInvoicesByUser,
    addUserEvent,
    createClient, getClients, getClientByDocument,
    createCompany, getCompanies, getCompanyByNit,
    createProduct, getProducts, getProductById,
    createOrder, getOrders, getOrdersByUser,
};
