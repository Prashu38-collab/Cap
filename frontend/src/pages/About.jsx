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

export default function AboutUs() {
//   const navigate = useNavigate()

//   function logout() {
//     navigate('/login')
//   }

  return (
    <div className="about-page">

     < Navbar/>

      {/* HERO SECTION */}
      {/* <section className="about-hero">
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
      </section> */}

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

      </section>

     < Footer/>

    </div>
  )
}