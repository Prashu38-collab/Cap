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
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />

      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/generate" element={<GenerateItinerary />} />

    </Routes>
  );
}

export default App;