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


      <section className="about-content" id="about-content">

        <div className="about-heading">
          <h1>About Us</h1>
          <p>Discover Nepal with Go Travel</p>
        </div>

        <div className="about-grid">

          <div className="about-image-container">
            <img
              src="images/grpfoto.png"
              alt="Group Photo"
              className="about-image"
            />
          </div>

          <div className="about-text">

            <h2>Who we are</h2>

            <p>
              We are a team of third-year undergraduate students from IIMS College who developed A Web-Based Travel Itinerary Recommendation System Using Content-Based Filtering and Route Optimization as part of our academic project. Our aim is to create a smart and user-friendly platform that makes travel planning simpler and more efficient.
            </p>
            
            <p>
              
              Our system helps users generate personalized travel itineraries based on their interests while optimizing travel routes for a better experience. Through this project, we have combined our knowledge of web development and recommendation systems to provide a practical solution for modern travelers.
            </p>

          </div>

          

        </div>

      </section>
      <section className="team-section">
  <h2>Meet Our Team</h2>

  <div className="team-container">
    <div className="team-card">
      <img src="images/Prashamsa.png" alt="A" className="team-image" />
      <h3>Prashamsa Ghimire</h3>
      <p>Scrum Leader</p>
      <p>Role: Backend, Database</p>
    </div>

<div className="team-card">
  <img src="images/Priety.png" alt="D" className="team-image" />
  <h3>Priety Maharjan</h3>
  <p>Role: Frontend, Testing</p>
</div>


<div className="team-card">
  <img src="images/Kritika.jpg" alt="E" className="team-image" />
  <h3>Kritika Maharjan </h3>
  <p>Role: Frontend, Security</p>
</div>

<div className="team-card">
  <img src="images/Riddhi.png" alt="C" className="team-image" />
  <h3>Riddhishree Khanal</h3>
  <p>Role: Backend, Database</p>
</div>



<div className="team-card">
  <img src="images/Reshika.png" alt="B" className="team-image" />
  <h3>Reshika Dhakal</h3>
  <p>Role: Backend, Database</p>
</div>


  </div>
</section>


     < Footer/>

    </div>
  )
}