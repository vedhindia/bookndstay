import React, { useEffect, useState } from 'react';
import { Alert, Spinner, Card, ListGroup, Badge } from 'react-bootstrap';
import { Bell, UserPlus, ShoppingCart, AlertTriangle } from 'lucide-react';

function Notifications() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch recent orders
        const ordersRes = await fetch('http://localhost:3000/api/orders?page=1&limit=10');
        const ordersData = await ordersRes.json();
        const orders = ordersData.data?.orders || [];
        // Fetch recent customers
        const custRes = await fetch('http://localhost:3000/api/customers?page=1&limit=10&status=active');
        const custData = await custRes.json();
        const customers = custData.data?.customers || [];
        // Fetch low stock products
        const prodRes = await fetch('http://localhost:3000/api/products?page=1&limit=100');
        const prodData = await prodRes.json();
        const products = prodData.data?.products || [];
        const lowStock = products.filter(p => Number(p.stock) <= 5);

        // Build notifications
        const notifs = [];
        for (const o of orders.slice(0, 5)) {
          notifs.push({
            type: 'order',
            icon: <ShoppingCart size={18} className="me-2 text-success" />,
            message: `New order #${o.orderNumber} placed (₹${o.totalAmount})`,
            time: o.createdAt ? new Date(o.createdAt).toLocaleString() : '',
            status: o.status
          });
        }
        for (const c of customers.slice(0, 5)) {
          notifs.push({
            type: 'customer',
            icon: <UserPlus size={18} className="me-2 text-primary" />,
            message: `New customer: ${c.firstName} ${c.lastName} (${c.email})`,
            time: c.createdAt ? new Date(c.createdAt).toLocaleString() : ''
          });
        }
        for (const p of lowStock.slice(0, 5)) {
          notifs.push({
            type: 'lowstock',
            icon: <AlertTriangle size={18} className="me-2 text-warning" />,
            message: `Low stock: ${p.name} (Stock: ${p.stock})`,
            time: p.updatedAt ? new Date(p.updatedAt).toLocaleString() : ''
          });
        }
        // Sort by time, newest first
        notifs.sort((a, b) => new Date(b.time) - new Date(a.time));
        setNotifications(notifs);
      } catch (err) {
        setError('Failed to fetch notifications.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="container py-4">
      <h1 className="mb-4"><Bell className="me-2" />Notifications</h1>
      {error && <Alert variant="danger">{error}</Alert>}
      {loading ? (
        <div className="text-center my-5"><Spinner animation="border" /></div>
      ) : notifications.length === 0 ? (
        <Alert variant="info">No recent notifications.</Alert>
      ) : (
        <Card>
          <ListGroup variant="flush">
            {notifications.map((n, i) => (
              <ListGroup.Item key={i} className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  {n.icon}
                  <span>{n.message}</span>
                </div>
                <div className="text-end">
                  {n.status && <Badge bg="secondary" className="me-2">{n.status}</Badge>}
                  <small className="text-muted">{n.time}</small>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Card>
      )}
    </div>
  );
}

export default Notifications;