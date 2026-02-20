import React, { useEffect, useState } from 'react';
import { Table, Spinner, Alert, Card, Row, Col } from 'react-bootstrap';

function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  // Summary
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [ordersByStatus, setOrdersByStatus] = useState({});
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch orders (first 100 for summary)
        const ordersRes = await fetch('http://localhost:3000/api/orders?page=1&limit=100');
        const ordersData = await ordersRes.json();
        const ordersList = ordersData.data?.orders || [];
        setOrders(ordersList);
        setTotalOrders(ordersData.data?.pagination?.total || ordersList.length);
        setTotalSales(ordersList.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0));
        // Orders by status
        const statusCount = {};
        for (const o of ordersList) {
          statusCount[o.status] = (statusCount[o.status] || 0) + 1;
        }
        setOrdersByStatus(statusCount);

        // Fetch customers (first 100 for summary)
        const custRes = await fetch('http://localhost:3000/api/customers?page=1&limit=100&status=active');
        const custData = await custRes.json();
        const custList = custData.data?.customers || [];
        setCustomers(custList);
        setTotalCustomers(custData.data?.pagination?.total || custList.length);

        // Fetch products (first 100 for summary)
        const prodRes = await fetch('http://localhost:3000/api/products?page=1&limit=100');
        const prodData = await prodRes.json();
        const prodList = prodData.data?.products || [];
        setProducts(prodList);
        setTotalProducts(prodData.data?.pagination?.total || prodList.length);
      } catch (err) {
        setError('Failed to fetch report data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="container py-4">
      <h1 className="mb-4">Reports & Exports</h1>
      {error && <Alert variant="danger">{error}</Alert>}
      {loading ? (
        <div className="text-center my-5"><Spinner animation="border" /></div>
      ) : (
        <>
          <Row className="mb-4">
            <Col md={3}><Card body className="text-center"><h5>Total Orders</h5><div className="fs-3 fw-bold">{totalOrders}</div></Card></Col>
            <Col md={3}><Card body className="text-center"><h5>Total Sales</h5><div className="fs-3 fw-bold">₹{totalSales.toLocaleString()}</div></Card></Col>
            <Col md={3}><Card body className="text-center"><h5>Total Customers</h5><div className="fs-3 fw-bold">{totalCustomers}</div></Card></Col>
            <Col md={3}><Card body className="text-center"><h5>Total Products</h5><div className="fs-3 fw-bold">{totalProducts}</div></Card></Col>
          </Row>
          <Row className="mb-4">
            <Col md={6}>
              <Card body>
                <h5>Orders by Status</h5>
                <ul className="mb-0">
                  {Object.keys(ordersByStatus).length === 0 && <li>No orders</li>}
                  {Object.entries(ordersByStatus).map(([status, count]) => (
                    <li key={status}><b>{status.charAt(0).toUpperCase() + status.slice(1)}:</b> {count}</li>
                  ))}
                </ul>
              </Card>
            </Col>
            <Col md={6}>
              <Card body>
                <h5>Recent Orders</h5>
                <Table size="sm" bordered hover className="mb-0">
                  <thead><tr><th>#</th><th>Order #</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
                  <tbody>
                    {orders.slice(0, 5).map((o, i) => (
                      <tr key={o.id}><td>{i + 1}</td><td>{o.orderNumber}</td><td>{o.status}</td><td>₹{o.totalAmount}</td><td>{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '-'}</td></tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <Card body>
                <h5>Recent Customers</h5>
                <Table size="sm" bordered hover className="mb-0">
                  <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Registered</th></tr></thead>
                  <tbody>
                    {customers.slice(0, 5).map((c, i) => (
                      <tr key={c.id}><td>{i + 1}</td><td>{c.firstName} {c.lastName}</td><td>{c.email}</td><td>{c.phone}</td><td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-'}</td></tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}

export default Reports;