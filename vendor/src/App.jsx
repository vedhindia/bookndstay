import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom"
import VendorLogin from "./VendorLogin"
import Dashboard from "./Dashboard"
import ForgotPassword from './ForgotPassword'
import ResetPassword from './ResetPassword'

function App() {
  return (
    <BrowserRouter basename="/vendor">
      <Routes>
        <Route path="/" element={<VendorLogin />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App