import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

import "../styles/navbar.css";

function Navbar() {

  const navigate = useNavigate();
  const handleLogout = () => {
    // Clear all auth data
    localStorage.removeItem('token');
    localStorage.removeItem("user");
    sessionStorage.clear();
    navigate("/login", { replace: true }); 
    // Replace true prevents the user from pressing the browser's Back button and returning to the previous page in the history.
  };

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header className={`navbar ${scrolled ? "scrolled" : ""}`}>
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

            <button onClick={handleLogout} className="logout"> Logout </button>

        </div>
    </header>
  );
}

export default Navbar;