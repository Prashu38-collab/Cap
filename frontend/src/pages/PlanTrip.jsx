import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SplitLayout from "../components/SplitLayout";
import ItineraryResult from "../components/ItineraryResult";
import HotelSelection, { HotelSelectionMap } from "../components/HotelSelection";
import TrekSelection from "../components/TrekSelection";
import TrekItineraryResult from "../components/TrekItineraryResult";
import PlanTripMap from "../components/PlanTripMap";
import { createPreference, generateFromHotel, checkWeather, generateTrek, selectTrekHotel, getPlacesByDistrict } from "../utils/api";

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

  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);

  const [trekItinerary, setTrekItinerary] = useState(null);
  const [trekHotelSelections, setTrekHotelSelections] = useState({});

  const [insufficientInfo, setInsufficientInfo] = useState(null);
  const [selectedTransitDistricts, setSelectedTransitDistricts] = useState([]);
  const [noTrekFallback, setNoTrekFallback] = useState(null);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);

  const [weatherAdvisory, setWeatherAdvisory] = useState(null);
  const [pendingHotelId, setPendingHotelId] = useState(null);

  const [trekRecommendation, setTrekRecommendation] = useState(null);
  const [trekDurationMessage, setTrekDurationMessage] = useState(null);
  const [recommendedTrekId, setRecommendedTrekId] = useState(null);
  const [hoveredHotelId, setHoveredHotelId] = useState(null);

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
        .catch(() => setStartCoords(null));
    } else {
      setStartCoords(null);
    }
  }, [form.starting_district]);

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
        .catch(() => setEndCoords(null));
    } else {
      setEndCoords(null);
    }
  }, [form.ending_district]);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

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
        //choosing adventure automatically sets mobility to Difficult, otherwise keep previous mobility
        mobility: isAdventure ? "Difficult" : prev.mobility,
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

      if (data.flow === "no_trek_fallback") {
        setNoTrekFallback(data);
        setHotels(data.hotels || []);
        setInsufficientInfo(null);
        setStep("no_trek_fallback");
        return;
      }
        //handling trek selection flow if available in the response
      if (data.flow === "trek_selection" && data.treks?.length) {
        setTreks(data.treks);
        setTrekDurationMessage(data.trek_duration_message || null);
        setRecommendedTrekId(data.recommended_trek?.place_id || null);
        setStep("treks");
        return;
      }

      setHotels(data.hotels || []);

//setting trek recommendation if available in the response
      if (data.trek_recommendation) {
        setTrekRecommendation(data.trek_recommendation);
        setTrekDurationMessage(data.trek_duration_note || null);
      }

      if (data.insufficient_places) {
        setInsufficientInfo({
          message: data.message,
          placeCount: data.place_count,
          maxDays: data.max_sightseeing_days,
          requestedDays: data.requested_days,
          nearbyDistricts: data.nearby_districts || [],
          maxDaysWithNearby: data.max_days_with_nearby || 0,
          options: data.options || [],
        });
        setShowInsufficientModal(true);
      } else {
        setStep("hotels");
      }
    } catch (err) {
      setError(err.message || "Failed to create trip");
    } finally {
      setSubmitting(false);
    }
  };
//handling insufficient places options and nearby district selection
  const handleInsufficientOption = (optionId) => {
    setShowInsufficientModal(false);
    if (optionId === "nearby") {
      setStep("insufficient_nearby");
    } else if (optionId === "relaxed") {
      setStep("hotels");
    } else if (optionId === "change_destination") {
      setStep("form");
    }
  };
//handling nearby district selection and proceeding to hotel selection
  const handleIncludeNearby = (selectedDistricts) => {
    setSelectedTransitDistricts(selectedDistricts);
    setInsufficientInfo(null);
    setStep("hotels");
  };
    //handling trek recommendation selection and proceeding to trek itinerary generation
  const handleTrekRecommendation = async () => {
    if (!trekRecommendation) return;
    setTrekRecommendation(null);
    setTrekDurationMessage(null);
    try {
      const data = await generateTrek(trekRecommendation.place_id, parseInt(form.travel_days), 
      form.starting_district);
      setTrekItinerary(data);
      setStep("trek_result");
    } catch (err) {
      setError(err.message || "Failed to generate trek itinerary");
    }
  };
