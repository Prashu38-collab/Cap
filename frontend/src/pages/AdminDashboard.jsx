import { Outlet, NavLink, useNavigate } from "react-router-dom";
import "../styles/admin.css";

function AdminDashboard() {

    const navigate = useNavigate();

    const handleLogout = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.clear();
      navigate("/login", { replace: true }); 
    };

    return (

        <div className="admin-layout">

            {/* Sidebar */}

            <aside className="admin-sidebar">

                <h2>Go Travel</h2>

                <ul>
                    <li>
                      <NavLink to="/admin" end className={({ isActive }) => isActive ? "active" : "" } >
                        Dashboard
                      </NavLink>
                    </li>

                    <li>
                      <NavLink to="/admin/users" className={({ isActive }) => isActive ? "active" : "" } >
                        Users
                      </NavLink>
                    </li>

                    <li>
                      <NavLink to="/admin/destinations" className={({ isActive }) => isActive ? "active" : "" } >
                        Destinations
                      </NavLink>
                    </li>

                    <li>
                      <NavLink to="/admin/hotels" className={({ isActive }) => isActive ? "active" : "" } >
                        Hotels
                      </NavLink>
                    </li>

                    <li>
                      <NavLink to="/admin/generated-itineraries" className={({ isActive }) => isActive ? "active" : "" } >
                        Generated Itineraries
                      </NavLink>
                    </li>

                    <li>
                      <NavLink to="/admin/messages" className={({ isActive }) => isActive ? "active" : "" } >
                        Contact Messages
                      </NavLink>
                    </li>

                    <li className="logout" onClick={handleLogout} >
                      Logout
                    </li>

                </ul>

            </aside>

            {/* Page Content */}

            <main className="admin-content">
              <Outlet />
            </main>

        </div>

    );

}

export default AdminDashboard;