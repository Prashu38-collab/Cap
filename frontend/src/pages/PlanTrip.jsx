import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ItineraryResult from "../components/ItineraryResult";
import HotelSelection from "../components/HotelSelection";
import { createPreference, generateFromHotel } from "../utils/api";

import "../styles/plantrip.css";

const DISTRICTS = [
  "Kathmandu", "Lalitpur", "Bhaktapur", "Chitwan",
  "Dolakha", "Kavrepalanchowk", "Nuwakot",
  "Rasuwa", "Sindhuli", "Sindhupalchowk",
];

function PlanTrip() {
  const [form, setForm] = useState({
    starting_district: "",
    ending_district: "",
    travel_days: "",
    travel_date: "",
    total_budget: "",
    hotel_budget: "",
    mobility: "Easy",
    categories: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Wizard state: "form" | "hotels" | "result"
  const [step, setStep] = useState("form");
  const [prefId, setPrefId] = useState(null);
  const [corridor, setCorridor] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [result, setResult] = useState(null);
  const [weatherForecast, setWeatherForecast] = useState([]);

  const update = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      const cats = checked
        ? [...form.categories, value]
        : form.categories.filter((c) => c !== value);
      setForm((prev) => ({ ...prev, categories: cats }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.starting_district) { setError("Please select a starting district"); return; }
    if (!form.ending_district) { setError("Please select an ending district"); return; }
    if (!form.travel_days || parseInt(form.travel_days) < 1) { setError("Please enter valid travel days"); return; }
    if (!form.travel_date) { setError("Please select a travel date"); return; }
    if (!form.total_budget || parseInt(form.total_budget) < 1) { setError("Please enter a valid total budget"); return; }
    if (!form.hotel_budget || parseInt(form.hotel_budget) < 1) { setError("Please enter a valid hotel budget"); return; }
    if (form.categories.length === 0) { setError("Please select at least one interest category"); return; }

    setSubmitting(true);
    try {
      const payload = {
        starting_district: form.starting_district,
        ending_district: form.ending_district,
        travel_days: parseInt(form.travel_days),
        travel_date: form.travel_date,
        total_budget: parseInt(form.total_budget),
        hotel_budget: parseInt(form.hotel_budget),
        mobility: form.mobility,
        preferred_categories: form.categories.join(","),
        user_id: 1,
      };
      const data = await createPreference(payload);
      setPrefId(data.preference_id);
      setCorridor(data.corridor || []);
      setHotels(data.hotels || []);
      setStep("hotels");
    } catch (err) {
      setError(err.message || "Failed to create trip");
    } finally {
      setSubmitting(false);
    }
  };

  const handleHotelSelect = async (hotelId) => {
    setSubmitting(true);
    setError(null);
    try {
      const data = await generateFromHotel(prefId, hotelId);
      setResult(data);
      setWeatherForecast(data.weather_forecast || []);
      setStep("result");
    } catch (err) {
      setError(err.message || "Failed to generate itinerary");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep("form");
    setPrefId(null);
    setCorridor([]);
    setHotels([]);
    setResult(null);
    setWeatherForecast([]);
    setError(null);
    setForm({
      starting_district: "",
      ending_district: "",
      travel_days: "",
      travel_date: "",
      total_budget: "",
      hotel_budget: "",
      mobility: "Easy",
      categories: [],
    });
  };

  return (
    <>
      <Navbar />

      <div className={`planImage step-${step}`}>
        <div className="formContainer">
          {/* STEPPER */}
          <div className="wizard-stepper">
            <div className={`ws-step ${step === "form" ? "active" : step !== "form" ? "done" : ""}`}>
              <span className="ws-num">{step !== "form" ? "✓" : "1"}</span>
              <span className="ws-label">Preferences</span>
            </div>
            <div className={`ws-line ${step !== "form" ? "active" : ""}`} />
            <div className={`ws-step ${step === "hotels" ? "active" : step === "result" ? "done" : ""}`}>
              <span className="ws-num">{step === "result" ? "✓" : "2"}</span>
              <span className="ws-label">Hotel</span>
            </div>
            <div className={`ws-line ${step === "result" ? "active" : ""}`} />
            <div className={`ws-step ${step === "result" ? "active" : ""}`}>
              <span className="ws-num">3</span>
              <span className="ws-label">Itinerary</span>
            </div>
          </div>

          <div className="plan-title" id="plan">
            <h1>
              {step === "form" && "Plan My Trip"}
              {step === "hotels" && "Choose Your Hotel"}
              {step === "result" && "Your Journey"}
            </h1>
            <p>
              {step === "form" && "Enter your travel preferences to generate personalized itineraries."}
              {step === "hotels" && "Pick a starting hotel in your first district."}
              {step === "result" && "Here's your complete travel plan with meals."}
            </p>
          </div>

          {error && <div className="error-banner"> {error}</div>}

          {step === "form" && (
            <div className="form-card">
              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label>Starting District <span className="required">*</span></label>
                  <select name="starting_district" value={form.starting_district} onChange={update} required>
                    <option value="" disabled>Select starting district...</option>
                    {DISTRICTS.map((d) => (<option key={d} value={d}>{d}</option>))}
                  </select>
                </div>
                <div className="input-group">
                  <label>Ending District <span className="required">*</span></label>
                  <select name="ending_district" value={form.ending_district} onChange={update} required>
                    <option value="" disabled>Select ending district...</option>
                    {DISTRICTS.map((d) => (<option key={d} value={d}>{d}</option>))}
                  </select>
                </div>
                <div className="input-group">
                  <label>Interests <span className="required">*</span></label>
                  <div className="checkbox-group">
                    {["Adventure", "Nature", "Culture", "Religious"].map((cat) => (
                      <div className="checkbox" key={cat}>
                        <input type="checkbox" id={`cat-${cat}`} value={cat} checked={form.categories.includes(cat)} onChange={update} />
                        <label htmlFor={`cat-${cat}`}>{cat}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="input-group">
                  <label>Mobility <span className="required">*</span></label>
                  <div className="radio-group">
                    {["Easy", "Moderate", "Difficult"].map((m) => (
                      <div className="radio" key={m}>
                        <input type="radio" id={`mob-${m}`} name="mobility" value={m} checked={form.mobility === m} onChange={update} />
                        <label htmlFor={`mob-${m}`}>{m}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="input-row">
                  <div className="input-group">
                    <label>Total Budget (NPR) <span className="required">*</span></label>
                    <input type="number" name="total_budget" placeholder="e.g. 50000" value={form.total_budget} onChange={update} min="1000" />
                  </div>
                  <div className="input-group">
                    <label>Hotel Budget (NPR) <span className="required">*</span></label>
                    <input type="number" name="hotel_budget" placeholder="e.g. 5000" value={form.hotel_budget} onChange={update} min="500" />
                  </div>
                </div>
                <div className="input-row">
                  <div className="input-group">
                    <label>Travel Date <span className="required">*</span></label>
                    <input type="date" name="travel_date" value={form.travel_date} onChange={update} required />
                  </div>
                  <div className="input-group">
                    <label>Duration (days) <span className="required">*</span></label>
                    <input type="number" name="travel_days" placeholder="e.g. 3" value={form.travel_days} onChange={update} min="1" max="30" />
                  </div>
                </div>
                <div className="btn-container">
                  <button type="submit" className="generate-btn" disabled={submitting}>
                    {submitting ? "⏳ Finding hotels..." : " Find Hotels"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === "hotels" && (
            <div className="hotel-selection-wrap">
              <HotelSelection
                hotels={hotels}
                corridor={corridor}
                onSelect={handleHotelSelect}
                loading={submitting}
              />
            </div>
          )}

          {step === "result" && result && (
            <div className="result-wrapper">
              <ItineraryResult
                itinerary={result.data}
                weatherForecast={weatherForecast}
                preferenceId={result.preference_id}
                corridor={result.corridor}
              />
              <div className="btn-container">
                <button className="generate-btn" onClick={resetForm}>
                  🔄 Plan Another Trip
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}

export default PlanTrip;
