import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SplitLayout from "../components/SplitLayout";

import "../styles/generateitinerary.css";

function MapPlaceholder() {
  return (
    <div className="gen-map-placeholder">
      <div className="gen-map-placeholder-content">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <span>Route Map</span>
      </div>
    </div>
  );
}

function GenerateItinerary() {

  const leftPanel = (
    <div className="gen-content-container">

        <div className="gen-trip-header sl-card">
            <h1>Kathmandu Sightseeing</h1>
            <p>2 Days • Family • Budget</p>
        </div>

        <div className="gen-trip-overview">

            <div className="gen-overview-card sl-card">
            <h3>Destinations</h3>
            <p>4</p>
            </div>

            <div className="gen-overview-card sl-card">
            <h3>Hotels</h3>
            <p>2</p>
            </div>

            <div className="gen-overview-card sl-card">
            <h3>Budget</h3>
            <p>NPR 15,000</p>
            </div>

            <div className="gen-overview-card sl-card">
            <h3>Weather</h3>
            <p>24°C</p>
            </div>

        </div>

        <div className="gen-day-card sl-card">

            {/* Day 1 */}
            <div className="gen-day-header">
            <h2>Day 1</h2>
            </div>

            <div className="gen-activity">
            <span>8:00 AM</span>
            <p>Leave Kathmandu</p>
            </div>

            <div className="gen-activity">
            <span>10:00 AM</span>
            <p>Visit Bhaktapur Durbar Square</p>
            </div>

            <div className="gen-activity">
            <span>1:00 PM</span>
            <p>Lunch</p>
            </div>

            <div className="gen-activity">
            <span>3:00 PM</span>
            <p>Visit Changunarayan Temple</p>
            </div>

            <div className="gen-activity">
            <span>6:00 PM</span>
            <p>Hotel Check-in</p>
            </div>

            {/* Day 2 */}
            <div className="gen-day-header">
            <h2>Day 2</h2>
            </div>

            <div className="gen-activity">
            <span>8:00 AM</span>
            <p>Hotel Checkout</p>
            </div>

            <div className="gen-activity">
            <span>9:00 AM</span>
            <p>Breakfast</p>
            </div>

            <div className="gen-activity">
            <span>10:00 AM</span>
            <p>Shiva Temple Sanga</p>
            </div>

            <div className="gen-activity">
            <span>1:00 PM</span>
            <p>Lunch</p>
            </div>

            <div className="gen-activity">
            <span>2:00 PM</span>
            <p>Kathmandu Fun Valley</p>
            </div>

            <div className="gen-activity">
            <span>6:00 PM</span>
            <p>Return to Kathmandu</p>
            </div>

        </div>

        <div className="gen-extra-info">

            <div className="gen-weather-box sl-card">
                Weather for the next 2 days <br/>
                Sunny 24°C (Weather-aware Scheduling)
            </div>

            <div className="gen-transport-box sl-card">
                Do you want transportation option?<br/>
                Yes or No<br/>
                Transportation here: Private / Public Vehicle
            </div>

        </div>

        <section className="gen-hotel-section">
            <h2>Recommended Hotels</h2>

            <div className="gen-hotel-grid">
            <div className="gen-hotel-card sl-card">
                Hotel Name 1
            </div>

            <div className="gen-hotel-card sl-card">
                Hotel Name 2
            </div>
            </div>
        </section>

    </div>
  );

  return (

    <>
      <Navbar />

      <SplitLayout
        leftContent={leftPanel}
        rightContent={<MapPlaceholder />}
      />

      <Footer />
    </>

  );
}

export default GenerateItinerary;
