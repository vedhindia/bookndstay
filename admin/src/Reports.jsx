import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Modal, Row, Spinner, Table } from 'react-bootstrap';
import api from './services/apiClient';

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
  const [loading, setLoading] = useState(false);
  const [loadingSettlement, setLoadingSettlement] = useState(false);
  const [error, setError] = useState('');
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [settlementVendors, setSettlementVendors] = useState([]);
  const [settlementTotals, setSettlementTotals] = useState({ online_payable: 0, pay_at_hotel_commission_due: 0, net: 0 });
  const [selectedSettlementVendor, setSelectedSettlementVendor] = useState(null);
  const [settlementRef, setSettlementRef] = useState('');
  const [settlingVendorId, setSettlingVendorId] = useState(null);
  const [settlingSettlementVendorId, setSettlingSettlementVendorId] = useState(null);

  const totals = useMemo(() => {
    const totalCommission = vendors.reduce((sum, v) => sum + Number(v.total_commission_due || 0), 0);
    const totalAmount = vendors.reduce((sum, v) => sum + Number(v.total_booking_amount || 0), 0);
    const totalBookings = vendors.reduce((sum, v) => sum + Number(v.bookings_count || 0), 0);
    return { totalCommission, totalAmount, totalBookings };
  }, [vendors]);

  const loadReport = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await api.get('/admin/reports/pay-at-hotel-commission', {
        params: { week_start: weekStart }
      });
      const data = resp?.data?.data || {};
      setWeekEnd(data.week_end || '');
      setVendors(Array.isArray(data.vendors) ? data.vendors : []);
    } catch (e) {
      setError('Failed to load pay-at-hotel commission report.');
      setVendors([]);
      setWeekEnd('');
    } finally {
      setLoading(false);
    }
  };

  const loadSettlementReport = async () => {
    setLoadingSettlement(true);
    setError('');
    try {
      const resp = await api.get('/admin/reports/vendor-settlement', {
        params: { week_start: weekStart }
      });
      const data = resp?.data?.data || {};
      setWeekEnd(data.week_end || '');
      setSettlementTotals(data.totals || { online_payable: 0, pay_at_hotel_commission_due: 0, net: 0 });
      setSettlementVendors(Array.isArray(data.vendors) ? data.vendors : []);
    } catch (e) {
      setError('Failed to load vendor settlement report.');
      setSettlementVendors([]);
      setSettlementTotals({ online_payable: 0, pay_at_hotel_commission_due: 0, net: 0 });
    } finally {
      setLoadingSettlement(false);
    }
  };

  useEffect(() => {
    loadReport();
    loadSettlementReport();
  }, [weekStart]);

  const settleVendorWeek = async (vendorId) => {
    setSettlingVendorId(vendorId);
    setError('');
    try {
      await api.post('/admin/reports/pay-at-hotel-commission/settle', {
        vendor_id: vendorId,
        week_start: weekStart,
        settlement_ref: settlementRef || undefined
      });
      await loadReport();
    } catch (e) {
      setError('Failed to mark settlement as settled.');
    } finally {
      setSettlingVendorId(null);
    }
  };

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
      await loadReport();
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
          <small className="text-muted">Pay-at-hotel weekly commission due (per vendor)</small>
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
              <Button variant="outline-primary" className="w-100" onClick={loadReport} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Row className="mb-3 g-3">
        <Col md={4}>
          <Card body className="text-center">
            <div className="text-muted small">Total Bookings (Pay At Hotel)</div>
            <div className="fs-3 fw-bold">{totals.totalBookings}</div>
          </Card>
        </Col>
        <Col md={4}>
          <Card body className="text-center">
            <div className="text-muted small">Total Booking Amount</div>
            <div className="fs-3 fw-bold">₹{totals.totalAmount.toLocaleString()}</div>
          </Card>
        </Col>
        <Col md={4}>
          <Card body className="text-center">
            <div className="text-muted small">Total Commission Due</div>
            <div className="fs-3 fw-bold">₹{totals.totalCommission.toLocaleString()}</div>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
              <div className="mt-2 text-muted">Loading report...</div>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover bordered className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Vendor</th>
                    <th className="text-center">Bookings</th>
                    <th className="text-end">Booking Amount</th>
                    <th className="text-end">Commission Due</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">
                        No pay-at-hotel commission due for this week.
                      </td>
                    </tr>
                  ) : (
                    vendors.map((v) => (
                      <tr key={v.vendor_id}>
                        <td>
                          <div className="fw-semibold">{v.business_name || v.vendor_name || `Vendor #${v.vendor_id}`}</div>
                          <div className="text-muted small">{v.email || ''}{v.phone ? ` • ${v.phone}` : ''}</div>
                        </td>
                        <td className="text-center">{v.bookings_count}</td>
                        <td className="text-end">₹{Number(v.total_booking_amount || 0).toLocaleString()}</td>
                        <td className="text-end fw-semibold">₹{Number(v.total_commission_due || 0).toLocaleString()}</td>
                        <td className="text-end">
                          <div className="d-flex flex-wrap gap-2 justify-content-end">
                            <Button size="sm" variant="outline-secondary" onClick={() => setSelectedVendor(v)}>
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => settleVendorWeek(v.vendor_id)}
                              disabled={settlingVendorId === v.vendor_id}
                            >
                              {settlingVendorId === v.vendor_id ? 'Settling...' : 'Mark Settled'}
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
        <h5 className="mb-0">Vendor Settlement (Online payout + Pay-at-hotel commission)</h5>
        <small className="text-muted">
          Net Settlement = Online Payable (admin pays vendor) − Pay-at-hotel Commission Due (vendor pays admin)
        </small>
      </div>

      <Row className="mb-3 g-3">
        <Col md={4}>
          <Card body className="text-center">
            <div className="text-muted small">Online Payable (To Vendors)</div>
            <div className="fs-3 fw-bold">₹{Number(settlementTotals.online_payable || 0).toLocaleString()}</div>
          </Card>
        </Col>
        <Col md={4}>
          <Card body className="text-center">
            <div className="text-muted small">Pay-at-hotel Commission Due (From Vendors)</div>
            <div className="fs-3 fw-bold">₹{Number(settlementTotals.pay_at_hotel_commission_due || 0).toLocaleString()}</div>
          </Card>
        </Col>
        <Col md={4}>
          <Card body className="text-center">
            <div className="text-muted small">Net (Admin → Vendor if +)</div>
            <div className={`fs-3 fw-bold ${Number(settlementTotals.net || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
              ₹{Number(settlementTotals.net || 0).toLocaleString()}
            </div>
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
                    <th className="text-end">Pay-at-hotel Commission Due</th>
                    <th className="text-end">Net Settlement</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {settlementVendors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">
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
                        <td className="text-end">₹{Number(v.pay_at_hotel_commission_due || 0).toLocaleString()}</td>
                        <td className={`text-end fw-semibold ${Number(v.net_settlement || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                          ₹{Number(v.net_settlement || 0).toLocaleString()}
                        </td>
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

      <Modal show={!!selectedVendor} onHide={() => setSelectedVendor(null)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Vendor Week Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedVendor && (
            <>
              <div className="mb-3">
                <div className="fw-semibold">{selectedVendor.business_name || selectedVendor.vendor_name || `Vendor #${selectedVendor.vendor_id}`}</div>
                <div className="text-muted small">Week: {weekStart} to {weekEnd}</div>
              </div>
              <div className="table-responsive">
                <Table bordered size="sm" className="mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Booking ID</th>
                      <th>Hotel</th>
                      <th className="text-end">Received</th>
                      <th className="text-end">Commission</th>
                      <th className="text-center">Received At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedVendor.bookings || []).map((b) => (
                      <tr key={b.id}>
                        <td>{b.id}</td>
                        <td>{b.hotel_name || '-'}</td>
                        <td className="text-end">₹{Number(b.payment_received_amount || 0).toLocaleString()}</td>
                        <td className="text-end">₹{Number(b.commission_amount || 0).toLocaleString()}</td>
                        <td className="text-center">
                          {b.payment_received_at ? new Date(b.payment_received_at).toLocaleString('en-IN') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelectedVendor(null)}>Close</Button>
        </Modal.Footer>
      </Modal>

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
                <Col md={4}>
                  <Card body className="text-center">
                    <div className="text-muted small">Online Payable</div>
                    <div className="fs-5 fw-bold">₹{Number(selectedSettlementVendor.online_payable || 0).toLocaleString()}</div>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card body className="text-center">
                    <div className="text-muted small">Pay-at-hotel Commission Due</div>
                    <div className="fs-5 fw-bold">₹{Number(selectedSettlementVendor.pay_at_hotel_commission_due || 0).toLocaleString()}</div>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card body className="text-center">
                    <div className="text-muted small">Net Settlement</div>
                    <div className={`fs-5 fw-bold ${Number(selectedSettlementVendor.net_settlement || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                      ₹{Number(selectedSettlementVendor.net_settlement || 0).toLocaleString()}
                    </div>
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
                      <th className="text-end">PAH Gross</th>
                      <th className="text-end">PAH Commission Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedSettlementVendor.hotels || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-muted py-3">
                          No hotels data
                        </td>
                      </tr>
                    ) : (
                      (selectedSettlementVendor.hotels || []).map((h) => (
                        <tr key={h.hotel_id || h.hotel_name}>
                          <td>{h.hotel_name || '-'}</td>
                          <td className="text-end">₹{Number(h.online_gross || 0).toLocaleString()}</td>
                          <td className="text-end">₹{Number(h.online_payable || 0).toLocaleString()}</td>
                          <td className="text-end">₹{Number(h.pay_at_hotel_gross || 0).toLocaleString()}</td>
                          <td className="text-end">₹{Number(h.pay_at_hotel_commission_due || 0).toLocaleString()}</td>
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
                        <th className="text-center">Method</th>
                        <th className="text-end">Booking Amount</th>
                        <th className="text-end">Admin Commission</th>
                        <th className="text-end">Vendor Payable</th>
                        <th className="text-center">Received At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedSettlementVendor.bookings || []).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center text-muted py-3">
                            No bookings data
                          </td>
                        </tr>
                      ) : (
                        (selectedSettlementVendor.bookings || []).map((b) => (
                          <tr key={b.id}>
                            <td>{b.id}</td>
                            <td>{b.hotel_name || '-'}</td>
                            <td className="text-center">
                              {String(b.payment_method || '').toUpperCase() === 'PAY_AT_HOTEL' ? (
                                <span className="badge bg-warning text-dark">Pay at Hotel</span>
                              ) : (
                                <span className="badge bg-success">Online</span>
                              )}
                            </td>
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
