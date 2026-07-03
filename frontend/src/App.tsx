import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom"
import Login from "./pages/Login"
import Register from "./pages/Register"
import NotFound from "./pages/NotFound"
import ProtectedRoute from "./components/ProtectedRoutes"
import Home from "./pages/Home"
import Testpage from "./pages/testpage"
import RequestCertificate from "./pages/RequestCertificate"

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
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterAndLogout />} />
        <Route path="/testpage" element={<Testpage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App


