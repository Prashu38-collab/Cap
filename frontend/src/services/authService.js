import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:8000",
    headers: {
        "Content-Type": "application/json",
    },
});

// ================================
// Automatically attach JWT Token
// ================================
API.interceptors.request.use(
    (config) => {

        const token = localStorage.getItem("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ================================
// AUTH APIs
// ================================

// Register
export const registerUser = async (data) => {
    return API.post("/register", data);
};

// Login
export const loginUser = async (data) => {
    return API.post("/login", data);
};

// Verify Email OTP
export const verifyOTP = async (data) => {
    return API.post("/verify-otp", data);
};

// Resend Email OTP
export const resendOTP = async (data) => {
    return API.post("/resend-otp", data);
};

// Forgot Password
export const forgotPassword = async (data) => {
    return API.post("/forgot-password", data);
};

// Verify Reset OTP
export const verifyResetOTP = async (data) => {
    return API.post("/verify-reset-otp", data);
};

// Reset Password
export const resetPassword = async (data) => {
    return API.post("/reset-password", data);
};

// ================================
// PROFILE APIs
// ================================

export const getProfile = async () => {
    return API.get("/me");
};

export const changePassword = async (data) => {
    return API.put("/change-password", data);
};

export const updateProfile = async (data) => {
    return API.put("/me", data);
};

// ================================
// SAVED ITINERARIES
// ================================

export const getSavedItineraries = async () => {
    return API.get("/me/itineraries");
};

export const getItineraryDetails = async (preferenceId) => {
    return API.get(`/me/itineraries/${preferenceId}`);
};

export default API;