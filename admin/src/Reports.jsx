import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Modal, Row, Spinner, Table } from 'react-bootstrap';
import api from './services/apiClient';
import Pagination from './components/Pagination';

const istDateOnly = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const ist = new Date(dt.getTime() + 330 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
};

const weekStartMondayIST = (d) => {
  const dateOnly = istDateOnly(d);
  if (!dateOnly) return '';
  const base = new Date(`${dateOnly}T00:00:00.000Z`);
  const day = base.getUTCDay();
  const diff = (day + 6) % 7;
  base.setUTCDate(base.getUTCDate() - diff);
  return base.toISOString().slice(0, 10);
};

function Reports() {
  const [weekStart, setWeekStart] = useState(() => weekStartMondayIST(new Date()));
  const [weekEnd, setWeekEnd] = useState('');
  const [loadingSettlement, setLoadingSettlement] = useState(false);
  const [error, setError] = useState('');
  const [settlementVendors, setSettlementVendors] = useState([]);
  const [settlementTotals, setSettlementTotals] = useState({ online_payable: 0 });
  const [selectedSettlementVendor, setSelectedSettlementVendor] = useState(null);
  const [settlementRef, setSettlementRef] = useState('');
  const [settlingSettlementVendorId, setSettlingSettlementVendorId] = useState(null);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyItems, setHistoryItems] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);

  const loadSettlementReport = async () => {
    setLoadingSettlement(true);
    setError('');
    try {
      const resp = await api.get('/admin/reports/vendor-settlement', {
        params: { week_start: weekStart }
      });
      const data = resp?.data?.data || {};
      setWeekEnd(data.week_end || '');
      setSettlementTotals(data.totals || { online_payable: 0 });
      setSettlementVendors(Array.isArray(data.vendors) ? data.vendors : []);
    } catch (e) {
      setError('Failed to load vendor settlement report.');
      setSettlementVendors([]);
      setSettlementTotals({ online_payable: 0 });
    } finally {
      setLoadingSettlement(false);
    }
  };

  useEffect(() => {
    loadSettlementReport();
  }, [weekStart]);

  const loadSettlementHistory = async () => {
    setLoadingHistory(true);
    setHistoryError('');
    try {
      const resp = await api.get('/admin/reports/vendor-settlement/history', {
        params: { page: historyPage, limit: historyPageSize }
      });
      const data = resp?.data?.data || {};
      const pagination = data.pagination || {};
      setHistoryItems(Array.isArray(data.items) ? data.items : []);
      setHistoryTotal(Number(pagination.totalItems || 0));
    } catch (e) {
      setHistoryError('Failed to load settled payouts history.');
      setHistoryItems([]);
      setHistoryTotal(0);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadSettlementHistory();
  }, [historyPage, historyPageSize]);

  const settleVendorSettlementWeek = async (vendorId) => {
    setSettlingSettlementVendorId(vendorId);
    setError('');
    try {
      await api.post('/admin/reports/vendor-settlement/settle', {
        vendor_id: vendorId,
        week_start: weekStart,
        settlement_ref: settlementRef || undefined
      });
      await loadSettlementReport();
    } catch (e) {
      setError('Failed to mark vendor settlement as settled.');
    } finally {
      setSettlingSettlementVendorId(null);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <div>
          <h1 className="mb-0">Reports</h1>
          <small className="text-muted">Weekly online payouts (admin pays vendor after commission deduction)</small>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="mb-3">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={3}>
              <label className="form-label small text-muted mb-1">Week Start (Monday)</label>
              <input
                type="date"
                className="form-control"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
              />
            </Col>
            <Col md={3}>
              <label className="form-label small text-muted mb-1">Week End</label>
              <input type="date" className="form-control" value={weekEnd} disabled />
            </Col>
            <Col md={4}>
              <label className="form-label small text-muted mb-1">Settlement Reference (optional)</label>
              <input
                className="form-control"
                placeholder="e.g. TXN/UTR/NEFT Ref"
                value={settlementRef}
                onChange={(e) => setSettlementRef(e.target.value)}
              />
            </Col>
            <Col md={2}>
              <Button variant="outline-primary" className="w-100" onClick={loadSettlementReport} disabled={loadingSettlement}>
                {loadingSettlement ? 'Refreshing...' : 'Refresh'}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <div className="mt-4 mb-2">
        <h5 className="mb-0">Vendor Payouts (Online)</h5>
      </div>

      <Row className="mb-3 g-3">
        <Col md={12}>
          <Card body className="text-center">
            <div className="text-muted small">Online Payable (To Vendors)</div>
            <div className="fs-3 fw-bold">₹{Number(settlementTotals.online_payable || 0).toLocaleString()}</div>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Body className="p-0">
          {loadingSettlement ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
              <div className="mt-2 text-muted">Loading settlement report...</div>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover bordered className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Vendor</th>
                    <th className="text-end">Online Payable</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {settlementVendors.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center text-muted py-4">
                        No unsettled vendor settlements for this week.
                      </td>
                    </tr>
                  ) : (
                    settlementVendors.map((v) => (
                      <tr key={v.vendor_id}>
                        <td>
                          <div className="fw-semibold">{v.business_name || v.vendor_name || `Vendor #${v.vendor_id}`}</div>
                          <div className="text-muted small">{v.email || ''}{v.phone ? ` • ${v.phone}` : ''}</div>
                        </td>
                        <td className="text-end">₹{Number(v.online_payable || 0).toLocaleString()}</td>
                        <td className="text-end">
                          <div className="d-flex flex-wrap gap-2 justify-content-end">
                            <Button size="sm" variant="outline-secondary" onClick={() => setSelectedSettlementVendor(v)}>
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => settleVendorSettlementWeek(v.vendor_id)}
                              disabled={settlingSettlementVendorId === v.vendor_id}
                            >
                              {settlingSettlementVendorId === v.vendor_id ? 'Settling...' : 'Mark Settled'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <div className="mt-4 mb-2">
        <h5 className="mb-0">Settled Payouts History</h5>
        <small className="text-muted">All weekly payouts that were marked as settled</small>
      </div>

      {historyError && <Alert variant="danger">{historyError}</Alert>}

      <Card className="mb-3">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={6}>
              <label className="form-label small text-muted mb-1">Search Vendor</label>
              <input
                className="form-control"
                placeholder="Search by vendor name / business / email"
                value={historyQuery}
                onChange={(e) => {
                  setHistoryQuery(e.target.value);
                  setHistoryPage(1);
                }}
              />
            </Col>
            <Col md={2}>
              <label className="form-label small text-muted mb-1">Page Size</label>
              <select
                className="form-select"
                value={historyPageSize}
                onChange={(e) => {
                  setHistoryPageSize(Number(e.target.value));
                  setHistoryPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </Col>
            <Col md={2}>
              <Button
                variant="outline-primary"
                className="w-100"
                onClick={loadSettlementHistory}
                disabled={loadingHistory}
              >
                {loadingHistory ? 'Refreshing...' : 'Refresh'}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="p-0">
          {loadingHistory ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
              <div className="mt-2 text-muted">Loading settled payouts...</div>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover bordered className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Vendor</th>
                    <th>Week</th>
                    <th className="text-end">Gross</th>
                    <th className="text-end">Commission</th>
                    <th className="text-end">Net Paid</th>
                    <th>Reference</th>
                    <th>Settled At</th>
                  </tr>
                </thead>
                <tbody>
                  {historyItems
                    .filter((it) => {
                      const q = historyQuery.trim().toLowerCase();
                      if (!q) return true;
                      const v = it.vendor || {};
                      const values = [
                        v.full_name,
                        v.business_name,
                        v.email,
                        String(it.vendor_id || ''),
                      ]
                        .filter(Boolean)
                        .map((x) => String(x).toLowerCase());
                      return values.some((x) => x.includes(q));
                    })
                    .map((it) => (
                      <tr key={`${it.vendor_id}-${it.week_start}`}>
                        <td>
                          <div className="fw-semibold">
                            {it.vendor?.business_name || it.vendor?.full_name || `Vendor #${it.vendor_id}`}
                          </div>
                          <div className="text-muted small">
                            {it.vendor?.email || ''}{it.vendor?.phone ? ` • ${it.vendor.phone}` : ''}
                          </div>
                        </td>
                        <td>
                          <div className="fw-semibold">{it.week_start} to {it.week_end}</div>
                          <div className="text-muted small">{Number(it.booking_count || 0)} bookings</div>
                        </td>
                        <td className="text-end">₹{Number(it.gross_amount || 0).toLocaleString()}</td>
                        <td className="text-end">₹{Number(it.commission_amount || 0).toLocaleString()}</td>
                        <td className="text-end fw-semibold text-success">₹{Number(it.net_amount || 0).toLocaleString()}</td>
                        <td className="text-truncate" style={{ maxWidth: 160 }}>{it.settlement_ref || '-'}</td>
                        <td>{it.settled_at ? new Date(it.settled_at).toLocaleString('en-IN') : '-'}</td>
                      </tr>
                    ))}
                  {!loadingHistory && historyItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">
                        No settled payouts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
        <div className="p-3 border-top d-flex justify-content-end">
          <Pagination
            current={historyPage}
            total={historyTotal}
            pageSize={historyPageSize}
            onChange={setHistoryPage}
          />
        </div>
      </Card>

      <Modal show={!!selectedSettlementVendor} onHide={() => setSelectedSettlementVendor(null)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Vendor Settlement Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSettlementVendor && (
            <>
              <div className="mb-3">
                <div className="fw-semibold">
                  {selectedSettlementVendor.business_name || selectedSettlementVendor.vendor_name || `Vendor #${selectedSettlementVendor.vendor_id}`}
                </div>
                <div className="text-muted small">Week: {weekStart} to {weekEnd}</div>
              </div>

              <Row className="g-3 mb-3">
                <Col md={12}>
                  <Card body className="text-center">
                    <div className="text-muted small">Online Payable</div>
                    <div className="fs-5 fw-bold">₹{Number(selectedSettlementVendor.online_payable || 0).toLocaleString()}</div>
                  </Card>
                </Col>
              </Row>

              <div className="table-responsive">
                <Table bordered size="sm" className="mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Hotel</th>
                      <th className="text-end">Online Gross</th>
                      <th className="text-end">Online Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedSettlementVendor.hotels || []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center text-muted py-3">
                          No hotels data
                        </td>
                      </tr>
                    ) : (
                      (selectedSettlementVendor.hotels || []).map((h) => (
                        <tr key={h.hotel_id || h.hotel_name}>
                          <td>{h.hotel_name || '-'}</td>
                          <td className="text-end">₹{Number(h.online_gross || 0).toLocaleString()}</td>
                          <td className="text-end">₹{Number(h.online_payable || 0).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>

              <div className="mt-3">
                <div className="fw-semibold mb-2">Bookings (Price + Commission)</div>
                <div className="table-responsive">
                  <Table bordered size="sm" className="mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Booking ID</th>
                        <th>Hotel</th>
                        <th className="text-end">Booking Amount</th>
                        <th className="text-end">Admin Commission</th>
                        <th className="text-end">Vendor Payable</th>
                        <th className="text-center">Received At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedSettlementVendor.bookings || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center text-muted py-3">
                            No bookings data
                          </td>
                        </tr>
                      ) : (
                        (selectedSettlementVendor.bookings || []).map((b) => (
                          <tr key={b.id}>
                            <td>{b.id}</td>
                            <td>{b.hotel_name || '-'}</td>
                            <td className="text-end">₹{Number(b.payment_received_amount || 0).toLocaleString()}</td>
                            <td className="text-end">₹{Number(b.commission_amount || 0).toLocaleString()}</td>
                            <td className="text-end">₹{Number(b.vendor_payable_amount || 0).toLocaleString()}</td>
                            <td className="text-center">
                              {b.payment_received_at ? new Date(b.payment_received_at).toLocaleString('en-IN') : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelectedSettlementVendor(null)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Reports;
