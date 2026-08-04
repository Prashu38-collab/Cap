import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import "../styles/Login.css";
import { resetPassword } from "../services/authService";
import { getErrorMessage } from "../utils/errorMessage";

function EyeIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 3l18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M2.5 12s3.5-6.5 9.5-6.5c1 0 1.9.1 2.8.4M21.5 12S18 18.5 12 18.5c-5.9 0-9.5-6.5-9.5-6.5 1-1.8 2.4-3.5 4.2-4.7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
    );
}

export default function ResetPassword() {
    const navigate = useNavigate();
    const location = useLocation();

    const email = location.state?.email || "";

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState(null);

    const noticeTimerRef = useRef(null);

    useEffect(() => {
        if (!email) {
            navigate("/forgot-password", { replace: true });
        }
    }, [email, navigate]);

    useEffect(() => {
        return () => {
            if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        };
    }, []);

    function showNotice(type, message) {
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        setNotice({ type, message });
        noticeTimerRef.current = setTimeout(() => setNotice(null), 5000);
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!newPassword.trim() || !confirmPassword.trim()) {
            showNotice("error", "Please fill in all fields.");
            return;
        }

        if (newPassword.length < 8) {
            showNotice("error", "Password must be at least 8 characters.");
            return;
        }

        if (!/[A-Z]/.test(newPassword)) {
            showNotice("error", "Password must contain an uppercase letter.");
            return;
        }

        if (!/[a-z]/.test(newPassword)) {
            showNotice("error", "Password must contain a lowercase letter.");
            return;
        }

        if (!/[0-9]/.test(newPassword)) {
            showNotice("error", "Password must contain a number.");
            return;
        }

        if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
            showNotice("error", "Password must contain a special character.");
            return;
        }

        if (newPassword !== confirmPassword) {
            showNotice("error", "Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const response = await resetPassword({
                email,
                new_password: newPassword,
                confirm_password: confirmPassword,
            });

            setLoading(false);
            showNotice("success", response.data.message);

            setTimeout(() => {
                navigate("/login", { replace: true });
            }, 1500);
        } catch (error) {
            setLoading(false);

            showNotice("error", getErrorMessage(error, "Failed to reset password."));
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-left">
                <img src="/images/login.png" alt="Reset Password" />
            </div>

            <div className="auth-right">
                <div className="card">
                    <h2>Reset Password</h2>

                    <p className="muted">
                        Enter your new password below.
                    </p>

                    <form onSubmit={handleSubmit} className="form">
                        <div className="password-wrapper">
                            <input
                                name="newPassword"
                                type={showPassword ? "text" : "password"}
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>

                        <div className="password-wrapper">
                            <input
                                name="confirmPassword"
                                type={showConfirm ? "text" : "password"}
                                placeholder="Confirm New Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirm(!showConfirm)}
                            >
                                {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>

                        <button className="btn" type="submit" disabled={loading}>
                            {loading ? "Resetting..." : "Reset Password"}
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
                        <Link to="/login">Back to Login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