//handling trek recommendation dismissal and proceeding to hotel selection
  const handleDismissTrekRecommendation = () => {
    setTrekRecommendation(null);
    setTrekDurationMessage(null);
  };
//toggle nearby district selection for transit
  const toggleTransitDistrict = (district) => {
    setSelectedTransitDistricts((prev) =>
      prev.includes(district) ? prev.filter((d) => d !== district) : [...prev, district]
    );
  };

 //handling trek selection and generating trek itinerary
  const handleTrekSelect = async (trek) => {
    setSubmitting(true);
    setError(null);
    try {
      const data = await generateTrek(trek.place_id, parseInt(form.travel_days), form.starting_district);
      setTrekItinerary(data);
      setStep("trek_result");
    } catch (err) {
      setError(err.message || "Failed to generate trek itinerary");
    } finally {
      setSubmitting(false);
    }
  };
// handling trek hotel selection and saving the selection
  const handleTrekHotelSelect = async (dayNumber, hotelId) => {
    try {
      await selectTrekHotel(prefId, dayNumber, hotelId);
      setTrekHotelSelections((prev) => ({ ...prev, [dayNumber]: hotelId }));
    } catch (err) {
      setError(err.message || "Failed to save hotel selection");
    }
  };

//handling hotel selection and generating itinerary from selected hotel
  const handleHotelSelect = async (hotelId) => {
    setSubmitting(true);
    setError(null);
    try {
      // Check weather first
      const weatherCheck = await checkWeather(prefId, {
        includeTransit: selectedTransitDistricts.length > 0,
        transitDistricts: selectedTransitDistricts,
      });

      const weatherStatus = weatherCheck?.weather?.status;

      // Weather is favourable or outside forecast → generate normally
      if (weatherStatus === "favourable" || weatherStatus === "outside_forecast" || weatherStatus === "unavailable") {
        const data = await generateFromHotel(prefId, hotelId, {
          includeTransit: selectedTransitDistricts.length > 0,
          transitDistricts: selectedTransitDistricts,
        });
        if (!data?.data?.itinerary || data.data.itinerary.length === 0) {
          setError("Could not generate itinerary for this selection. Please try a different hotel.");
          setSubmitting(false);
          return;
        }
        setResult(data);
        setWeatherForecast(data.weather_forecast || []);
        setStep("result");
      } else {
        // Weather is unfavourable — show advisory modal
        setWeatherAdvisory(weatherCheck.weather);
        setPendingHotelId(hotelId);
      }
    } catch (err) {
      setError(err.message || "Failed to generate itinerary");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWeatherContinueAnyway = async () => {
    if (!pendingHotelId) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await generateFromHotel(prefId, pendingHotelId, {
        includeTransit: selectedTransitDistricts.length > 0,
        transitDistricts: selectedTransitDistricts,
        weatherAction: "continue",
      });
      if (!data?.data?.itinerary || data.data.itinerary.length === 0) {
        setError("Could not generate itinerary. Please try again.");
        setSubmitting(false);
        return;
      }
      data.data._weather_advisory = weatherAdvisory;
      setResult(data);
      setWeatherForecast(data.weather_forecast || []);
      setWeatherAdvisory(null);
      setPendingHotelId(null);
      setStep("result");
    } catch (err) {
      setError(err.message || "Failed to generate itinerary");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWeatherAware = async () => {
    if (!pendingHotelId) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await generateFromHotel(prefId, pendingHotelId, {
        includeTransit: selectedTransitDistricts.length > 0,
        transitDistricts: selectedTransitDistricts,
        weatherAction: "weather_aware",
      });
      if (!data?.data?.itinerary || data.data.itinerary.length === 0) {
        setError("Could not generate itinerary. Please try again.");
        setSubmitting(false);
        return;
      }
      data.data._weather_advisory = weatherAdvisory;
      data.data._weather_aware = true;
      setResult(data);
      setWeatherForecast(data.weather_forecast || []);
      setWeatherAdvisory(null);
      setPendingHotelId(null);
      setStep("result");

      const warnings = data.data?._weather_removals;
      if (warnings?.length > 0) {
        setTimeout(() => {
          alert(warnings.map(w => w.warning).join("\n\n"));
        }, 500);
      }
    } catch (err) {
      setError(err.message || "Failed to generate itinerary");
    } finally {
      setSubmitting(false);
    }
  };

  //handling no trek fallback and proceeding to hotel selection
  const handleNoTrekContinue = async () => {
    if (!noTrekFallback?.hotels?.length || !prefId) return;
    setSubmitting(true);
    setError(null);
    try {
      const firstHotel = noTrekFallback.hotels[0];
      const data = await generateFromHotel(prefId, firstHotel.hotel_id, {
        includeTransit: false,
        transitDistricts: [],
      });
      if (!data?.data?.itinerary || data.data.itinerary.length === 0) {
        setError("Could not generate itinerary. Please try again.");
        setSubmitting(false);
        return;
      }
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
    setTrekItinerary(null);
    setTrekHotelSelections({});
    setInsufficientInfo(null);
    setSelectedTransitDistricts([]);
    setNoTrekFallback(null);
    setShowInsufficientModal(false);
    setTrekRecommendation(null);
    setTrekDurationMessage(null);
    setRecommendedTrekId(null);
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

  // Helper to render Left Panel Content based on current step
  const renderLeftPanelContent = () => {
    return (
      <div className="plan-left-scroll-wrap">
        <div className="plan-title" id="plan">
          <h1>
            {step === "form" && "Plan My Trip"}
            {step === "treks" && "Choose Your Adventure"}
            {step === "hotels" && "Choose Your Hotel"}
            {step === "trek_result" && "Your Trek Itinerary"}
            {step === "result" && "Your Journey"}
            {step === "insufficient_nearby" && "Include Nearby Districts"}
            {step === "no_trek_fallback" && "Explore Instead"}
          </h1>
          <p>
            {step === "form" && "Enter your travel preferences to generate personalized itineraries."}
            {step === "treks" && "Select a trek or adventure activity in your destination district."}
            {step === "hotels" && "Pick a starting hotel in your destination district."}
            {step === "trek_result" && "Your day-by-day trek plan with hotel suggestions at each stop."}
            {step === "result" && "Day-by-day itinerary with travel time, routes, and attractions."}
            {step === "insufficient_nearby" && "Include nearby districts to enrich your itinerary."}
            {step === "no_trek_fallback" && noTrekFallback?.message}
          </p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* STEP 1: FORM */}
        {step === "form" && (
          <div className="form-card mbg-card">
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
                            cursor: isMobilityDisabled ? "not-allowed" : "pointer",
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
        )}

        {/* STEP 2: HOTEL SELECTION */}
        {step === "hotels" && (
          <div className="hotel-selection-wrap">
            {trekRecommendation && (
              <div className="trek-recommendation-card">
                <div className="trek-rec-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/>
                    <path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                    <path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z"/>
                    <path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z"/>
                    <path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z"/>
                    <path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/>
                    <path d="M10 9.5C10 10.33 9.33 11 8.5 11h-5C2.67 11 2 10.33 2 9.5S2.67 8 3.5 8h5c.83 0 1.5.67 1.5 1.5z"/>
                    <path d="M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z"/>
                  </svg>
                </div>
                <div className="trek-rec-content">
                  <h4>{trekRecommendation.place_name}</h4>
                  <p>
                    This destination offers trekking adventures. Since you selected Hard difficulty, would you like to explore the available trek instead?
                  </p>
                  {trekDurationMessage && (
                    <p className="trek-rec-duration">{trekDurationMessage}</p>
                  )}
                </div>
                <div className="trek-rec-actions">
                  <button className="generate-btn" onClick={handleTrekRecommendation}>
                    Continue with Trek
                  </button>
                  <button className="generate-btn" onClick={handleDismissTrekRecommendation} style={{ background: "#6b7280" }}>
                    Continue with Normal Trip
                  </button>
                </div>
              </div>
            )}
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
              onHover={setHoveredHotelId}
              loading={submitting}
            />
          </div>
        )}

        {/* STEP: NO TREK FALLBACK */}
        {step === "no_trek_fallback" && noTrekFallback && (
          <div className="insufficient-wrap">
            <div className="insufficient-card mbg-card">
              <h2>No Adventure Activities Found</h2>
              <p className="insufficient-msg">{noTrekFallback.message}</p>
              <div className="insufficient-actions" style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <button className="generate-btn" onClick={handleNoTrekContinue} disabled={submitting}>
                  {submitting ? "Generating..." : "Continue with Dynamic Trip"}
                </button>
                <button className="generate-btn" onClick={() => setStep("form")} style={{ background: "#6b7280" }}>
                  Choose Another District
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP: TREK SELECTION — rendered at top level below (has own SplitLayout) */}

        {/* STEP: INSUFFICIENT NEARBY DISTRICTS */}
        {step === "insufficient_nearby" && insufficientInfo && (
          <div className="insufficient-wrap">
            <div className="insufficient-card mbg-card">
              <h2>Select Nearby Districts</h2>
              <p className="insufficient-msg">
                Choose nearby districts to include. Max days with nearby: <strong>{insufficientInfo.maxDaysWithNearby}</strong>
              </p>

              {insufficientInfo.nearbyDistricts.length > 0 && (
                <div className="insufficient-nearby" style={{ margin: "16px 0" }}>
                  <div className="insufficient-district-list" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {insufficientInfo.nearbyDistricts.map((nd) => (
                      <label
                        key={nd.district}
                        className={`insufficient-district-chip ${selectedTransitDistricts.includes(nd.district) ? "selected" : ""}`}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 20,
                          border: "1px solid #cbd5e1",
                          cursor: "pointer",
                          background: selectedTransitDistricts.includes(nd.district) ? "#eff6ff" : "#ffffff"
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTransitDistricts.includes(nd.district)}
                          onChange={() => toggleTransitDistrict(nd.district)}
                          style={{ marginRight: 6 }}
                        />
                        <span>{nd.district}</span> ({nd.place_count} places)
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="insufficient-actions" style={{ display: "flex", gap: 12 }}>
                <button
                  className="generate-btn"
                  onClick={() => handleIncludeNearby(selectedTransitDistricts)}
                  disabled={selectedTransitDistricts.length === 0}
                >
                  {selectedTransitDistricts.length > 0
                    ? `Include ${selectedTransitDistricts.length} Nearby District${selectedTransitDistricts.length > 1 ? "s" : ""}`
                    : "Select districts above"}
                </button>
                <button className="generate-btn" onClick={() => setStep("form")} style={{ background: "#6b7280" }}>
                  Back to Form
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper to render Map content based on current step
  const renderMapContent = () => {
    if (step === "hotels") {
      return (
        <HotelSelectionMap
          hotels={hotels}
          selectedId={null}
          hoveredId={hoveredHotelId}
        />
      );
    }

    return (
      <PlanTripMap
        startCoords={startCoords}
        endCoords={endCoords}
        startingDistrict={form.starting_district}
        endingDistrict={form.ending_district}
      />
    );
  };

  return (
    <>
      <Navbar />
      <div className={`planImage step-${step}`}>
        <div className="formContainer">

          {/* INSUFFICIENT PLACES MODAL */}
          {showInsufficientModal && insufficientInfo && (
            <div className="modal-overlay" onClick={() => { setShowInsufficientModal(false); setStep("form"); }}>
              <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <h2 className="modal-title">Destination Notice</h2>
                <p className="modal-msg">{insufficientInfo.message}</p>

                <div className="modal-stats">
                  <div className="modal-stat">
                    <span className="modal-stat-val">{insufficientInfo.placeCount}</span>
                    <span className="modal-stat-lbl">Places Available</span>
                  </div>
                  <div className="modal-stat">
                    <span className="modal-stat-val">{insufficientInfo.maxDays}</span>
                    <span className="modal-stat-lbl">Max Days</span>
                  </div>
                  <div className="modal-stat">
                    <span className="modal-stat-val">{insufficientInfo.requestedDays}</span>
                    <span className="modal-stat-lbl">You Selected</span>
                  </div>
                </div>

                <div className="modal-options">
                  {insufficientInfo.options.map((opt) => (
                    <button key={opt.id} className="modal-option-btn" onClick={() => handleInsufficientOption(opt.id)}>
                      <span className="modal-option-title">{opt.title}</span>
                      <span className="modal-option-desc">{opt.description}</span>
                    </button>
                  ))}
                </div>

                <button className="modal-close-btn" onClick={() => { setShowInsufficientModal(false); setStep("form"); }}>
                  Back to Form
                </button>
              </div>
            </div>
          )}

          {/* WEATHER ADVISORY MODAL */}
          {weatherAdvisory && (
            <div className="modal-overlay">
              <div className="modal-card" style={{ maxWidth: "480px" }}>
                <h2 className="modal-title">{weatherAdvisory.advisory?.title || "Weather Advisory"}</h2>
                <p className="modal-msg">{weatherAdvisory.advisory?.message || "Adverse weather expected."}</p>

                <div className="modal-stats">
                  <div className="modal-stat">
                    <span className="modal-stat-val">{weatherAdvisory.condition || "Unknown"}</span>
                    <span className="modal-stat-lbl">Forecast</span>
                  </div>
                  <div className="modal-stat">
                    <span className="modal-stat-val">{weatherAdvisory.indoor_alternatives_available ? "Yes" : "No"}</span>
                    <span className="modal-stat-lbl">Indoor Alternatives</span>
                  </div>
                </div>

                <div className="modal-options" style={{ marginTop: "20px" }}>
                  <button
                    className="modal-option-btn"
                    onClick={handleWeatherContinueAnyway}
                    disabled={submitting}
                  >
                    <span className="modal-option-title">Continue Anyway</span>
                    <span className="modal-option-desc">
                      Keep outdoor attractions in your itinerary despite the weather.
                    </span>
                  </button>
                  <button
                    className="modal-option-btn"
                    onClick={handleWeatherAware}
                    disabled={submitting}
                  >
                    <span className="modal-option-title">Generate Weather-Aware Itinerary</span>
                    <span className="modal-option-desc">
                      Only include indoor attractions suitable for bad weather.
                    </span>
                  </button>
                </div>

                <button
                  className="modal-close-btn"
                  onClick={() => { setWeatherAdvisory(null); setPendingHotelId(null); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* UNIFIED MAP BACKGROUND LAYOUT */}
          {step === "result" && result ? (
            <ItineraryResult
              itinerary={result.data}
              weatherForecast={weatherForecast}
              preferenceId={result.preference_id}
              corridor={result.data?.corridor}
              onReset={resetForm}
            />
          ) : step === "treks" ? (
            <div className="trek-selection-wrap">
              {trekDurationMessage && (
                <div className="trek-duration-message">
                  {trekDurationMessage}
                </div>
              )}
              <TrekSelection
                treks={treks}
                onSelect={handleTrekSelect}
                loading={submitting}
                recommendedTrekId={recommendedTrekId}
                onBack={() => setStep("form")}
              />
            </div>
          ) : step === "trek_result" && trekItinerary ? (
            <TrekItineraryResult
              trekItinerary={trekItinerary}
              hotelSelections={trekHotelSelections}
              onHotelSelect={handleTrekHotelSelect}
              onBack={() => setStep("treks")}
              onReset={resetForm}
            />
          ) : (
            <SplitLayout
              key={step}
              leftContent={renderLeftPanelContent()}
              rightContent={renderMapContent()}
            />
          )}

        </div>
      </div>
      <Footer />
    </>
  );
}

export default PlanTrip;
