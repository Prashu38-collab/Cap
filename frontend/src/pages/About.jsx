import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/about.css'
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import {
  FaPlane,
  FaStar,
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaMountain
} from 'react-icons/fa'

import { FaXTwitter } from 'react-icons/fa6'
import { MdTravelExplore } from 'react-icons/md'
import { BsPeopleFill } from 'react-icons/bs'

// const footerLinks = [
//   { label: 'Dashboard', to: '/dashboard' },
//   { label: 'Plan My Trip', to: '/plan-my-trip' },
//   { label: 'About Us', to: '/about-us' },
//   { label: 'Contact Us', to: '/contact-us' },
//   { label: 'My Profile', to: '/my-profile' },
// ]

export default function AboutUs() {
//   const navigate = useNavigate()

//   function logout() {
//     navigate('/login')
//   }

  return (
    <div className="about-page">

     < Navbar/>

      {/* HERO SECTION */}
      <section className="about-hero">
        <img
          src="images/yak.png"
          alt="Nepal Mountains"
          className="about-hero-image"
        />
        <div className="about-hero-overlay" />

        <div className="about-hero-content">
          <h1>About Us</h1>
          <p>Discover Nepal with Go Travel</p>
          <a href="#about-content" className="about-hero-button">
            About Us
          </a>
        </div>
      </section>

      <section className="about-content" id="about-content">

        <div className="about-heading">
          <h1>About Us</h1>
          <p>Discover Nepal with Go Travel</p>
        </div>

        <div className="about-grid">

          <div className="about-image-container">
            <img
              src="images/trekking.png"
              alt="Trekking"
              className="about-image"
            />
          </div>

          <div className="about-text">

            <h2>Who we are</h2>

            <p>
              Go Travel is a trusted travel and tour company dedicated
              to creating unforgettable travel experiences across Nepal.
              We specialize in personalized tours, trekking adventures,
              holiday packages, transportation services, and travel planning
              designed to make every journey seamless and memorable.
            </p>

            <p>
              Our team is passionate about helping travelers discover
              breathtaking destinations while ensuring comfort, safety,
              and exceptional service throughout their journey.
            </p>

          </div>

        </div>

        {/* CARDS */}
        <div className="about-card-container">

          <div className="about-card">

            <div className="about-card-icon">
              <FaPlane />
            </div>

            <h3>Our Mission</h3>

            <p>
              To provide exceptional travel experiences through reliable
              services, personalized planning, and customer-focused solutions.
            </p>

          </div>

          <div className="about-card">

            <div className="about-card-icon">
              <FaMountain />
            </div>

            <h3>Our Vision</h3>

            <p>
              To become Nepal’s most trusted travel partner,
              connecting people with unforgettable destinations worldwide.
            </p>

          </div>

          <div className="about-card">

            <div className="about-card-icon">
              <FaStar />
            </div>

            <h3>Our Values</h3>

            <p>
              Quality Service, Integrity, Customer Satisfaction,
              Safety, and Continuous Innovation.
            </p>

          </div>

        </div>


        <div className="about-stats">

          <div className="about-stat-box">
            <MdTravelExplore className="about-stat-icon" />
            <h3>50+</h3>
            <span>Destinations</span>
          </div>

          <div className="about-stat-box">
            <BsPeopleFill className="about-stat-icon" />
            <h3>5,000+</h3>
            <span>Happy Travelers</span>
          </div>

          <div className="about-stat-box">
            <FaPlane className="about-stat-icon" />
            <h3>100+</h3>
            <span>Tour Packages</span>
          </div>

          <div className="about-stat-box">
            <FaStar className="about-stat-icon" />
            <h3>4.9</h3>
            <span>Customer Rating</span>
          </div>

        </div>

      </section>

     < Footer/>

    </div>
  )
}