import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyOTP from "./pages/VerifyOTP";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyResetOTP from "./pages/VerifyResetOTP";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import PlanTrip from "./pages/PlanTrip";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Profile from "./pages/Profile";
import GenerateItinerary from "./pages/GenerateItinerary";
import Transport from "./pages/Transport";

import { isLoggedIn } from "./utils/authStorage";
import ProtectedRoute from "./components/ProtectedRoute";

import AdminDashboard from "./pages/AdminDashboard";
import DashboardSection from "./components/admin/AdminDashboardSection";
import UsersSection from "./components/admin/ManageUsers";
import ContactSection from "./components/admin/ContactMessages";
import ManageDestinations from "./components/admin/ManageDestinations";
import ManageHotels from "./components/admin/ManageHotels";
import ManageGeneratedItineraries from './components/admin/ManageGeneratedItineraries';

function App() {

  const isAuthenticated = isLoggedIn();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-reset-otp" element={<VerifyResetOTP />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected Routes */}
      <Route path="/plantrip" element={<ProtectedRoute><PlanTrip /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/generate" element={<ProtectedRoute><GenerateItinerary /></ProtectedRoute>} />
      <Route path="/transport" element={<ProtectedRoute><Transport /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>}>
          <Route index element={<DashboardSection />} />
          <Route path="users" element={<UsersSection />} />
          <Route path="messages" element={<ContactSection />} />
          <Route path="destinations" element={<ManageDestinations />} />
          <Route path="hotels" element={<ManageHotels />} />
          <Route path="generated-itineraries" element={<ManageGeneratedItineraries />} />
      </Route>

      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />

    </Routes>
  );
}

export default App;
