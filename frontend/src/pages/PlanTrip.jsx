import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ItineraryResult from "../components/ItineraryResult";
import HotelSelection from "../components/HotelSelection";
import { createPreference, generateFromHotel, generateTrek, selectTrekHotel } from "../utils/api";

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

  const [step, setStep] = useState("form");
  const [prefId, setPrefId] = useState(null);
  const [corridor, setCorridor] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [treks, setTreks] = useState([]);
  const [result, setResult] = useState(null);
  const [weatherForecast, setWeatherForecast] = useState([]);

  // Trek specific state
  const [selectedTrek, setSelectedTrek] = useState(null);
  const [trekItinerary, setTrekItinerary] = useState(null);
  const [trekHotelSelections, setTrekHotelSelections] = useState({});

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
      if (data.flow === "trek_selection" && data.treks?.length) {
        setTreks(data.treks);
        setStep("treks");
      } else {
        setHotels(data.hotels || []);
        setStep("hotels");
      }
    } catch (err) {
      setError(err.message || "Failed to create trip");
    } finally {
      setSubmitting(false);
    }
  };

  // Called when user clicks a trek card
  const handleTrekSelect = async (trek) => {
    setSubmitting(true);
    setError(null);
    try {
      setSelectedTrek(trek);
      const data = await generateTrek(trek.place_id, parseInt(form.travel_days));
      setTrekItinerary(data);
      setStep("trek_result");
    } catch (err) {
      setError(err.message || "Failed to generate trek itinerary");
    } finally {
      setSubmitting(false);
    }
  };

  // Called when user selects a hotel for a specific trek day
  const handleTrekHotelSelect = async (dayNumber, hotelId) => {
    try {
      await selectTrekHotel(prefId, dayNumber, hotelId);
      setTrekHotelSelections((prev) => ({ ...prev, [dayNumber]: hotelId }));
    } catch (err) {
      setError(err.message || "Failed to save hotel selection");
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
    setTreks([]);
    setResult(null);
    setWeatherForecast([]);
    setError(null);
    setSelectedTrek(null);
    setTrekItinerary(null);
    setTrekHotelSelections({});
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
            <div className={`ws-step ${step === "treks" || step === "hotels" ? "active" : step === "result" || step === "trek_result" ? "done" : ""}`}>
              <span className="ws-num">{step === "result" || step === "trek_result" ? "✓" : "2"}</span>
              <span className="ws-label">{treks.length ? "Trek" : "Hotel"}</span>
            </div>
            <div className={`ws-line ${step === "result" || step === "trek_result" ? "active" : ""}`} />
            <div className={`ws-step ${step === "result" || step === "trek_result" ? "active" : ""}`}>
              <span className="ws-num">3</span>
              <span className="ws-label">Itinerary</span>
            </div>
          </div>

          <div className="plan-title" id="plan">
            <h1>
              {step === "form" && "Plan My Trip"}
              {step === "treks" && "Choose Your Adventure"}
              {step === "hotels" && "Choose Your Hotel"}
              {step === "trek_result" && "Your Trek Itinerary"}
              {step === "result" && "Your Journey"}
            </h1>
            <p>
              {step === "form" && "Enter your travel preferences to generate personalized itineraries."}
              {step === "treks" && "Select a trek or adventure activity in your destination district."}
              {step === "hotels" && "Pick a starting hotel in your first district."}
              {step === "trek_result" && "Here is your day by day trek plan with hotel suggestions at each stop."}
              {step === "result" && "Here is your complete travel plan with meals."}
            </p>
          </div>

          {error && <div className="error-banner">{error}</div>}

          {/* STEP 1: FORM */}
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
                    {submitting
                      ? "⏳ Loading..."
                      : form.categories.includes("Adventure")
                        ? "🏔 Find Adventures"
                        : "🏨 Find Hotels"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2A: TREK SELECTION */}
          {step === "treks" && (
            <div className="trek-selection-wrap">
              {treks.map((t) => (
                <div
                  key={t.place_id}
                  className="trek-card"
                  onClick={() => handleTrekSelect(t)}
                  style={{
                    background: "#1a1a2e",
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 16,
                    border: "1px solid #e94560",
                    cursor: "pointer",
                    transition: "transform 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  <h3 style={{ color: "#e94560", margin: "0 0 8px" }}>{t.place_name}</h3>
                  <p style={{ color: "#ccc", margin: "0 0 4px" }}>
                    <strong>Category:</strong> {t.category || "Adventure"}
                  </p>
                  <p style={{ color: "#aaa", margin: "0 0 4px", fontSize: 13 }}>
                    📍 {t.district}
                  </p>
                  <p style={{ color: "#e94560", margin: "8px 0 0", fontSize: 13, fontWeight: 600 }}>
                    Click to view trek itinerary →
                  </p>
                </div>
              ))}
              {submitting && <p style={{ color: "#ccc", textAlign: "center" }}>⏳ Generating trek itinerary...</p>}
              <div className="btn-container">
                <button className="generate-btn" onClick={() => setStep("form")} style={{ background: "#555" }}>
                  ← Back
                </button>
              </div>
            </div>
          )}

          {/* STEP 2B: HOTEL SELECTION (non-adventure) */}
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

          {/* STEP 3A: TREK ITINERARY RESULT */}
          {step === "trek_result" && trekItinerary && (
            <div className="trek-result-wrap">
              <h2 style={{ color: "#e94560", marginBottom: 8 }}>
                🏔 {trekItinerary.trek_name}
              </h2>
              <p style={{ color: "#aaa", marginBottom: 24 }}>
                {trekItinerary.total_days} day trek in {trekItinerary.district}
              </p>

              {trekItinerary.days.map((day) => (
                <div
                  key={day.day_number}
                  style={{
                    background: "#1a1a2e",
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 20,
                    border: "1px solid #333",
                  }}
                >
                  <h3 style={{ color: "#e94560", marginBottom: 8 }}>
                    Day {day.day_number} — {day.stop_name}
                  </h3>
                  <p style={{ color: "#ccc", marginBottom: 4 }}>
                    🚶 {day.travel_time}
                  </p>
                  <p style={{ color: "#aaa", marginBottom: 12, fontSize: 14 }}>
                    {day.activity}
                  </p>

                  {day.overnight && day.nearby_hotels && (
                    <div>
                      <p style={{ color: "#fff", fontWeight: 600, marginBottom: 8 }}>
                        🏨 Select Hotel for Tonight:
                      </p>
                      {day.nearby_hotels.length === 0 && (
                        <p style={{ color: "#888", fontSize: 13 }}>
                          No hotels found within 5km. Tea houses or camping available.
                        </p>
                      )}
                      {day.nearby_hotels.map((h) => (
                        <div
                          key={h.hotel_id}
                          onClick={() => handleTrekHotelSelect(day.day_number, h.hotel_id)}
                          style={{
                            background: trekHotelSelections[day.day_number] === h.hotel_id
                              ? "#e94560"
                              : "#0f3460",
                            borderRadius: 8,
                            padding: "10px 14px",
                            marginBottom: 8,
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <p style={{ color: "#fff", margin: 0, fontWeight: 600 }}>
                              {h.hotel_name}
                            </p>
                            <p style={{ color: "#ddd", margin: "2px 0 0", fontSize: 12 }}>
                              NPR {h.budget} / night · {h.distance_km} km away
                            </p>
                          </div>
                          {trekHotelSelections[day.day_number] === h.hotel_id && (
                            <span style={{ color: "#fff", fontWeight: 700 }}>✓ Selected</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {!day.overnight && (
                    <p style={{ color: "#888", fontSize: 13, fontStyle: "italic" }}>
                      Day hike — return to previous stop for overnight stay.
                    </p>
                  )}
                </div>
              ))}

              <div className="btn-container">
                <button className="generate-btn" onClick={() => setStep("treks")} style={{ background: "#555", marginRight: 12 }}>
                  ← Choose Different Trek
                </button>
                <button className="generate-btn" onClick={resetForm}>
                  🔄 Plan Another Trip
                </button>
              </div>
            </div>
          )}

          {/* STEP 3B: NORMAL ITINERARY RESULT */}
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