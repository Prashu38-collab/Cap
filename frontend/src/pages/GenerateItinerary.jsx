import { useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { saveSavedItinerary } from "../utils/api";

import "../styles/generateitinerary.css";

function GenerateItinerary() {
    useEffect(() => {
        const saveSampleItinerary = async () => {
            const sampleItinerary = {
                title: "Kathmandu Sightseeing",
                destination: "Kathmandu, Nepal",
                summary: "2 days of family-friendly sightseeing with weather-aware planning.",
                itinerary: [
                    { day: 1, district: "Kathmandu", places: [{ name: "Bhaktapur Durbar Square", type: "place" }] },
                    { day: 2, district: "Kathmandu", places: [{ name: "Changunarayan Temple", type: "place" }] }
                ],
                notes: "Saved from the planner"
            };

            try {
                const saved = await saveSavedItinerary({
                    preference_id: 1,
                    itinerary_data: sampleItinerary,
                    total_estimated_cost: 15000,
                    status: "generated"
                });

                window.dispatchEvent(new CustomEvent("saved-itinerary", {
                    detail: { itinerary: sampleItinerary, itineraryId: saved.itinerary_id }
                }));
            } catch (error) {
                console.error("Unable to save itinerary", error);
            }
        };

        saveSampleItinerary();
    }, []);

    return (
        <>
            <Navbar />

            <div className="generated-page">
                <div className="trip-header">
                    <h1>Kathmandu Sightseeing</h1>
                    <p>2 Days • Family • Budget</p>
                </div>

                <div className="trip-overview">
                    <div className="overview-card">
                        <h3>Destinations</h3>
                        <p>4</p>
                    </div>

                    <div className="overview-card">
                        <h3>Hotels</h3>
                        <p>2</p>
                    </div>

                    <div className="overview-card">
                        <h3>Budget</h3>
                        <p>NPR 15,000</p>
                    </div>

                    <div className="overview-card">
                        <h3>Weather</h3>
                        <p>24°C</p>
                    </div>
                </div>

                <div className="day-card">
                    <div className="day-header">
                        <h2>Day 1</h2>
                    </div>

                    <div className="activity">
                        <span>8:00 AM</span>
                        <p>Leave Kathmandu</p>
                    </div>

                    <div className="activity">
                        <span>10:00 AM</span>
                        <p>Visit Bhaktapur Durbar Square</p>
                    </div>

                    <div className="activity">
                        <span>1:00 PM</span>
                        <p>Lunch</p>
                    </div>

                    <div className="activity">
                        <span>3:00 PM</span>
                        <p>Visit Changunarayan Temple</p>
                    </div>

                    <div className="activity">
                        <span>6:00 PM</span>
                        <p>Hotel Check-in</p>
                    </div>

                    <div className="day-header">
                        <h2>Day 2</h2>
                    </div>

                    <div className="activity">
                        <span>8:00 AM</span>
                        <p>Hotel Checkout</p>
                    </div>

                    <div className="activity">
                        <span>9:00 AM</span>
                        <p>Breakfast</p>
                    </div>

                    <div className="activity">
                        <span>10:00 AM</span>
                        <p>Shiva Temple Sanga</p>
                    </div>

                    <div className="activity">
                        <span>1:00 PM</span>
                        <p>Lunch</p>
                    </div>

                    <div className="activity">
                        <span>2:00 PM</span>
                        <p>Kathmandu Fun Valley</p>
                    </div>

                    <div className="activity">
                        <span>6:00 PM</span>
                        <p>Return to Kathmandu</p>
                    </div>
                </div>

                <div className="extra-info">
                    <div className="weather-box">
                        Weather for the next 2 days <br />
                        ☀ Sunny 24°C (Weather-aware Scheduling)
                    </div>

                    <div className="transport-box">
                        Do you want transportation option?<br />
                        Yes or No<br />
                        Transportation here: Private / Public Vehicle
                    </div>
                </div>

                <section className="hotel-section">
                    <h2>Recommended Hotels</h2>

                    <div className="hotel-grid">
                        <div className="hotel-card">Hotel Name 1</div>
                        <div className="hotel-card">Hotel Name 2</div>
                    </div>
                </section>

                <section className="map-section">
                    <h2>Route Map</h2>
                    <div className="map-placeholder">Map API Here</div>
                </section>
            </div>

            <Footer />
        </>
    );
}

export default GenerateItinerary;