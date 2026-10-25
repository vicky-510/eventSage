import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewEvent from './pages/NewEvent.jsx';
import EventDetail from './pages/EventDetail.jsx';
import EventGuests from './pages/EventGuests.jsx';
import PublicRsvp from './pages/PublicRsvp.jsx';

export default function App() {
  return (
    <AuthProvider>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/new"
            element={
              <ProtectedRoute>
                <NewEvent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id"
            element={
              <ProtectedRoute>
                <EventDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id/guests"
            element={
              <ProtectedRoute>
                <EventGuests />
              </ProtectedRoute>
            }
          />
          <Route path="/e/:publicId" element={<PublicRsvp />} />
        </Routes>
      </main>
      <Footer />
    </AuthProvider>
  );
}
