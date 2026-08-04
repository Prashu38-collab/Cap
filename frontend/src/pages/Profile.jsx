import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import "../styles/profile.css";
import {
  FaEnvelope,
  FaPhone,
  FaUser,
  FaEdit,
  FaLock,
  FaDownload,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaRoute,
  FaTimes,
  FaCheck,
  FaSave,
} from "react-icons/fa";

import {
  getProfile,
  changePassword,
  updateProfile,
  getSavedItineraries,
} from "../services/authService";
import { getCurrentUser, logoutUser } from "../utils/authStorage";

const sampleImage = "/images/kathmandu.png";

export default function MyProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone_number: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editNotice, setEditNotice] = useState(null);

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwNotice, setPwNotice] = useState(null);

  const [savedItineraries, setSavedItineraries] = useState([]);

  // -----------------------------
  // Fetch profile + itineraries
  // -----------------------------
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    async function fetchData() {
      try {
        const [profileRes, itinerariesRes] = await Promise.all([
          getProfile(),
          getSavedItineraries(),
        ]);
        setProfile(profileRes.data.user);
        setSavedItineraries(itinerariesRes.data.saved_itineraries || []);
      } catch (err) {
        if (err.response?.status === 401) {
          logoutUser();
          navigate("/login", { replace: true });
          return;
        }
        setError(err.response?.data?.detail || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [navigate]);

  // -----------------------------
  // Edit Profile
  // -----------------------------
  function openEdit() {
    setEditForm({
      name: profile?.name || "",
      phone_number: profile?.phone_number || "",
    });
    setEditNotice(null);
    setShowEdit(true);
    setShowPasswordChange(false);
  }

  function closeEdit() {
    setShowEdit(false);
    setEditNotice(null);
  }

  async function handleEditSave() {
    if (!editForm.name.trim()) {
      setEditNotice({ type: "error", message: "Name is required." });
      return;
    }
    if (!editForm.phone_number.trim()) {
      setEditNotice({ type: "error", message: "Phone number is required." });
      return;
    }

    setEditLoading(true);
    try {
      const res = await updateProfile({
        name: editForm.name.trim(),
        phone_number: editForm.phone_number.trim(),
      });
      setProfile(res.data.user);
      setEditNotice({ type: "success", message: "Profile updated!" });
      setTimeout(() => closeEdit(), 1200);
    } catch (err) {
      setEditNotice({
        type: "error",
        message: err.response?.data?.detail || "Failed to update profile.",
      });
    } finally {
      setEditLoading(false);
    }
  }

  // -----------------------------
  // Change Password
  // -----------------------------
  function openPassword() {
    setPasswordForm({ current_password: "", newPassword: "", confirmPassword: "" });
    setPwNotice(null);
    setShowPasswordChange(true);
    setShowEdit(false);
  }

  function closePassword() {
    setShowPasswordChange(false);
    setPwNotice(null);
  }

  async function handlePasswordSave() {
    if (!passwordForm.current_password) {
      setPwNotice({ type: "error", message: "Current password is required." });
      return;
    }
    if (!passwordForm.newPassword) {
      setPwNotice({ type: "error", message: "New password is required." });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPwNotice({ type: "error", message: "Passwords do not match." });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPwNotice({ type: "error", message: "Password must be at least 8 characters." });
      return;
    }
    if (!/[A-Z]/.test(passwordForm.newPassword)) {
      setPwNotice({ type: "error", message: "Must contain an uppercase letter." });
      return;
    }
    if (!/[a-z]/.test(passwordForm.newPassword)) {
      setPwNotice({ type: "error", message: "Must contain a lowercase letter." });
      return;
    }
    if (!/[0-9]/.test(passwordForm.newPassword)) {
      setPwNotice({ type: "error", message: "Must contain a number." });
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(passwordForm.newPassword)) {
      setPwNotice({ type: "error", message: "Must contain a special character." });
      return;
    }

    setPwLoading(true);
    try {
      await changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.newPassword,
        confirm_password: passwordForm.confirmPassword,
      });

      setPwNotice({ type: "success", message: "Password changed successfully!" });
      setPasswordForm({ current_password: "", newPassword: "", confirmPassword: "" });

      setTimeout(() => {
        closePassword();
      }, 1500);
    } catch (err) {
      setPwNotice({
        type: "error",
        message: err.response?.data?.detail || "Failed to change password.",
      });
    } finally {
      setPwLoading(false);
    }
  }

  // -----------------------------
  // Logout
  // -----------------------------
  function handleLogout() {
    logoutUser();
    navigate("/login", { replace: true });
  }

  // -----------------------------
  // Download Itinerary as PDF
  // -----------------------------
  function downloadPDF(itin) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    const addCentered = (text, size, style = "normal") => {
      doc.setFont("helvetica", style);
      doc.setFontSize(size);
      doc.text(text, pageWidth / 2, y, { align: "center" });
      y += size === 20 ? 10 : 7;
    };

    const addLine = (label, value) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(label, 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(value || "—"), 80, y);
      y += 7;
    };

    addCentered("Travel Itinerary", 20, "bold");
    y += 2;

    doc.setDrawColor(226, 153, 36);
    doc.setLineWidth(0.5);
    doc.line(20, y, pageWidth - 20, y);
    y += 8;

    addLine("Route:", `${itin.starting_district || "—"} → ${itin.ending_district || "—"}`);
    addLine("Travel Date:", itin.travel_date);
    addLine("Duration:", itin.travel_days ? `${itin.travel_days} days` : "—");
    addLine("Total Budget:", itin.total_budget ? `NPR ${Number(itin.total_budget).toLocaleString()}` : "—");
    addLine("Hotel Budget:", itin.hotel_budget ? `NPR ${Number(itin.hotel_budget).toLocaleString()}` : "—");
    addLine("Category:", itin.category);
    y += 5;

    const itineraryData = itin.itinerary_data;
    const days = itineraryData?.itinerary || [];

    if (days.length > 0) {
      doc.setDrawColor(226, 153, 36);
      doc.line(20, y, pageWidth - 20, y);
      y += 8;

      addCentered("Day-by-Day Plan", 14, "bold");
      y += 2;

      days.forEach((day) => {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(226, 153, 36);
        doc.text(`Day ${day.day} — ${day.district || ""}`, 20, y);
        doc.setTextColor(0, 0, 0);
        y += 7;

        if (day.hotel?.hotel_name) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(10);
          doc.text(`Hotel: ${day.hotel.hotel_name}`, 24, y);
          y += 6;
        }

        (day.places || []).forEach((place) => {
          if (y > 265) {
            doc.addPage();
            y = 20;
          }
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.text(`• ${place.name} (${place.category || ""})`, 26, y);
          y += 5;
        });

        y += 3;
      });
    }

    y += 5;
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Generated by Go Travel — Your Journey, Planned.", pageWidth / 2, y, { align: "center" });

    doc.save(`itinerary-${itin.preference_id || "trip"}.pdf`);
  }

  // -----------------------------
  // Loading / Error
  // -----------------------------
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="profile-page">
          <main className="profile-main">
            <div className="profile-loading">Loading profile...</div>
          </main>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="profile-page">
          <main className="profile-main">
            <div className="profile-error">{error}</div>
          </main>
        </div>
        <Footer />
      </>
    );
  }

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="profile-page">
      <Navbar />

      <section className="profile-hero">
        <img
          src="/images/contactus.png"
          alt="Boudhanath Stupa Nepal"
          className="profile-hero-image"
        />
        <div className="profile-hero-overlay" />
        <div className="profile-hero-copy">
          <h1 className="profile-hero-title">Every Journey Tells a Story</h1>
          <p className="profile-hero-quote">
            "Travel isn't always about the destination, it's about the memories
            you create along the way."
          </p>
          <a href="#profile-card" className="profile-hero-button">
            My Profile
          </a>
        </div>
      </section>

      <main className="profile-main">
        {/* Profile Card */}
        <section id="profile-card" className="profile-card">
          <div className="profile-card-info">
            <h2>Personal Information</h2>
            {!showEdit ? (
              <>
                <div className="profile-detail-grid">
                  <div className="profile-detail-row">
                    <FaUser className="profile-detail-icon" />
                    <span className="profile-detail-label">Full Name</span>
                    <span className="profile-detail-value">
                      {profile?.name || "—"}
                    </span>
                  </div>
                  <div className="profile-detail-row">
                    <FaEnvelope className="profile-detail-icon" />
                    <span className="profile-detail-label">Email Address</span>
                    <span className="profile-detail-value">
                      {profile?.email || "—"}
                    </span>
                  </div>
                  <div className="profile-detail-row">
                    <FaPhone className="profile-detail-icon" />
                    <span className="profile-detail-label">Phone Number</span>
                    <span className="profile-detail-value">
                      {profile?.phone_number || "—"}
                    </span>
                  </div>
                </div>

                <div className="profile-button-row">
                  <button
                    className="profile-btn profile-btn-edit"
                    type="button"
                    onClick={openEdit}
                  >
                    <FaEdit /> Edit Profile
                  </button>
                  <button
                    className="profile-btn profile-btn-password"
                    type="button"
                    onClick={openPassword}
                  >
                    <FaLock /> Change Password
                  </button>
                  <button
                    className="profile-btn profile-btn-delete"
                    type="button"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="profile-detail-grid">
                  <div className="profile-detail-row">
                    <FaUser className="profile-detail-icon" />
                    <span className="profile-detail-label">Full Name</span>
                    <input
                      className="profile-edit-input"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="profile-detail-row">
                    <FaEnvelope className="profile-detail-icon" />
                    <span className="profile-detail-label">Email Address</span>
                    <span className="profile-detail-value profile-email-readonly">
                      {profile?.email || "—"}
                    </span>
                  </div>
                  <div className="profile-detail-row">
                    <FaPhone className="profile-detail-icon" />
                    <span className="profile-detail-label">Phone Number</span>
                    <input
                      className="profile-edit-input"
                      value={editForm.phone_number}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          phone_number: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                {editNotice && (
                  <div className={`profile-pw-notice ${editNotice.type}`}>
                    {editNotice.type === "success" ? <FaCheck /> : <FaEdit />}
                    {editNotice.message}
                  </div>
                )}

                <div className="profile-button-row">
                  <button
                    className="profile-btn profile-btn-edit"
                    type="button"
                    onClick={handleEditSave}
                    disabled={editLoading}
                  >
                    <FaSave /> {editLoading ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="profile-btn profile-btn-cancel"
                    type="button"
                    onClick={closeEdit}
                  >
                    <FaTimes /> Cancel
                  </button>
                </div>
              </>
            )}

            {/* Inline Change Password Panel */}
            {showPasswordChange && (
              <div className="profile-password-panel">
                <div className="profile-password-header">
                  <h3>Change Password</h3>
                  <button
                    className="profile-password-close"
                    onClick={closePassword}
                  >
                    <FaTimes />
                  </button>
                </div>

                <div className="profile-password-field">
                  <label>Current Password</label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    value={passwordForm.current_password}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        current_password: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="profile-password-field">
                  <label>New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="profile-password-field">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                  />
                </div>

                {pwNotice && (
                  <div className={`profile-pw-notice ${pwNotice.type}`}>
                    {pwNotice.type === "success" ? <FaCheck /> : <FaLock />}
                    {pwNotice.message}
                  </div>
                )}

                <div className="profile-password-actions">
                  <button
                    className="profile-btn profile-btn-edit"
                    type="button"
                    onClick={handlePasswordSave}
                    disabled={pwLoading}
                  >
                    {pwLoading ? "Saving..." : "Save Password"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Saved Itineraries */}
        <section className="profile-section">
          <h2>My Itineraries</h2>
          {savedItineraries.length === 0 ? (
            <div className="profile-empty-state">
              No itineraries yet.{" "}
              <a href="/plantrip">Plan your first trip</a> and save it here.
            </div>
          ) : (
            <div className="profile-dest-grid">
              {savedItineraries.map((item) => {
                const daysData = item.itinerary_data?.itinerary || [];
                const totalPlaces = daysData.reduce(
                  (sum, d) => sum + (d.places?.length || 0),
                  0
                );

                return (
                  <article
                    className="profile-dest-card"
                    key={item.preference_id}
                  >
                    <div className="profile-dest-img-wrapper">
                      <img src={sampleImage} alt={item.starting_district} />
                      <span className="profile-card-badge">
                        {item.travel_days} Days
                      </span>
                    </div>
                    <div className="profile-dest-content">
                      <h3>
                        {item.starting_district} → {item.ending_district}
                      </h3>

                      <div className="profile-card-meta">
                        <span>
                          <FaCalendarAlt /> {item.travel_date || "Flexible"}
                        </span>
                        <span>
                          <FaMoneyBillWave /> NPR{" "}
                          {item.total_budget
                            ? Number(item.total_budget).toLocaleString()
                            : "—"}
                        </span>
                      </div>

                      <div className="profile-card-meta">
                        <span>
                          <FaRoute /> {item.travel_days} days
                        </span>
                        <span>
                          <FaMapMarkerAlt /> {totalPlaces} places
                        </span>
                      </div>

                      <div className="profile-card-actions">
                        <button
                          className="profile-btn profile-btn-download"
                          type="button"
                          onClick={() => downloadPDF(item)}
                        >
                          <FaDownload /> Download PDF
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
