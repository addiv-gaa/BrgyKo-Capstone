import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom"
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
import {AuthProvider} from "./components/AuthContext"
import StaffSchedulePage from "./pages/BarangayCalendarStaff"
import ResidentSchedulePage from "./pages/BarangayCalendarUser"
import ReservationForm from "./pages/ReservationForm"
import ClaimProfile from "./pages/ClaimProfile"
import ResidentApprovals from "./pages/ResidentApproval"
import Profile from "./pages/UserProfile"
import ProfileUpdateApprovals from "./pages/ProfileUpdateApprovals"

function Logout(){
  localStorage.clear()
  return <Navigate to="/login" />
}

function RegisterAndLogout() {
  localStorage.clear()
  return <Register/>
}


function App() {
  return (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
          } 
        />
        <Route 
          path="/requestcertificate" 
          element={
          <ProtectedRoute>
            <RequestCertificate />
          </ProtectedRoute>
          }
        />
        <Route 
          path="/requestpermit" 
          element={
          <ProtectedRoute>
            <RequestPermit />
          </ProtectedRoute>
          }
        />
        <Route 
          path="/aiassistant" 
          element={
          <ProtectedRoute>
            <AIAssistant />
          </ProtectedRoute>
          }
        />
        <Route
          path="/announcements"
          element={
          <ProtectedRoute>
            <Announcements />
          </ProtectedRoute>
          }
        />
        <Route
          path="/emergencycontacts"
          element={
          <ProtectedRoute>
            <EmergencyContacts />
          </ProtectedRoute>
          }
        />
        <Route
          path="/barangayofficials"
          element={
          <ProtectedRoute>
            <BarangayOfficials />
          </ProtectedRoute>
          }
        />
        <Route
          path="/residents"
          element={
          <ProtectedRoute>
            <Residents />
          </ProtectedRoute>
          }
        /> 
        <Route
          path="/inventory"
          element={
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
          }
        />  
        <Route
          path="/welfare"
          element={
          <ProtectedRoute>
            <Welfare />
          </ProtectedRoute>
          }
        />    
        <Route
          path="/skmodule"
          element={
          <ProtectedRoute>
            <SKModule /> 
          </ProtectedRoute>
          }
        />
        <Route
          path="/smsblast"
          element={
          <ProtectedRoute>
            <SMSBlast />
          </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
          }
        />
        <Route
          path="/geomapping"
          element={
          <ProtectedRoute>
            <GeoMapping />
          </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
          <ProtectedRoute>
            <Documents />
          </ProtectedRoute>
          }
        />
        <Route
          path="/certrequests"
          element={
          <ProtectedRoute>
            <CertificateRequests />
          </ProtectedRoute>
          }
        />
        <Route
          path = "/permitrequests"
          element={
            <ProtectedRoute>
              <PermitRequests />
            </ProtectedRoute>
          }
        />
         <Route
          path = "/barangaycalendarstaff"
          element={
            <ProtectedRoute>
              <StaffSchedulePage />
            </ProtectedRoute>
          }
        />
        <Route
          path = "/resident/schedule"
          element={
            <ProtectedRoute>
              <ResidentSchedulePage />
            </ProtectedRoute>
          }
        />
        <Route
          path = "/reservations/request"
          element={
            <ProtectedRoute>
              <ReservationForm />
            </ProtectedRoute>
          }
        />
        <Route
          path = "/claimprofile"
          element={
            <ProtectedRoute>
              <ClaimProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path = "/residentapproval"
          element={
            <ProtectedRoute>
              <ResidentApprovals />
            </ProtectedRoute>
          }
        />
        <Route
          path = "profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        /><Route
          path = "/profileupdate"
          element={
            <ProtectedRoute>
              <ProfileUpdateApprovals />
            </ProtectedRoute>
          }
        />
        <Route path="/logout" element={<Logout />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterAndLogout />} />
        <Route path="/testpage" element={<Testpage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
  )
}

export default App


