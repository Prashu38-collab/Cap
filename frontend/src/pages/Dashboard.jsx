import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import WeatherSection from "../components/WeatherSection";
import MapSection from "../components/MapSection";
import ItinerarySection from "../components/ItinerarySection";
import Feedback from "../components/Feedback";
import Footer from "../components/Footer";

import "../styles/dashboard.css";

function Dashboard() {
  return (
    <>
      <Navbar />
      <Hero />
      <WeatherSection />
      <MapSection />
      <ItinerarySection />
      <Feedback />
      <Footer />
    </>
  );
}

export default Dashboard;