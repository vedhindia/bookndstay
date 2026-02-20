import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { userService } from "./services/userService";

const StatusBadge = ({ status }) => (
  <span
    className={`badge ${status === "active" ? "bg-success" : "bg-danger"}`}
  >
    {status === "active" ? "Active" : "Blocked"}
  </span>
);

const Users = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Helpers
  const getUserId = (u) => u?.id || u?._id || u?.userId || u?.uuid;
  const getUserStatus = (u) => {
    if (typeof u?.status === "string") {
      const s = u.status.toLowerCase();
      if (["active", "verified", "unblocked"].includes(s)) return "active";
      if (["blocked", "inactive", "disabled"].includes(s)) return "blocked";
    }
    if (u?.isBlocked === true) return "blocked";
    if (u?.isActive === false) return "blocked";
    return "active";
  };

  const normalizeUser = (u) => ({
    id: getUserId(u),
    name: u?.name || u?.full_name || u?.username || "N/A",
    email: u?.email || "N/A",
    phone: u?.phone || u?.mobile || "N/A",
    role: u?.role || "User",
    status: getUserStatus(u),
    createdAt: u?.createdAt || "",
  });

  const normalizeUsersResponse = (resp) => {
    const data = resp?.data || resp;
    const arr =
      data?.users || data?.items || data?.results || data?.data || data;
    return (Array.isArray(arr) ? arr : []).map(normalizeUser);
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      let resp;
      try {
        resp = await userService.getPaginatedUsers({ page: 1, limit: 1000 });
      } catch {
        resp = await userService.getAllUsers();
      }
      const list = normalizeUsersResponse(resp);
      setUsers(list);
      filterAndPaginate(list, query, status, 1);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  // Filter + Paginate
  const filterAndPaginate = (list, q, st, currentPage) => {
    let f = [...list];
    if (q.trim()) {
      const qLower = q.toLowerCase();
      f = f.filter(
        (u) =>
          u.name.toLowerCase().includes(qLower) ||
          u.email.toLowerCase().includes(qLower) ||
          u.phone.toLowerCase().includes(qLower)
      );
    }
    if (st !== "All") {
      f = f.filter((u) => u.status === st.toLowerCase());
    }
    const start = (currentPage - 1) * pageSize;
    const paginated = f.slice(start, start + pageSize);
    setFiltered(paginated);
  };

  // Search or filter change
  useEffect(() => {
    filterAndPaginate(users, query, status, 1);
    setPage(1);
  }, [query, status, users]);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Pagination change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(users.length / pageSize)) {
      setPage(newPage);
      filterAndPaginate(users, query, status, newPage);
    }
  };

  // Status update
  const handleStatusUpdate = async (user) => {
    try {
      const userId = getUserId(user);
      setStatusUpdatingId(userId);
      if (user.status === "active") {
        await userService.blockUser(userId, { reason: "Blocked by admin" });
      } else {
        await userService.unblockUser(userId);
      }
      const updated = users.map((u) =>
        getUserId(u) === userId
          ? { ...u, status: u.status === "active" ? "blocked" : "active" }
          : u
      );
      setUsers(updated);
    } catch (err) {
      console.error("Status update failed:", err);
      setError("Failed to update status");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Bookings
  const handleViewBookings = (user) => {
    navigate("/dashboard/bookings", {
      state: {
        userId: getUserId(user),
        userName: user.name,
        userEmail: user.email,
      },
    });
  };

  return (
    <div className="container-fluid p-3 p-md-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Users</h4>
          <small className="text-muted">
            Manage all users ({users.length} total)
          </small>
        </div>
        <div className="d-flex gap-2">
          <input
            className="form-control"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            style={{ minWidth: "200px" }}
          />
          <select
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={loading}
            style={{ minWidth: "120px" }}
          >
            <option value="All">All</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <button className="btn btn-sm btn-outline-light" onClick={fetchUsers}>
            Retry
          </button>
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Sr No.</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      <div className="spinner-border text-primary"></div>
                      <div className="mt-2">Loading users...</div>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((u, index) => (
                    <tr key={u.id}>
                      <td>{(page - 1) * pageSize + index + 1}</td>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.phone}</td>
                      <td>{u.role}</td>
                      <td>
                        <StatusBadge status={u.status} />
                      </td>
                      <td>
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString()
                          : ""}
                      </td>
                      <td className="text-end">
                        <div className="btn-group">
                          <button
                            className="btn btn-sm btn-outline-info"
                            onClick={() => handleViewBookings(u)}
                            title="View Bookings"
                          >
                            <i className="fas fa-calendar-alt"></i>
                          </button>
                          <button
                            className={`btn btn-sm btn-outline-${
                              u.status === "active" ? "danger" : "success"
                            }`}
                            onClick={() => handleStatusUpdate(u)}
                            disabled={statusUpdatingId === u.id}
                          >
                            {statusUpdatingId === u.id ? (
                              <div
                                className="spinner-border spinner-border-sm"
                                role="status"
                              ></div>
                            ) : (
                              <i
                                className={`fas fa-${
                                  u.status === "active" ? "ban" : "unlock"
                                }`}
                              ></i>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center text-muted py-4">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="d-flex justify-content-center align-items-center mt-3 gap-2">
        <button
          className="btn btn-outline-secondary btn-sm"
          disabled={page === 1}
          onClick={() => handlePageChange(page - 1)}
        >
          Prev
        </button>
        <span>
          Page {page} of {Math.ceil(users.length / pageSize) || 1}
        </span>
        <button
          className="btn btn-outline-secondary btn-sm"
          disabled={page >= Math.ceil(users.length / pageSize)}
          onClick={() => handlePageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Users;
