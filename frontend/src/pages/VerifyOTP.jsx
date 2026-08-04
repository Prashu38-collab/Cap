import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import "../styles/VerifyOTP.css";
import { verifyOTP, resendOTP } from "../services/authService";
import { getErrorMessage } from "../utils/errorMessage";

export default function VerifyOTP() {
    const navigate = useNavigate();
    const location = useLocation();

    const email = location.state?.email || "";

    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [timer, setTimer] = useState(60);
    const [notice, setNotice] = useState(null);

    const noticeTimerRef = useRef(null);
    const redirectTimerRef = useRef(null);

    // Redirect if no email is provided
    useEffect(() => {
        if (!email) {
            navigate("/signup", { replace: true });
        }
    }, [email, navigate]);

    // Countdown timer
    useEffect(() => {
        if (timer <= 0) return;

        const interval = setInterval(() => {
            setTimer((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [timer]);

    // Cleanup timers when component unmounts
    useEffect(() => {
        return () => {
            if (noticeTimerRef.current) {
                clearTimeout(noticeTimerRef.current);
            }

            if (redirectTimerRef.current) {
                clearTimeout(redirectTimerRef.current);
            }
        };
    }, []);

    function showNotice(type, message) {
        if (noticeTimerRef.current) {
            clearTimeout(noticeTimerRef.current);
        }

        setNotice({
            type,
            message,
        });

        noticeTimerRef.current = setTimeout(() => {
            setNotice(null);
        }, 5000);
    }

    async function handleVerify(e) {
        e.preventDefault();

        if (!otp.trim()) {
            showNotice("error", "Please enter the OTP.");
            return;
        }

        if (!/^\d{6}$/.test(otp)) {
            showNotice("error", "OTP must be 6 digits.");
            return;
        }

        try {
            setLoading(true);

            const response = await verifyOTP({
                email,
                otp,
            });

            setLoading(false);

            showNotice("success", response.data.message);

            redirectTimerRef.current = setTimeout(() => {
                navigate("/login", { replace: true });
            }, 1500);
        } catch (error) {
            setLoading(false);

            showNotice("error", getErrorMessage(error, "Verification failed."));
        }
    }

    async function handleResend() {
        try {
            setResending(true);

            const response = await resendOTP({
                email,
            });

            setResending(false);

            showNotice("success", response.data.message);

            setTimer(60);
        } catch (error) {
            setResending(false);

            showNotice("error", getErrorMessage(error, "Failed to resend OTP."));
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-left">
                <img
                    src="/images/login.png"
                    alt="Verify OTP"
                />
            </div>

            <div className="auth-right">
                <div className="card">
                    <h2>Email Verification</h2>

                    <p className="muted">
                        Enter the OTP sent to
                    </p>

                    <p
                        className="email"
                        style={{
                            fontWeight: "600",
                            marginBottom: "20px",
                        }}
                    >
                        {email}
                    </p>

                    <form
                        onSubmit={handleVerify}
                        className="form"
                    >
                        <input
                            type="text"
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            maxLength={6}
                            onChange={(e) =>
                                setOtp(
                                    e.target.value.replace(/\D/g, "")
                                )
                            }
                        />

                        <button
                            className="btn"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? "Verifying..." : "Verify OTP"}
                        </button>
                    </form>

                    <div
                        style={{
                            marginTop: "20px",
                            textAlign: "center",
                        }}
                    >
                        {timer > 0 ? (
                            <p className="muted">
                                Resend OTP in {timer} seconds
                            </p>
                        ) : (
                            <button
                                className="btn secondary"
                                type="button"
                                onClick={handleResend}
                                disabled={resending}
                            >
                                {resending ? "Sending..." : "Resend OTP"}
                            </button>
                        )}
                    </div>

                    {notice && (
                        <div
                            className={`toast ${notice.type}`}
                            role="status"
                            aria-live="polite"
                        >
                            <span className="toast-icon">
                                {notice.type === "success" ? "✓" : "!"}
                            </span>

                            <span className="toast-message">
                                {notice.message}
                            </span>
                        </div>
                    )}

                    <p
                        className="muted"
                        style={{
                            marginTop: "25px",
                        }}
                    >
                        Already verified?{" "}
                        <Link to="/login">
                            Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}