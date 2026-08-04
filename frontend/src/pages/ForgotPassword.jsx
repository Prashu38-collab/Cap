import React, { useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/VerifyOTP.css";
import { forgotPassword } from "../services/authService";
import { getErrorMessage } from "../utils/errorMessage";

export default function ForgotPassword() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState(null);
    const noticeTimerRef = useRef(null);

    function showNotice(type, message) {
        if (noticeTimerRef.current) {
            clearTimeout(noticeTimerRef.current);
        }
        setNotice({ type, message });
        noticeTimerRef.current = setTimeout(() => setNotice(null), 5000);
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!email.trim()) {
            showNotice("error", "Please enter your email address.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showNotice("error", "Please enter a valid email address.");
            return;
        }

        setLoading(true);

        try {
            const response = await forgotPassword({ email: email.trim() });

            setLoading(false);
            showNotice("success", response.data.message);

            setTimeout(() => {
                navigate("/verify-reset-otp", { state: { email: email.trim() } });
            }, 1500);
        } catch (error) {
            setLoading(false);

            showNotice("error", getErrorMessage(error, "Failed to send OTP."));
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-left">
                <img src="/images/login.png" alt="Forgot Password" />
            </div>

            <div className="auth-right">
                <div className="card">
                    <h2>Forgot Password</h2>

                    <p className="muted">
                        Enter your email address and we'll send you a verification code to reset your password.
                    </p>

                    <form onSubmit={handleSubmit} className="form">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <button className="btn" type="submit" disabled={loading}>
                            {loading ? "Sending..." : "Send Reset Code"}
                        </button>
                    </form>

                    {notice && (
                        <div className={`toast ${notice.type}`} role="status" aria-live="polite">
                            <span className="toast-icon">
                                {notice.type === "success" ? "✓" : "!"}
                            </span>
                            <span className="toast-message">{notice.message}</span>
                        </div>
                    )}

                    <p className="muted" style={{ marginTop: "25px" }}>
                        Remember your password?{" "}
                        <Link to="/login">Login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
