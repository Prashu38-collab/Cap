import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ItineraryResult from "../components/ItineraryResult";
import HotelSelection from "../components/HotelSelection";
import TrekSelection from "../components/TrekSelection";
import TrekItineraryResult from "../components/TrekItineraryResult";
import PlanTripMap from "../components/PlanTripMap";
import { createPreference, generateFromHotel, generateTrek, selectTrekHotel, getPlacesByDistrict } from "../utils/api";

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

  // Coordinate states for dynamic map markers
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);

  // Fetch coordinates dynamically when starting district changes
  useEffect(() => {
    if (form.starting_district) {
      getPlacesByDistrict(form.starting_district)
        .then((places) => {
          const coords = places.filter((p) => p.latitude && p.longitude);
          if (coords.length > 0) {
            const avgLat = coords.reduce((sum, p) => sum + p.latitude, 0) / coords.length;
            const avgLon = coords.reduce((sum, p) => sum + p.longitude, 0) / coords.length;
            setStartCoords([avgLat, avgLon]);
          } else {
            setStartCoords(null);
          }
        })
        .catch((err) => {
          console.error("Error fetching start district coordinates", err);
          setStartCoords(null);
        });
    } else {
      setStartCoords(null);
    }
  }, [form.starting_district]);

  // Fetch coordinates dynamically when ending district changes
  useEffect(() => {
    if (form.ending_district) {
      getPlacesByDistrict(form.ending_district)
        .then((places) => {
          const coords = places.filter((p) => p.latitude && p.longitude);
          if (coords.length > 0) {
            const avgLat = coords.reduce((sum, p) => sum + p.latitude, 0) / coords.length;
            const avgLon = coords.reduce((sum, p) => sum + p.longitude, 0) / coords.length;
            setEndCoords([avgLat, avgLon]);
          } else {
            setEndCoords(null);
          }
        })
        .catch((err) => {
          console.error("Error fetching end district coordinates", err);
          setEndCoords(null);
        });
    } else {
      setEndCoords(null);
    }
  }, [form.ending_district]);

  // Determine local YYYY-MM-DD for date validation
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  // Trek specific state
  const [selectedTrek, setSelectedTrek] = useState(null);
  const [trekItinerary, setTrekItinerary] = useState(null);
  const [trekHotelSelections, setTrekHotelSelections] = useState({});

  // Insufficient places / transit state
  const [insufficientInfo, setInsufficientInfo] = useState(null);
  const [selectedTransitDistricts, setSelectedTransitDistricts] = useState([]);
  const [noTrekFallback, setNoTrekFallback] = useState(null);

  const update = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      const cats = checked
        ? [...form.categories, value]
        : form.categories.filter((c) => c !== value);
      
      const isAdventure = cats.includes("Adventure");
      setForm((prev) => ({
        ...prev,
        categories: cats,
        mobility: isAdventure ? "Difficult" : prev.mobility
      }));
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
    if (form.travel_date < todayStr) { setError("Travel date cannot be in the past"); return; }
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

      // ── No-trek fallback ──
      if (data.flow === "no_trek_fallback") {
        setNoTrekFallback(data);
        setHotels(data.hotels || []);
        // Show the fallback message and fall through to hotel selection
        setInsufficientInfo(null);
        setStep("hotels");
        return;
      }

      // ── Trek selection ──
      if (data.flow === "trek_selection" && data.treks?.length) {
        setTreks(data.treks);
        setStep("treks");
        return;
      }

      // ── Normal hotel selection ──
      setHotels(data.hotels || []);

      // Check for insufficient places
      if (data.insufficient_places) {
        setInsufficientInfo({
          message: data.message,
          placeCount: data.place_count,
          maxDays: data.max_sightseeing_days,
          requestedDays: data.requested_days,
          nearbyDistricts: data.nearby_districts || [],
          maxDaysWithNearby: data.max_days_with_nearby || 0,
        });
        setStep("insufficient_warning");
      } else {
        setStep("hotels");
      }
    } catch (err) {
      setError(err.message || "Failed to create trip");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Handle insufficient places choices ──
  const handleContinueAnyway = () => {
    setInsufficientInfo(null);
    setStep("hotels");
  };

  const handleIncludeNearby = (selectedDistricts) => {
    setSelectedTransitDistricts(selectedDistricts);
    setInsufficientInfo(null);
    setStep("hotels");
  };

  const toggleTransitDistrict = (district) => {
    setSelectedTransitDistricts((prev) =>
      prev.includes(district)
        ? prev.filter((d) => d !== district)
        : [...prev, district]
    );
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
      const data = await generateFromHotel(prefId, hotelId, {
        includeTransit: selectedTransitDistricts.length > 0,
        transitDistricts: selectedTransitDistricts,
      });
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
    setInsufficientInfo(null);
    setSelectedTransitDistricts([]);
    setNoTrekFallback(null);
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

  const trekLabel = treks.length ? "Trek" : "Hotel";
  const stepLabel =
    step === "insufficient_warning"
      ? "Destination"
      : step === "no_trek_fallback"
      ? "Destination"
      : trekLabel;

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
            <div className={`ws-step ${step === "treks" || step === "hotels" || step === "insufficient_warning" || step === "no_trek_fallback" ? "active" : step === "result" || step === "trek_result" ? "done" : ""}`}>
              <span className="ws-num">{step === "result" || step === "trek_result" ? "✓" : "2"}</span>
              <span className="ws-label">{stepLabel}</span>
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
              {step === "insufficient_warning" && "Destination Notice"}
              {step === "no_trek_fallback" && "Explore Instead"}
            </h1>
            <p>
              {step === "form" && "Enter your travel preferences to generate personalized itineraries."}
              {step === "treks" && "Select a trek or adventure activity in your destination district."}
              {step === "hotels" && "Pick a starting hotel in your first district."}
              {step === "trek_result" && "Here is your day by day trek plan with hotel suggestions at each stop."}
              {step === "result" && "Here is your complete travel plan with meals."}
              {step === "insufficient_warning" && insufficientInfo?.message}
              {step === "no_trek_fallback" && noTrekFallback?.message}
            </p>
          </div>

          {error && <div className="error-banner">{error}</div>}

          {/* STEP 1: FORM */}
          {step === "form" && (
            <div className="plantrip-layout">
              <div className="plantrip-form-side">
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
                        {["Easy", "Moderate", "Difficult"].map((m) => {
                          const isAdventure = form.categories.includes("Adventure");
                          const isMobilityDisabled = isAdventure && m !== "Difficult";
                          return (
                            <div className="radio" key={m}>
                              <input 
                                type="radio" 
                                id={`mob-${m}`} 
                                name="mobility" 
                                value={m} 
                                checked={form.mobility === m} 
                                onChange={update} 
                                disabled={isMobilityDisabled}
                              />
                              <label 
                                htmlFor={`mob-${m}`}
                                style={{
                                  opacity: isMobilityDisabled ? 0.5 : 1,
                                  cursor: isMobilityDisabled ? "not-allowed" : "pointer"
                                }}
                              >
                                {m}
                              </label>
                            </div>
                          );
                        })}
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
                        <input type="date" name="travel_date" value={form.travel_date} onChange={update} min={todayStr} required />
                      </div>
                      <div className="input-group">
                        <label>Duration (days) <span className="required">*</span></label>
                        <input type="number" name="travel_days" placeholder="e.g. 3" value={form.travel_days} onChange={update} min="1" max="30" />
                      </div>
                    </div>
                    <div className="btn-container">
                      <button type="submit" className="generate-btn" disabled={submitting}>
                        {submitting
                          ? "Loading..."
                          : form.categories.includes("Adventure")
                            ? "Find Adventures"
                            : "Find Hotels"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
              <PlanTripMap
                startCoords={startCoords}
                endCoords={endCoords}
                startingDistrict={form.starting_district}
                endingDistrict={form.ending_district}
              />
            </div>
          )}

          {/* INSUFFICIENT PLACES WARNING */}
          {step === "insufficient_warning" && insufficientInfo && (
            <div className="insufficient-wrap">
              <div className="insufficient-card">
                <div className="insufficient-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <h2>Not Enough Attractions</h2>
                <p className="insufficient-msg">{insufficientInfo.message}</p>

                <div className="insufficient-stats">
                  <div className="insufficient-stat">
                    <span className="insufficient-stat-val">{insufficientInfo.placeCount}</span>
                    <span className="insufficient-stat-lbl">Places Available</span>
                  </div>
                  <div className="insufficient-stat">
                    <span className="insufficient-stat-val">{insufficientInfo.maxDays}</span>
                    <span className="insufficient-stat-lbl">Max Days</span>
                  </div>
                  <div className="insufficient-stat">
                    <span className="insufficient-stat-val">{insufficientInfo.requestedDays}</span>
                    <span className="insufficient-stat-lbl">You Selected</span>
                  </div>
                </div>

                {insufficientInfo.nearbyDistricts.length > 0 && (
                  <div className="insufficient-nearby">
                    <h3>Neighbouring Districts with More Attractions</h3>
                    <p className="insufficient-nearby-hint">
                      Include nearby transit districts to fill your {insufficientInfo.requestedDays}-day trip.
                      Max days with nearby: <strong>{insufficientInfo.maxDaysWithNearby}</strong>
                    </p>
                    <div className="insufficient-district-list">
                      {insufficientInfo.nearbyDistricts.map((nd) => (
                        <label
                          key={nd.district}
                          className={`insufficient-district-chip ${selectedTransitDistricts.includes(nd.district) ? "selected" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedTransitDistricts.includes(nd.district)}
                            onChange={() => toggleTransitDistrict(nd.district)}
                          />
                          <span className="insufficient-chip-name">{nd.district}</span>
                          <span className="insufficient-chip-count">{nd.place_count} places</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="insufficient-actions">
                  <button
                    className="generate-btn"
                    onClick={() => handleIncludeNearby(selectedTransitDistricts)}
                    disabled={selectedTransitDistricts.length === 0}
                    style={{ marginRight: 12 }}
                  >
                    {selectedTransitDistricts.length > 0
                      ? `🗺 Include ${selectedTransitDistricts.length} Nearby District${selectedTransitDistricts.length > 1 ? "s" : ""}`
                      : "Select districts above"}
                  </button>
                  <button
                    className="generate-btn"
                    onClick={handleContinueAnyway}
                    style={{ background: "#6b7280" }}
                  >
                    ⏭ Continue Anyway
                  </button>
                </div>
                <button className="insufficient-back-btn" onClick={() => setStep("form")}>
                  ← Change Preferences
                </button>
              </div>
            </div>
          )}

          {/* NO-TREK FALLBACK */}
          {step === "no_trek_fallback" && noTrekFallback && (
            <div className="insufficient-wrap">
              <div className="insufficient-card">
                <div className="insufficient-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3l4 8 5-5 3 14H2z"/></svg>
                </div>
                <h2>No Treks Found</h2>
                <p className="insufficient-msg">{noTrekFallback.message}</p>
                <div className="insufficient-actions">
                  <button className="generate-btn" onClick={() => setStep("hotels")}>
                    Generate Sightseeing Itinerary
                  </button>
                </div>
                <button className="insufficient-back-btn" onClick={() => setStep("form")}>
                  ← Change Preferences
                </button>
              </div>
            </div>
          )}

          {/* STEP 2A: TREK SELECTION */}
          {step === "treks" && (
            <div className="trek-selection-wrap">
              <TrekSelection
                treks={treks}
                onSelect={handleTrekSelect}
                loading={submitting}
              />
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
              {selectedTransitDistricts.length > 0 && (
                <div className="transit-badge">
                  <span>Including nearby: {selectedTransitDistricts.join(", ")}</span>
                </div>
              )}
              {noTrekFallback && (
                <div className="transit-badge" style={{ background: "#eff6ff", borderColor: "#bfdbfe", color: "#2563eb" }}>
                  <span>{noTrekFallback.message}</span>
                </div>
              )}
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
              <TrekItineraryResult
                trekItinerary={trekItinerary}
                hotelSelections={trekHotelSelections}
                onHotelSelect={handleTrekHotelSelect}
              />
              <div className="btn-container">
                <button className="generate-btn" onClick={() => setStep("treks")} style={{ background: "#555", marginRight: 12 }}>
                  ← Choose Different Trek
                </button>
                <button className="generate-btn" onClick={resetForm}>
                  Plan Another Trip
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
                  Plan Another Trip
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
