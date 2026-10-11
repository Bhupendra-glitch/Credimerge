import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Home from './pages/Home';
import EmiPage from './pages/EmiPage';
import CreditHealth from './pages/CreditHealth';
import TransactionsPage from './pages/TransactionsPage';
import PasswordReset from './pages/PasswordReset';
import ProtectedRoute from './components/ProtectedRoute';
import AppBackground from './components/AppBackground';

export default function App() {
  return (
    <>
      <AppBackground />
      <div className="app-content">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<PasswordReset mode="request" />} />
          <Route path="/reset-password" element={<PasswordReset mode="reset" />} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/emi"
            element={
              <ProtectedRoute>
                <EmiPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <TransactionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/credit-health"
            element={
              <ProtectedRoute>
                <CreditHealth />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}