import { Link } from "react-router-dom";
import "../styles/footer.css";

function Footer() {
  return (
    <footer>
      <div className="footerContainer">

        <div className="footer-social">
          <a href="https://www.facebook.com" target="_blank" rel="noreferrer">
            <i className="fa-brands fa-facebook"></i>
          </a>

          <a href="https://www.instagram.com" target="_blank" rel="noreferrer">
            <i className="fa-brands fa-instagram"></i>
          </a>

          <a href="https://x.com" target="_blank" rel="noreferrer">
            <i className="fa-brands fa-x-twitter"></i>
          </a>

          <a href="https://www.youtube.com" target="_blank" rel="noreferrer">
            <i className="fa-brands fa-youtube"></i>
          </a>
        </div>

        <div className="footer-links">
          <ul>
            <li><Link to="/">Dashboard</Link></li>
            <li><Link to="/plantrip">Plan My Trip</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
            <li><Link to="/profile">My Profile</Link></li>
          </ul>
        </div>

        <div className="footer-copyright">
          <p>Copyright © 2026 Go Travel | All Rights Reserved</p>
        </div>

      </div>
    </footer>
  );
}

export default Footer;