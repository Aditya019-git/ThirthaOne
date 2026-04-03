import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BookPass from './pages/BookPass';
import QrPass from './pages/QrPass';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/"         element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login"    element={<Login />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['devotee','admin','priest','guide','gate_officer']}>
              <Dashboard />
            </ProtectedRoute>
          }/>
          <Route path="/book-pass" element={
            <ProtectedRoute allowedRoles={['devotee', 'admin']}>
              <BookPass />
            </ProtectedRoute>
          }/>
          <Route path="/booking/:bookingId/qr" element={
            <ProtectedRoute allowedRoles={['devotee', 'admin']}>
              <QrPass />
            </ProtectedRoute>
          }/>

          <Route path="/unauthorized" element={<h2 style={{padding:'2rem'}}>Access Denied.</h2>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
