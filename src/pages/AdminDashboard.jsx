import { useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardSection from "../components/admin/AdminDashboardSection";
import UsersSection from "../components/admin/ManageUsers";
import ItinerarySection from "../components/admin/ManageItinerary";
import DatabaseSection from "../components/admin/ManageDatabase";
import ContactSection from "../components/admin/ContactMessages";

import "../styles/admin.css";

function AdminDashboard() {
  
  const navigate = useNavigate();
  const handleLogout = () => {

    localStorage.removeItem("token");
    // localStorage.removeItem("user");
    sessionStorage.clear();
    navigate("/login");
  };

  const [activePage, setActivePage] = useState("dashboard");

  return (
    <div className="admin-layout">

      {/* Sidebar */}
      <aside className="admin-sidebar">

        <h2>Go Travel</h2>

        <ul>

          <li
            className={activePage === "dashboard" ? "active" : ""}
            onClick={() => setActivePage("dashboard")}
          >
            Dashboard
          </li>

          <li
            className={activePage === "users" ? "active" : ""}
            onClick={() => setActivePage("users")}
          >
            Manage Users
          </li>

          <li
            className={activePage === "itineraries" ? "active" : ""}
            onClick={() => setActivePage("itineraries")}
          >
            Manage Itineraries
          </li>

          <li
            className={activePage === "database" ? "active" : ""}
            onClick={() => setActivePage("database")}
          >
            Manage Database
          </li>

          <li
            className={activePage === "messages" ? "active" : ""}
            onClick={() => setActivePage("messages")}
          >
            Contact Messages
          </li>

          <li className="logout" onClick={handleLogout}>
            Logout
          </li>

        </ul>

      </aside>

      {/* Main Content */}
      <main className="admin-content">

        {activePage === "dashboard" && <DashboardSection />}

        {activePage === "users" && <UsersSection />}

        {activePage === "itineraries" && <ItinerarySection />}

        {activePage === "database" && <DatabaseSection />}

        {activePage === "messages" && <ContactSection />}

      </main>

    </div>
  );
}

export default AdminDashboard;