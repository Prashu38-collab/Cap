import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>404</h1>
      <h2 style={styles.subHeading}>Page Not Found</h2>
      <p style={styles.text}>Oops! The page you are looking for does not exist.</p>

      <Link to="/" style={styles.link}>
        Go Back
      </Link>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    textAlign: "center",
    padding: "20px",
    backgroundColor: "#f8f9fa",
  },
  heading: {
    fontSize: "120px",
    fontWeight: "bold",
    color: "#111827",
    margin: "0",
    lineHeight: "1",
  },
  subHeading: {
    fontSize: "32px",
    color: "#343a40",
    marginTop: "10px",
  },
  text: {
    fontSize: "18px",
    color: "#6c757d",
    marginTop: "10px",
    maxWidth: "500px",
  },
  link: {
    display: "inline-block",
    marginTop: "25px",
    padding: "12px 28px",
    backgroundColor: "#007bff",
    color: "#fff",
    textDecoration: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "500",
    transition: "background-color 0.3s ease",
  },
};
