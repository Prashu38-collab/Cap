import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import WeatherSection from "../components/WeatherSection";
import MapSection from "../components/MapSection";
import TravelCategories from "../components/TravelCategories";
import RecommendedItineraries from "../components/RecommendedItineraries";
import Footer from "../components/Footer";

import "../styles/dashboard.css";

function Dashboard() {
  return (
    <>
      <Navbar />
      <Hero />
      <WeatherSection />
      <MapSection />
      <TravelCategories />
      <RecommendedItineraries />
      <Footer />
    </>
  );
}

export default Dashboard;