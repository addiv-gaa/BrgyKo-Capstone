import { useContext, useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom"
import DashboardLayout from "./components/DashboardLayout"
import Login from "./pages/Login"
import Register from "./pages/Register"
import NotFound from "./pages/NotFound"
import ProtectedRoute from "./components/ProtectedRoutes"
import Home from "./pages/Home"
import AIAssistant from "./pages/AIAssistant"
import Residents from "./pages/Residents"
import Reports from "./pages/Reports"
import GeoMapping from "./pages/GeoMapping"
import EmergencyContacts from "./pages/EmergencyContacts"
import BarangayOfficials from "./pages/BarangayOfficials"
import Documents from "./pages/Documents"
import Announcements from "./pages/Announcements"
import { AuthProvider, AuthContext } from "./components/AuthContext"
import { SettingsProvider } from "./components/SettingsContext"
import StaffSchedulePage from "./pages/BarangayCalendarStaff"
import ResidentSchedulePage from "./pages/BarangayCalendarUser"
import Profile from "./pages/UserProfile"
import AdminHub from "./pages/AdminHub"
import MustChangePasswordModal from "./components/MustChangePasswordModal"


function Logout() {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const doLogout = async () => {
      if (auth) {
        await auth.logout();
      }
      localStorage.clear();
      navigate('/login', { replace: true });
    };
    doLogout();
  }, [auth, navigate]);

  return <div className="flex h-screen items-center justify-center">Logging out...</div>;
}

function RegisterAndLogout() {
  const auth = useContext(AuthContext);
  
  useEffect(() => {
    const doLogout = async () => {
      if (auth) {
        await auth.logout();
      }
      localStorage.clear();
    };
    doLogout();
  }, [auth]);

  return <Register />;
}

// Global Maintenance Mode Guard Wrapper
function AppLayout({ children }: { children: React.ReactNode }) {
  const authContext = useContext(AuthContext);
  const settings = authContext?.settings;
  const user = authContext?.user;

  // 1. Check user roles from context state
  let normalizedRoles: string[] = Array.isArray(user?.roles)
    ? user.roles.map((r: string) => r.toUpperCase())
    : typeof user?.roles === "string"
    ? [(user.roles as string).toUpperCase()]
    : [];

  const staffRoles = ['CAPTAIN', 'ADMIN', 'STAFF'];
  const isStaff = normalizedRoles.some(role => staffRoles.includes(role));

  const location = useLocation();
  const noLayoutRoutes = ['/login', '/register', '/logout'];
  const hideLayout = noLayoutRoutes.includes(location.pathname);

  // If maintenance mode is active AND the user is NOT staff, lock them out with the matching style card
  // BUT allow access to login/logout pages so staff can actually login to disable it
  if (settings?.maintenance_mode && !isStaff && !hideLayout) {
      return (
          <div className="h-screen w-full flex items-center justify-center bg-gray-100 p-8 z-50 fixed inset-0 font-sans">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center space-y-3 max-w-lg w-full shadow-sm">
                  <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto font-bold text-lg">!</div>
                  <h3 className="text-lg font-bold text-amber-900">System Under Maintenance</h3>
                  <p className="text-sm text-amber-700 max-w-md mx-auto leading-relaxed">
                      {settings.barangay_name || "Barangay"} online portals are temporarily offline for scheduled system updates. Please check back later or visit the barangay hall for urgent concerns.
                  </p>
              </div>
          </div>
      );
  }

  if (hideLayout) {
      return <>{children}</>;
  }

  return (
    <>
      <MustChangePasswordModal />
      <DashboardLayout>{children}</DashboardLayout>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <AppLayout>
          <Routes>
            
            {/* =========================================
                PUBLIC ROUTES (No login required)
                ========================================= */}
            <Route path="/" element={<Home />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegisterAndLogout />} />
            
            {/* Public Information Pages */}
            <Route path="/aiassistant" element={<AIAssistant />} />
            <Route path="/emergencycontacts" element={<EmergencyContacts />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/barangayofficials" element={<BarangayOfficials />} />
            <Route path="/resident/schedule" element={<ResidentSchedulePage />} /> {/* Barangay Calendar */}

            {/* Catch-all for 404 Not Found / Unauthorized */}
            <Route path="/unauthorized" element={<div className="h-screen flex items-center justify-center text-red-500 font-bold text-2xl">403 - Unauthorized Access</div>} />
            <Route path="*" element={<NotFound />} />


            {/* =========================================
                SHARED ROUTES (Accessible by any logged-in user) 
                ========================================= */}
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            {/* =========================================
                STAFF & ADMIN ROUTES (Secretary & Captain)
                ========================================= */}
            <Route 
              path="/residents" 
              element={<ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'CAPTAIN']}><Residents /></ProtectedRoute>} 
            />
            <Route 
              path="/barangaycalendarstaff" 
              element={<ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'CAPTAIN']}><StaffSchedulePage /></ProtectedRoute>} 
            />
            <Route 
              path="/reports" 
              element={<ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'CAPTAIN']}><Reports /></ProtectedRoute>} 
            />
            <Route 
              path="/geomapping" 
              element={<ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'CAPTAIN']}><GeoMapping /></ProtectedRoute>} 
            />
            <Route 
              path="/documents" 
              element={<ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'CAPTAIN']}><Documents /></ProtectedRoute>} 
            />
            <Route 
              path="/adminhub" 
              element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminHub /></ProtectedRoute>} 
            />  

          </Routes>
        </AppLayout>
      </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  )
}

export default App
