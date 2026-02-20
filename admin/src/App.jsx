import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom"
import AdminLogin from "./AdminLogin"
import Dashboard from "./Dashboard"
import ForgotPassword from './ForgotPassword'
import ResetPassword from './ResetPassword'

const RequireAdmin = ({ children }) => {
  if (typeof window === 'undefined') {
    return null
  }

  const token = localStorage.getItem("adminToken")
  const userStr = localStorage.getItem("adminUser")

  if (!token || !userStr) {
    return <Navigate to="/" replace />
  }

  try {
    const user = JSON.parse(userStr)
    const role = (user.role || '').toUpperCase()
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return <Navigate to="/" replace />
    }
  } catch {
    return <Navigate to="/" replace />
  }

  return children
}

function App() {
  return (
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/" element={<AdminLogin />} />
        <Route
          path="/dashboard/*"
          element={
            <RequireAdmin>
              <Dashboard />
            </RequireAdmin>
          }
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
