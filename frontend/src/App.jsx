import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import PlanTrip from "./pages/PlanTrip";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Profile from "./pages/Profile";
import GenerateItinerary from "./pages/GenerateItinerary";
import RecommendedItinerary from "./pages/RecommendedItinerary";

import AdminDashboard from "./pages/AdminDashboard";
import DashboardSection from "./components/admin/AdminDashboardSection";
import UsersSection from "./components/admin/ManageUsers";
import ContactSection from "./components/admin/ContactMessages";
import ManageDestinations from "./components/admin/ManageDestinations";
import ManageHotels from "./components/admin/ManageHotels";
import ManageGeneratedItineraries from './components/admin/ManageGeneratedItineraries';

import NotFound from "./pages/NotFound";

const UserProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  return token && role === "user"
  ? children
  : <Navigate to="/login" replace />;
};

const AdminProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  return token && role === "admin"
  ? children
  : <Navigate to="/login" replace />;
};

function App() {

  return (
    <Routes>

      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<UserProtectedRoute><Dashboard /></UserProtectedRoute>} />
      <Route path="/plantrip" element={<UserProtectedRoute><PlanTrip /></UserProtectedRoute>} />
      <Route path="/about" element={<UserProtectedRoute><About /></UserProtectedRoute>} />
      <Route path="/contact" element={<UserProtectedRoute><Contact /></UserProtectedRoute>} />
      <Route path="/profile" element={<UserProtectedRoute><Profile /></UserProtectedRoute>} />
      <Route path="/generate" element={<UserProtectedRoute><GenerateItinerary /></UserProtectedRoute>} />
      {/* <Route path="/forgot-password" element={<UserProtectedRoute><ForgotPassword /></UserProtectedRoute>} /> */}
      <Route path="/recommended/:slug" element={<UserProtectedRoute><RecommendedItinerary /></UserProtectedRoute>} />

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>}>
        <Route index element={<DashboardSection />} />
        <Route path="users" element={<UsersSection />} />
        <Route path="messages" element={<ContactSection />} />
        <Route path="destinations" element={<ManageDestinations />} />
        <Route path="hotels" element={<ManageHotels />} />
        <Route path="generated-itineraries" element={<ManageGeneratedItineraries />} />
      </Route>

      <Route path="*" element={<NotFound />} />

    </Routes>
  );
}

export default App;
