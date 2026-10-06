import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import EmiPage from './pages/EmiPage';
import CreditHealth from './pages/CreditHealth';
import ProtectedRoute from './components/ProtectedRoute';
import AppBackground from './components/AppBackground';

export default function App() {
  return (
    <>
      <AppBackground />
      <div className="app-content">
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
      </div>
    </>
  );
}