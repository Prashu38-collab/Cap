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

// const navItems = [
//   { label: 'Dashboard', to: '/dashboard' },
//   { label: 'Plan My Trip', to: '/plan-my-trip' },
//   { label: 'About Us', to: '/about-us' },
//   { label: 'Contact Us', to: '/contact-us' },
//   { label: 'My Profile', to: '/my-profile' }
// ]

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

  function logout() {
    navigate('/login')
  }

  function handleChangePhoto() {
    fileInputRef.current?.click()
  }

  function handlePhotoSelected(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setAvatarSrc(URL.createObjectURL(file))
  }

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
        <img src="\images\contactus.png" alt="Boudhanath Stupa Nepal" className="profile-hero-image" />
        <div className="profile-hero-overlay" />
        <div className="profile-hero-copy">
          <a href="#profile-card" className="profile-hero-button">My Profile</a>
        </div>
      </section>

      {/* MAIN CONTENT CONTAINER */}
      <p className='text'>Welcome Back, Traveler</p>

      <main className="profile-main">
        
        {/* PERSONAL INFORMATION CARD */}
        <section id="profile-card" className="profile-card">
          <div className="profile-avatar-container">
            <div className="profile-avatar">
              <img src={avatarSrc} alt="Profile avatar" />
            </div>
            <button
              className="profile-action-btn photo-btn"
              type="button"
              onClick={handleChangePhoto}
            >
              <FaCamera /> Change Photo
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden-file-input"
              accept="image/*"
              onChange={handlePhotoSelected}
            />
          </div>

          <div className="profile-card-info">
            <h2>Personal Information</h2>
            
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

        {/* TRAVEL STATS COUNTER */}
        <section className="profile-stats">
          <div className="stat-card">
            <FaGlobe className="stat-icon" />
            <p className="stat-number">8</p>
            <p className="stat-label">Countries Visited</p>
          </div>
          <div className="stat-card">
            <FaPlane className="stat-icon" />
            <p className="stat-number">12</p>
            <p className="stat-label">Trips Completed</p>
          </div>
          <div className="stat-card">
            <FaSuitcase className="stat-icon" />
            <p className="stat-number">15</p>
            <p className="stat-label">Bookings Made</p>
          </div>
          <div className="stat-card">
            <FaStar className="stat-icon" />
            <p className="stat-number">5</p>
            <p className="stat-label">Reviews Given</p>
          </div>
        </section>

        {/* UPCOMING TRIPS SECTION */}
        <section className="profile-section">
          <h2>My Upcoming Trips</h2>
          <div className="upcoming-grid">
            <article className="trip-card">
              <div className="trip-img-wrapper">
                <img src="images/chitwan.png" alt="Chitwan Package" />
              </div>
              <div className="trip-card-content">
                <h3>Chitwan Package</h3>
                <p className="trip-date">📅 15 June 2026</p>
                <p className="trip-route">✈️ South Korea → Chitwan</p>
                <div className="trip-card-footer">
                  <span className="badge badge-confirmed">Confirmed</span>
                  <button type="button" className="view-details-btn">View Details</button>
                </div>
              </div>
            </article>

            <article className="trip-card">
              <div className="trip-img-wrapper">
                <img src="images/bhaktapur.png" alt="Bhaktapur Package" />
              </div>
              <div className="trip-card-content">
                <h3>Bhaktapur Package</h3>
                <p className="trip-date">📅 25 September 2026</p>
                <p className="trip-route">✈️ South Korea → Bhaktapur</p>
                <div className="trip-card-footer">
                  <span className="badge badge-confirmed">Confirmed</span>
                  <button type="button" className="view-details-btn">View Details</button>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* TRAVEL HISTORY TABLE */}
        <section className="profile-section">
          <h2>Recent Travel History</h2>
          <div className="table-responsive">
            <table className="profile-table">
              <thead>
                <tr>
                  <th>Destination</th>
                  <th>Date</th>
                  <th>Package</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><img src="images/pokhara.png" alt="" className="table-thumb" /> Pokhara</td>
                  <td>Mar 2026</td>
                  <td>Family Tour</td>
                  <td><span className="badge badge-completed">Completed</span></td>
                </tr>
                <tr>
                  <td><img src="images/kathmandu.png" alt="" className="table-thumb" /> Kathmandu</td>
                  <td>Feb 2026</td>
                  <td>Wildlife Tour</td>
                  <td><span className="badge badge-completed">Completed</span></td>
                </tr>
                <tr>
                  <td><img src="images/mustang.png" alt="" className="table-thumb" /> Mustang</td>
                  <td>Dec 2025</td>
                  <td>Holiday Package</td>
                  <td><span className="badge badge-completed">Completed</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="profile-section">
          <h2>Favourite Destinations</h2>
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