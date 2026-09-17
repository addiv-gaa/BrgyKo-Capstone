import { useContext } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Register from "./pages/Register"
import NotFound from "./pages/NotFound"
import ProtectedRoute from "./components/ProtectedRoutes"
import Home from "./pages/Home"
import Testpage from "./pages/testpage"
import RequestCertificate from "./pages/RequestCertificate"
import RequestPermit from "./pages/RequestPermit"
import AIAssistant from "./pages/AIAssistant"
import Residents from "./pages/Residents"
import Inventory from "./pages/Inventory"
import Welfare from "./pages/Welfare"
import SKModule from "./pages/SKModule"
import SMSBlast from "./pages/SMSBlast"
import Reports from "./pages/Reports"
import GeoMapping from "./pages/GeoMapping"
import EmergencyContacts from "./pages/EmergencyContacts"
import BarangayOfficials from "./pages/BarangayOfficials"
import Documents from "./pages/Documents"
import CertificateRequests from "./pages/CertificateRequests"
import Announcements from "./pages/Announcements"
import PermitRequests from "./pages/PermitRequests"
import { AuthProvider, AuthContext } from "./components/AuthContext"
import StaffSchedulePage from "./pages/BarangayCalendarStaff"
import ResidentSchedulePage from "./pages/BarangayCalendarUser"
import ReservationForm from "./pages/ReservationForm"
import ClaimProfile from "./pages/ClaimProfile"
import ResidentApprovals from "./pages/ResidentApproval"
import Profile from "./pages/UserProfile"
import ProfileUpdateApprovals from "./pages/ProfileUpdateApprovals"
import ReportIncident from "./pages/ReportIncident"
import TanodDashboard from "./pages/TanodDashboard"
import AdminHub from "./pages/AdminHub"

function Logout() {
  localStorage.clear()
  return <Navigate to="/login" />
}

function RegisterAndLogout() {
  localStorage.clear()
  return <Register />
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

  // 2. Fallback: Directly decode the token from localStorage if context roles are empty
  if (normalizedRoles.length === 0) {
    try {
      const token = localStorage.getItem('access');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const rawRole = payload.role || payload.roles || [];
        normalizedRoles = Array.isArray(rawRole) 
          ? rawRole.map((r: string) => r.toUpperCase()) 
          : [rawRole.toUpperCase()];
      }
    } catch (e) {
      // Ignore token parse errors
    }
  }

  const staffRoles = ['CAPTAIN', 'SECRETARY', 'TREASURER', 'COUNCIL', 'SK', 'TANOD'];
  const isStaff = normalizedRoles.some(role => staffRoles.includes(role));

  // If maintenance mode is active AND the user is NOT staff, lock them out with the matching style card
  if (settings?.maintenance_mode && !isStaff) {
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

  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
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
            <Route path="/testpage" element={<Testpage />} />
            
            {/* NEWLY MOVED PUBLIC PAGES */}
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
                RESIDENT-ONLY ROUTES 
                ========================================= */}
            <Route 
              path="/requestcertificate" 
              element={<ProtectedRoute allowedRoles={['RESIDENT']}><RequestCertificate /></ProtectedRoute>} 
            />
            <Route 
              path="/requestpermit" 
              element={<ProtectedRoute allowedRoles={['RESIDENT']}><RequestPermit /></ProtectedRoute>} 
            />
            <Route 
              path="/reservations/request" 
              element={<ProtectedRoute allowedRoles={['RESIDENT']}><ReservationForm /></ProtectedRoute>} 
            />
            <Route 
              path="/claimprofile" 
              element={<ProtectedRoute allowedRoles={['RESIDENT', 'TANOD', 'SECRETARY', 'CAPTAIN']}><ClaimProfile /></ProtectedRoute>} 
            />
            <Route 
              path="/reportincident" 
              element={<ProtectedRoute allowedRoles={['RESIDENT', 'TANOD', 'SECRETARY', 'CAPTAIN']}><ReportIncident /></ProtectedRoute>} 
            />

            {/* =========================================
                STAFF & ADMIN ROUTES (Secretary & Captain)
                ========================================= */}
            <Route 
              path="/residents" 
              element={<ProtectedRoute allowedRoles={['SECRETARY', 'CAPTAIN']}><Residents /></ProtectedRoute>} 
            />
            <Route 
              path="/residentapproval" 
              element={<ProtectedRoute allowedRoles={['SECRETARY', 'CAPTAIN']}><ResidentApprovals /></ProtectedRoute>} 
            />
            <Route 
              path="/profileupdate" 
              element={<ProtectedRoute allowedRoles={['SECRETARY', 'CAPTAIN']}><ProfileUpdateApprovals /></ProtectedRoute>} 
            />
            <Route 
              path="/certrequests" 
              element={<ProtectedRoute allowedRoles={['SECRETARY', 'CAPTAIN']}><CertificateRequests /></ProtectedRoute>} 
            />
            <Route 
              path="/permitrequests" 
              element={<ProtectedRoute allowedRoles={['SECRETARY', 'CAPTAIN']}><PermitRequests /></ProtectedRoute>} 
            />
            <Route 
              path="/inventory" 
              element={<ProtectedRoute allowedRoles={['SECRETARY', 'CAPTAIN']}><Inventory /></ProtectedRoute>} 
            />
            <Route 
              path="/welfare" 
              element={<ProtectedRoute allowedRoles={['SECRETARY', 'CAPTAIN']}><Welfare /></ProtectedRoute>} 
            />
            <Route 
              path="/skmodule" 
              element={<ProtectedRoute allowedRoles={['SECRETARY', 'CAPTAIN']}><SKModule /></ProtectedRoute>} 
            />
            <Route 
              path="/smsblast" 
              element={<ProtectedRoute allowedRoles={['SECRETARY', 'CAPTAIN']}><SMSBlast /></ProtectedRoute>} 
            />
            <Route 
              path="/reports" 
              element={<ProtectedRoute allowedRoles={['SECRETARY', 'CAPTAIN']}><Reports /></ProtectedRoute>} 
            />
            <Route 
              path="/geomapping" 
              element={<ProtectedRoute allowedRoles={['SECRETARY', 'CAPTAIN', 'TANOD']}><GeoMapping /></ProtectedRoute>} 
            />
            <Route 
              path="/documents" 
              element={<ProtectedRoute allowedRoles={['SECRETARY', 'CAPTAIN']}><Documents /></ProtectedRoute>} 
            />
            <Route 
              path="/adminhub" 
              element={<ProtectedRoute allowedRoles={['SECRETARY', 'CAPTAIN']}><AdminHub /></ProtectedRoute>} 
            />  
            
            {/* =========================================
                MULTI-STAFF ROUTES (Includes Tanods)
                ========================================= */}
            <Route 
              path="/barangaycalendarstaff" 
              element={<ProtectedRoute allowedRoles={['SECRETARY', 'CAPTAIN', 'TANOD']}><StaffSchedulePage /></ProtectedRoute>} 
            />
            <Route 
              path="/tanod/dashboard" 
              element={<ProtectedRoute allowedRoles={['TANOD', 'SECRETARY', 'CAPTAIN']}><TanodDashboard /></ProtectedRoute>} 
            />

          </Routes>
        </AppLayout>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App