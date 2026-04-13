import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import RoomDetailsPage from './pages/RoomDetailsPage';
import LoginPage from './pages/LoginPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import PaymentPage from './pages/PaymentPage';
import Layout from './components/Layout';
import useCatalog from './hooks/useCatalog';
import Hotels from './pages/Hotels';
import MyProfile from './pages/MyProfile';
import SearchHotel from './pages/SearchHotel';
import MyBookings from './pages/MyBookings';
import ViewBookingPage from './pages/ViewBookingPage';
import RegisterPage from './pages/RegisterPage';
import HelpPage from './pages/HelpPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import WriteReviewPage from './pages/WriteReviewPage';
import BookingHistoryPage from './pages/BookingHistoryPage';
import InvoicePage from './pages/InvoicePage';
import VendorLoginPage from './pages/VendorLoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

const ExternalPanelRedirect = () => {
  const location = useLocation();

  useEffect(() => {
    const backendPort = String(import.meta.env.VITE_BACKEND_PORT || '3001');
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!isLocalhost) return;
    if (window.location.port === backendPort) return;

    const target = `${window.location.protocol}//${window.location.hostname}:${backendPort}${location.pathname}${location.search}${location.hash}`;
    window.location.replace(target);
  }, [location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="text-center">
        <div className="text-lg font-semibold">Redirecting...</div>
        <div className="text-sm text-gray-500 mt-2">
          Opening the panel on the backend server (localhost only).
        </div>
      </div>
    </div>
  );
};

// Create a wrapper component to use React Router hooks
const AppContent = () => {
  const navigate = useNavigate();
  const { state, actions } = useCatalog();

  // Create custom navigate function that uses React Router
  const navigateTo = (page, params) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    
    if (page === 'home') navigate('/');
    else if (page === 'login') navigate('/login');
    else if (page === 'roomDetails') navigate('/roomDetails' + query);
    else if (page === 'payment') navigate('/payment');
    else if (page === 'booking') navigate('/booking');
    else if (page === 'hotels') navigate('/hotels');//change
    else if (page === 'searchhotel') navigate('/searchhotel');
    else if (page === 'about') navigate('/about');
    else if (page === 'contact') navigate('/contact');
    else if (page === 'help') navigate('/help');
    else if (page === 'register') navigate('/register');
    else if (page === 'profile') navigate('/profile');
    else if (page === 'bookings') navigate('/bookings');
    else if (page === 'bookingHistory') navigate('/bookingHistory');
    else if (page === 'writeReview') navigate('/writeReview');
    else if (page === 'vendorLogin') window.location.href = 'https://bookndstay.com/vendor';
    
    window.scrollTo(0, 0);
  };

  const extendedActions = {
    ...actions,
    navigate: navigateTo,
  };

  
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/admin/*" element={<ExternalPanelRedirect />} />
          <Route path="/vendor/*" element={<ExternalPanelRedirect />} />
          <Route path="/" element={
            <Layout state={state} actions={extendedActions}>
              <Home state={state} actions={extendedActions} />
            </Layout>
          } />
          <Route path="/reset-password" element={
            <Layout state={state} actions={extendedActions}>
              <ResetPasswordPage />
            </Layout>
          } />
          <Route path="/roomDetails" element={
            <Layout state={state} actions={extendedActions}>
              <RoomDetailsPage state={state} actions={extendedActions} />
            </Layout>
          } />
          <Route path="/hotels" element={
            <Layout state={state} actions={extendedActions}>
              <Hotels state={state} actions={extendedActions} />
            </Layout>
          } />
          <Route path="/searchhotel" element={
            <Layout state={state} actions={extendedActions}>
              <SearchHotel state={state} actions={extendedActions} />
            </Layout>
          } />
          <Route path="/payment" element={
            <Layout state={state} actions={extendedActions}>
              <PaymentPage navigate={navigateTo} />
            </Layout>
          } />
          <Route path="/booking" element={
            <Layout state={state} actions={extendedActions}>
              <BookingConfirmationPage navigate={navigateTo} />
            </Layout>
          } />
          <Route path="/login" element={
            <Layout state={state} actions={extendedActions}>
              <LoginPage navigate={navigateTo} />
            </Layout>
          } />
          <Route path="/profile" element={
            <Layout state={state} actions={extendedActions}>
              <MyProfile navigate={navigateTo} />
            </Layout>
          } />
          <Route path="/bookings" element={
            <Layout state={state} actions={extendedActions}>
              <MyBookings navigate={navigateTo} />
            </Layout>
          } />
          <Route path="/bookingHistory" element={
            <Layout state={state} actions={extendedActions}>
              <BookingHistoryPage />
            </Layout>
          } />
          <Route path="/viewBooking" element={
            <Layout state={state} actions={extendedActions}>
              <ViewBookingPage />
            </Layout>
          } />
          <Route path="/invoice" element={
            <Layout state={state} actions={extendedActions}>
              <InvoicePage />
            </Layout>
          } />
          <Route path="/writeReview" element={
            <Layout state={state} actions={extendedActions}>
              <WriteReviewPage />
            </Layout>
          } />
          <Route path="/register" element={
            <Layout state={state} actions={extendedActions}>
              <RegisterPage navigate={navigateTo} />
            </Layout>
          } />
          <Route path="/vendorLogin" element={
            <Layout state={state} actions={extendedActions}>
              <VendorLoginPage navigate={navigateTo} />
            </Layout>
          } />
          <Route path="/help" element={
            <Layout state={state} actions={extendedActions}>
              <HelpPage navigate={navigateTo} />
            </Layout>
          } />
          <Route path="/about" element={
            <Layout state={state} actions={extendedActions}>
              <AboutPage navigate={navigateTo} />
            </Layout>
          } />
          <Route path="/contact" element={
            <Layout state={state} actions={extendedActions}>
              <ContactPage navigate={navigateTo} />
            </Layout>
          } />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
