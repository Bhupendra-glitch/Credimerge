import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import EmiPage from './pages/EmiPage';
import CreditHealth from './pages/CreditHealth';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
        path="/credit-health"
        element={
          <ProtectedRoute>
            <CreditHealth />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}