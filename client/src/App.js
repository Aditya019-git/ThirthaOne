import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import NearbyPlaces from './pages/NearbyPlaces';
import Gallery from './pages/Gallery';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BookPass from './pages/BookPass';
import QrPass from './pages/QrPass';
import GateScan from './pages/GateScan';
import AdminDashboard from './pages/AdminDashboard';
import AdminReportDashboard from './pages/AdminReportDashboard';
import GateDashboard from './pages/GateDashboard';
import PriestBooking from './pages/PriestBooking';
import AdminPriestManagement from './pages/AdminPriestManagement';
import PriestDashboard from './pages/PriestDashboard';
import PriestFeedback from './pages/PriestFeedback';
import GuideBooking from './pages/GuideBooking';
import GuideDashboard from './pages/GuideDashboard';
import AdminGuideManagement from './pages/AdminGuideManagement';
import GuideFeedback from './pages/GuideFeedback';
import AdminPayouts from './pages/AdminPayouts';
import AdminGateManagement from './pages/AdminGateManagement';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/"         element={<Home />} />
          <Route path="/about"    element={<About />} />
          <Route path="/contact"  element={<Contact />} />
          <Route path="/nearby"   element={<NearbyPlaces />} />
          <Route path="/gallery"  element={<Gallery />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login"    element={<Login />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['devotee','admin','priest','guide','gate_officer']}>
              <Dashboard />
            </ProtectedRoute>
          }/>
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
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
          <Route path="/admin/reports" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout>
                <AdminReportDashboard />
              </AdminLayout>
            </ProtectedRoute>
          }/>
          <Route path="/admin/payouts" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout>
                <AdminPayouts />
              </AdminLayout>
            </ProtectedRoute>
          }/>

          <Route path="/gate" element={
            <ProtectedRoute allowedRoles={['gate_officer', 'admin']}>
              <GateDashboard />
            </ProtectedRoute>
          }/>
          <Route path="/gate/scan" element={
            <ProtectedRoute allowedRoles={['gate_officer', 'admin']}>
              <GateScan />
            </ProtectedRoute>
          }/>
          <Route path="/priest-booking" element={
            <ProtectedRoute allowedRoles={['devotee', 'admin']}>
              <PriestBooking />
            </ProtectedRoute>
          }/>
          <Route path="/priest" element={
            <ProtectedRoute allowedRoles={['priest', 'admin']}>
              <PriestDashboard />
            </ProtectedRoute>
          }/>
          <Route path="/priest-feedback/:id" element={
            <ProtectedRoute allowedRoles={['devotee', 'admin']}>
              <PriestFeedback />
            </ProtectedRoute>
          }/>
          <Route path="/admin/priests" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout>
                <AdminPriestManagement />
              </AdminLayout>
            </ProtectedRoute>
          }/>

          <Route path="/admin/gate-officers" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout>
                <AdminGateManagement />
              </AdminLayout>
            </ProtectedRoute>
          }/>

          <Route path="/guide-booking" element={
            <ProtectedRoute allowedRoles={['devotee', 'admin']}>
              <GuideBooking />
            </ProtectedRoute>
          }/>
          <Route path="/guide" element={
            <ProtectedRoute allowedRoles={['guide', 'admin']}>
              <GuideDashboard />
            </ProtectedRoute>
          }/>
          <Route path="/guide-feedback/:id" element={
            <ProtectedRoute allowedRoles={['devotee', 'admin']}>
              <GuideFeedback />
            </ProtectedRoute>
          }/>
          <Route path="/admin/guides" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout>
                <AdminGuideManagement />
              </AdminLayout>
            </ProtectedRoute>
          }/>

          <Route path="/unauthorized" element={<h2 style={{padding:'2rem'}}>Access Denied.</h2>} />

          {/* Catch-all redirect for dead links */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
