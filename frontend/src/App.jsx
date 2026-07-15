import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import PlanTrip from "./pages/PlanTrip";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Profile from "./pages/Profile";
import GenerateItinerary from "./pages/GenerateItinerary";

import { getCurrentUser } from "./utils/authStorage";

import AdminDashboard from "./pages/AdminDashboard";
import DashboardSection from "./components/admin/AdminDashboardSection";
import UsersSection from "./components/admin/ManageUsers";
import ContactSection from "./components/admin/ContactMessages";
import ManageDestinations from "./components/admin/ManageDestinations";
import ManageHotels from "./components/admin/ManageHotels";
import ManageGeneratedItineraries from './components/admin/ManageGeneratedItineraries';

const ProtectedRoute = ({ children }) => {
  return getCurrentUser() ? children : <Navigate to="/login" replace />;
};

function App() {

  const isAuthenticated = !!getCurrentUser();

  return (
    <Routes>
      {/* <Route path="/" element={<Dashboard />} />
      <Route path="/plantrip" element={<PlanTrip />} /> */}


      {/* <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/plantrip" element={<ProtectedRoute><PlanTrip /></ProtectedRoute>} />
      <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
      <Route path="/contact" element={<ProtectedRoute><Contact /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} /> */}

      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/plantrip" element={<PlanTrip />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route path="/generate" element={<GenerateItinerary />} />

      <Route path="/admin" element={<AdminDashboard />}>
          <Route index element={<DashboardSection />} />
          <Route path="users" element={<UsersSection />} />
          <Route path="messages" element={<ContactSection />} />
          <Route path="destinations" element={<ManageDestinations />} />
          <Route path="hotels" element={<ManageHotels />} />
          <Route path="generated-itineraries" element={<ManageGeneratedItineraries />} />
      </Route>

    </Routes>
  );
}

export default App;