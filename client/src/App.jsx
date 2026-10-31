import { lazy, Suspense, useEffect, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Spinner from './components/Spinner.jsx';
import Landing from './pages/Landing.jsx';

// Landing stays in the main chunk since it's the first paint for most visitors;
// every other page is split out and only downloaded when navigated to.
const Login = lazy(() => import('./pages/Login.jsx'));
const Signup = lazy(() => import('./pages/Signup.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const NewEvent = lazy(() => import('./pages/NewEvent.jsx'));
const EventDetail = lazy(() => import('./pages/EventDetail.jsx'));
const EventGuests = lazy(() => import('./pages/EventGuests.jsx'));
const PublicRsvp = lazy(() => import('./pages/PublicRsvp.jsx'));

function protectedElement(Page) {
  return (
    <ProtectedRoute>
      <Page />
    </ProtectedRoute>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const mainRef = useRef(null);
  const isFirstRender = useRef(true);

  // Client-side navigation doesn't move focus the way a full page load does, so
  // screen-reader and keyboard users would otherwise stay stranded on the old
  // link. Move focus to <main> on every route change after the first.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <AuthProvider>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" ref={mainRef} tabIndex={-1}>
        <Suspense
          fallback={
            <div className="container">
              <Spinner label="Loading…" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={protectedElement(Dashboard)} />
            <Route path="/events/new" element={protectedElement(NewEvent)} />
            <Route path="/events/:id" element={protectedElement(EventDetail)} />
            <Route path="/events/:id/guests" element={protectedElement(EventGuests)} />
            <Route path="/e/:publicId" element={<PublicRsvp />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </AuthProvider>
  );
}
