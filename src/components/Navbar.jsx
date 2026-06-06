import { NavLink } from "react-router-dom";

import "../styles/navbar.css";

function Navbar() {
  return (
    <header className="navbar">
        <div className="container">
            {/*--Logo-- */}
            <div className="logo">
              <NavLink to="/">Go Travel</NavLink>
            </div>

            {/* --Navigation Links-- */}
            <nav>

              <NavLink to="/" className={({ isActive }) => isActive ? "active" : "" } >
                Dashboard
              </NavLink>

              <NavLink to="/plantrip" className={({ isActive }) => isActive ? "active" : "" } >
                Plan My Trip
              </NavLink>

              <NavLink to="/about" className={({ isActive }) => isActive ? "active" : "" } >
                About Us
              </NavLink>

              <NavLink to="/contact" className={({ isActive }) => isActive ? "active" : "" } >
                Contact Us
              </NavLink>

              <NavLink to="/profile" className={({ isActive }) => isActive ? "active" : "" } >
                My Profile
              </NavLink>

          </nav>

            {/* --Logout button-- */}
            <NavLink to="/login" className="logout">
              Logout
            </NavLink>
        </div>
    </header>
  );
}

export default Navbar;