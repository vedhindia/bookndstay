import React, { useState } from "react";

function Roles() {
  // Mock current user role
  const currentUserRole = "Admin"; // Change to "Viewer" or "Super Admin" to test access

  // Mock roles data
  const initialRoles = [
    {
      name: "Super Admin",
      permissions: ["Manage Admins", "Full Access", "View Reports"],
      protected: true,
    },
    {
      name: "Admin",
      permissions: ["Manage Users", "Edit Content", "View Reports"],
      protected: false,
    },
    {
      name: "Editor",
      permissions: ["Edit Content", "View Reports"],
      protected: false,
    },
    {
      name: "Viewer",
      permissions: ["View Reports"],
      protected: false,
    },
  ];

  const [roles, setRoles] = useState(initialRoles);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("add"); // 'add' or 'edit'
  const [roleForm, setRoleForm] = useState({ name: "", permissions: [] });
  const [editIndex, setEditIndex] = useState(null);
  const [feedback, setFeedback] = useState("");
  const allPermissions = [
    "Manage Admins",
    "Full Access",
    "Manage Users",
    "Edit Content",
    "View Reports",
  ];

  // Permission check helpers
  const canManageRoles = ["Super Admin", "Admin"].includes(currentUserRole);

  // Modal handlers
  const openAddModal = () => {
    setModalType("add");
    setRoleForm({ name: "", permissions: [] });
    setShowModal(true);
    setEditIndex(null);
    setFeedback("");
  };
  const openEditModal = (role, idx) => {
    setModalType("edit");
    setRoleForm({ name: role.name, permissions: [...role.permissions] });
    setShowModal(true);
    setEditIndex(idx);
    setFeedback("");
  };
  const closeModal = () => {
    setShowModal(false);
    setRoleForm({ name: "", permissions: [] });
    setEditIndex(null);
  };

  // Add/Edit/Delete handlers
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "name") {
      setRoleForm((f) => ({ ...f, name: value }));
    } else if (name === "permissions") {
      setRoleForm((f) =>
        checked
          ? { ...f, permissions: [...f.permissions, value] }
          : { ...f, permissions: f.permissions.filter((p) => p !== value) }
      );
    }
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (modalType === "add") {
      setRoles((r) => {
        const updated = [...r, { ...roleForm, protected: false }];
        setFeedback("Role added successfully.");
        console.log("Role added:", roleForm);
        return updated;
      });
    } else if (modalType === "edit" && editIndex !== null) {
      setRoles((r) => {
        const updated = r.map((role, idx) =>
          idx === editIndex ? { ...roleForm, protected: role.protected } : role
        );
        setFeedback("Role updated successfully.");
        console.log("Role updated:", roleForm);
        return updated;
      });
    }
    closeModal();
    setTimeout(() => setFeedback(""), 2000);
  };
  const handleDelete = (idx) => {
    if (window.confirm("Are you sure you want to delete this role?")) {
      setRoles((r) => {
        const updated = r.filter((_, i) => i !== idx);
        setFeedback("Role deleted successfully.");
        console.log("Role deleted at index:", idx);
        return updated;
      });
      setTimeout(() => setFeedback(""), 2000);
    }
  };

  return (
    <div className="roles-container">
      <div className="roles-header">
        <h1>Roles Management</h1>
        <p>Manage roles and permissions for the Shree Krishna Foundation Admin Panel.</p>
        {canManageRoles && (
          <button className="add-role-btn" onClick={openAddModal}>+ Add Role</button>
        )}
      </div>
      {feedback && <div className="roles-feedback">{feedback}</div>}
      <div className="roles-table-wrap">
        <table className="roles-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Permissions</th>
              {canManageRoles && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {roles.map((role, idx) => (
              <tr key={role.name}>
                <td>
                  <span className={`role-badge role-${role.name.replace(/\s/g, "").toLowerCase()}`}>{role.name}</span>
                </td>
                <td>
                  {role.permissions.map((perm) => (
                    <span className="perm-badge" key={perm}>{perm}</span>
                  ))}
                </td>
                {canManageRoles && (
                  <td>
                    <button
                      className="edit-btn"
                      onClick={() => openEditModal(role, idx)}
                      disabled={role.protected && currentUserRole !== "Super Admin"}
                    >Edit</button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(idx)}
                      disabled={role.protected}
                    >Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Modal for Add/Edit Role */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>{modalType === "add" ? "Add Role" : "Edit Role"}</h2>
            <form onSubmit={handleSubmit}>
              <label>
                Role Name:
                <input
                  type="text"
                  name="name"
                  value={roleForm.name}
                  onChange={handleFormChange}
                  required
                  disabled={modalType === "edit" && roleForm.name === "Super Admin"}
                />
              </label>
              <div className="modal-perms">
                <span>Permissions:</span>
                {allPermissions.map((perm) => (
                  <label key={perm} className="perm-checkbox">
                    <input
                      type="checkbox"
                      name="permissions"
                      value={perm}
                      checked={roleForm.permissions.includes(perm)}
                      onChange={handleFormChange}
                    />
                    {perm}
                  </label>
                ))}
              </div>
              <div className="modal-actions">
                <button type="submit" className="save-btn">Save</button>
                <button type="button" className="cancel-btn" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .roles-container {
          max-width: 900px;
          margin: 32px auto;
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 4px 24px rgba(25, 118, 210, 0.10);
          padding: 32px 24px 24px 24px;
          font-family: 'Segoe UI', 'Arial', sans-serif;
        }
        .roles-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 24px;
        }
        .roles-header h1 {
          color: #1976d2;
          font-size: 2rem;
          margin: 0;
        }
        .add-role-btn {
          align-self: flex-end;
          background: #1976d2;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 10px 22px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 8px;
          transition: background 0.2s;
        }
        .add-role-btn:hover {
          background: #125ea2;
        }
        .roles-feedback {
          background: #e3f2fd;
          color: #1976d2;
          border-radius: 8px;
          padding: 10px 18px;
          margin-bottom: 18px;
          font-size: 1.08rem;
          font-weight: 500;
          text-align: center;
        }
        .roles-table-wrap {
          overflow-x: auto;
        }
        .roles-table {
          width: 100%;
          border-collapse: collapse;
          background: #fafbfc;
        }
        .roles-table th, .roles-table td {
          padding: 14px 10px;
          text-align: left;
        }
        .roles-table th {
          background: #e3f2fd;
          color: #1976d2;
          font-size: 1.08rem;
        }
        .roles-table tr:nth-child(even) {
          background: #f7fafd;
        }
        .role-badge {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 16px;
          font-weight: 600;
          font-size: 1rem;
          color: #fff;
        }
        .role-superadmin { background: #d32f2f; }
        .role-admin { background: #1976d2; }
        .role-editor { background: #0288d1; }
        .role-viewer { background: #757575; }
        .perm-badge {
          display: inline-block;
          background: #e3f2fd;
          color: #1976d2;
          border-radius: 12px;
          padding: 4px 12px;
          margin: 2px 6px 2px 0;
          font-size: 0.98rem;
        }
        .edit-btn, .delete-btn {
          background: #fff;
          border: 1.5px solid #1976d2;
          color: #1976d2;
          border-radius: 6px;
          padding: 6px 16px;
          font-size: 1rem;
          font-weight: 500;
          margin-right: 8px;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        .edit-btn:hover, .delete-btn:hover {
          background: #1976d2;
          color: #fff;
        }
        .edit-btn:disabled, .delete-btn:disabled {
          background: #eee;
          color: #aaa;
          border-color: #ccc;
          cursor: not-allowed;
        }
        /* Modal styles */
        .modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(25, 118, 210, 0.18);
          padding: 32px 24px 18px 24px;
          min-width: 320px;
          max-width: 95vw;
        }
        .modal h2 {
          color: #1976d2;
          margin-top: 0;
        }
        .modal label {
          display: block;
          margin-bottom: 12px;
          font-size: 1.05rem;
        }
        .modal input[type="text"] {
          width: 100%;
          padding: 8px 12px;
          border: 1.5px solid #bdbdbd;
          border-radius: 6px;
          font-size: 1rem;
          margin-top: 4px;
        }
        .modal-perms {
          margin-bottom: 16px;
        }
        .perm-checkbox {
          display: inline-block;
          margin-right: 14px;
          font-size: 0.98rem;
        }
        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 10px;
        }
        .save-btn {
          background: #1976d2;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 8px 22px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }
        .cancel-btn {
          background: #fff;
          color: #1976d2;
          border: 1.5px solid #1976d2;
          border-radius: 6px;
          padding: 8px 22px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }
        .cancel-btn:hover {
          background: #1976d2;
          color: #fff;
        }
        @media (max-width: 700px) {
          .roles-container {
            padding: 12px 2px 12px 2px;
          }
          .roles-header h1 {
            font-size: 1.2rem;
          }
          .roles-table th, .roles-table td {
            padding: 8px 4px;
            font-size: 0.98rem;
          }
        }
      `}</style>
    </div>
  );
}

export default Roles;