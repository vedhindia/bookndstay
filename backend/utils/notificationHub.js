const { EventEmitter } = require('events');

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

const adminClients = new Set();
const vendorClients = new Map();

const writeEvent = (res, event, data) => {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data ?? {})}\n\n`);
  } catch {
    void 0;
  }
};

const addAdminClient = (res) => {
  adminClients.add(res);
};

const removeAdminClient = (res) => {
  adminClients.delete(res);
};

const addVendorClient = (vendorId, res) => {
  const key = String(vendorId);
  if (!vendorClients.has(key)) vendorClients.set(key, new Set());
  vendorClients.get(key).add(res);
};

const removeVendorClient = (vendorId, res) => {
  const key = String(vendorId);
  const set = vendorClients.get(key);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) vendorClients.delete(key);
};

const notifyAdmins = (payload) => {
  for (const res of adminClients) {
    writeEvent(res, 'invalidate', payload);
  }
  emitter.emit('admin_invalidate', payload);
};

const notifyVendor = (vendorId, payload) => {
  const set = vendorClients.get(String(vendorId));
  if (set) {
    for (const res of set) {
      writeEvent(res, 'invalidate', payload);
    }
  }
  emitter.emit('vendor_invalidate', { vendorId: String(vendorId), payload });
};

module.exports = {
  addAdminClient,
  removeAdminClient,
  addVendorClient,
  removeVendorClient,
  notifyAdmins,
  notifyVendor,
  writeEvent,
  emitter
};

