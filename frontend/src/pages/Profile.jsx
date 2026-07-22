import React, { useState, useRef } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/profile.css'
import {
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaRegCalendarAlt,
  FaUser,
  FaCamera,
  FaEdit,
  FaLock,
  FaGlobe,
  FaPlane,
  FaSuitcase,
  FaStar,
  FaHeart
} from 'react-icons/fa'

export default function MyProfile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState({
    fullName: 'Keonho Lee',
    email: 'keonholee@gmail.com',
    phone: '982848189',
    address: 'Busan, South Korea',
    joined: 'Jan 2026'
  })
  const [avatarSrc, setAvatarSrc] = useState('/yak.png')
  const [isEditing, setIsEditing] = useState(false)
  const fileInputRef = useRef(null)

  function handleEditProfile() {
    setIsEditing(prev => !prev)
  }

  function handleInputChange(field, value) {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="profile-page">

     < Navbar />

      <section className="profile-hero">
  <img
    src="/images/contactus.png"
    alt="Boudhanath Stupa Nepal"
    className="profile-hero-image"
  />

  <div className="profile-hero-overlay" />

  <div className="profile-hero-copy">
    <h1 className="hero-title">
      Every Journey Tells a Story
    </h1>

<p className="hero-quote">
  "Travel isn't always about the destination, it's about the memories
  you create along the way."
</p>


  </div>
</section>
      <main className="profile-main">
        
        {/* PERSONAL INFORMATION CARD */}

        <h2>Personal Information</h2>
        
        <section id="profile-card" className="profile-card">

          <div className="profile-card-info">
            
            <div className="profile-detail-grid">
              <div className="profile-detail-row">
                <FaUser className="detail-icon" />
                <span className="detail-label">Full Name</span>
                {isEditing ? (
                  <input
                    className="profile-detail-input"
                    value={profile.fullName}
                    onChange={e => handleInputChange('fullName', e.target.value)}
                  />
                ) : (
                  <span className="profile-detail-value">{profile.fullName}</span>
                )}
              </div>
              <div className="profile-detail-row">
                <FaEnvelope className="detail-icon" />
                <span className="detail-label">Email</span>
                {isEditing ? (
                  <input
                    className="profile-detail-input"
                    value={profile.email}
                    onChange={e => handleInputChange('email', e.target.value)}
                  />
                ) : (
                  <span className="profile-detail-value">{profile.email}</span>
                )}
              </div>
              <div className="profile-detail-row">
                <FaPhone className="detail-icon" />
                <span className="detail-label">Phone</span>
                {isEditing ? (
                  <input
                    className="profile-detail-input"
                    value={profile.phone}
                    onChange={e => handleInputChange('phone', e.target.value)}
                  />
                ) : (
                  <span className="profile-detail-value">{profile.phone}</span>
                )}
              </div>
              <div className="profile-detail-row">
                <FaMapMarkerAlt className="detail-icon" />
                <span className="detail-label">Address</span>
                {isEditing ? (
                  <input
                    className="profile-detail-input"
                    value={profile.address}
                    onChange={e => handleInputChange('address', e.target.value)}
                  />
                ) : (
                  <span className="profile-detail-value">{profile.address}</span>
                )}
              </div>
              <div className="profile-detail-row">
                <FaRegCalendarAlt className="detail-icon" />
                <span className="detail-label">Date Joined</span>
                <span className="profile-detail-value">{profile.joined}</span>
              </div>
            </div>

            <div className="profile-button-row">
              <button
                className="profile-action-btn edit-btn"
                type="button"
                onClick={handleEditProfile}
              >
                <FaEdit />
                {isEditing ? ' Save Profile' : ' Edit Profile'}
              </button>
              {isEditing && (
                <button
                  className="profile-action-btn cancel-btn"
                  type="button"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              )}
              <button className="profile-action-btn password-btn" type="button">
                <FaLock /> Change Password
              </button>
            </div>
          </div>
        </section>

        {/* Saved Itineraries */}
        <section className="profile-section">
          <h2>Saved Itineraries</h2>
          <div className="dest-grid">
            <article className="destination-card">
              <div className="dest-img-wrapper">
                <img src="images/pokhara.png" alt="Pokhara" />
                <button className="heart-btn" type="button" aria-label="Favorite"><FaHeart /></button>
              </div>
              <div className="destination-content">
                <h3>Pokhara</h3>
                <p>Nepal</p>
              </div>
            </article>
            <article className="destination-card">
              <div className="dest-img-wrapper">
                <img src="images/kathmandu.png" alt="Kathmandu" />
                <button className="heart-btn liked" type="button" aria-label="Favorite"><FaHeart /></button>
              </div>
              <div className="destination-content">
                <h3>Kathmandu</h3>
                <p>Nepal</p>
              </div>
            </article>
            <article className="destination-card">
              <div className="dest-img-wrapper">
                <img src="images/mustang.png" alt="Mustang" />
                <button className="heart-btn" type="button" aria-label="Favorite"><FaHeart /></button>
              </div>
              <div className="destination-content">
                <h3>Mustang</h3>
                <p>Nepal</p>
              </div>
            </article>
          </div>
        </section>
      </main>

    < Footer />

    </div>
  )
}