import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import "../styles/plantrip.css";

import { useNavigate } from "react-router-dom";

function PlanTrip() {

    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        navigate("/generate");
        };

    return (

        <>
        <Navbar />

        <div className="planImage">

            <div className="formContainer">

                <div className="plan-title" id="plan">
                    <h1>Plan My Trip</h1>
                    <p>Enter your travel preferences to generate personalized itineraries.</p>
                </div>
                
                <div className="form-card">
                    
                    <form onSubmit={handleSubmit}>

                        {/* PROVINCE */}
                        <div className="input-group">
                            <label htmlFor="province">
                                Province 
                            </label><br></br>
                            <input type="text" id="province" name="province" value="Bagmati" disabled />
                        </div>

                        {/* DISTRICT */}
                        <div className="input-group">
                            <label htmlFor="district">
                                Starting District <span className="required">*</span>
                            </label><br></br>
                            <select id="district" name="district" defaultValue="" required>
                                <option value="" disabled hidden>Select your starting district...</option>

                                <option value="Kathmandu">Kathmandu</option>
                                <option value="Lalitpur">Lalitpur</option>
                                <option value="Bhaktapur">Bhaktapur</option>
                                <option value="Chitwan">Chitwan</option>
                                <option value="Dolakha">Dolakha</option>
                                <option value="Kavrepalanchok">Kavrepalanchok</option>
                                <option value="Nuwakot">Nuwakot</option>
                                <option value="Rasuwa">Rasuwa</option>
                                <option value="Sindhuli">Sindhuli</option>
                                <option value="Sindhupalchok">Sindhupalchok</option>
                            </select>
                        </div>

                        <div className="input-group">
                            <label htmlFor="district">
                                Ending District <span className="required">*</span>
                            </label><br></br>
                            <select id="district" name="district" defaultValue="" required>
                                <option value="" disabled hidden>Select your ending district...</option>

                                <option value="Kathmandu">Kathmandu</option>
                                <option value="Lalitpur">Lalitpur</option>
                                <option value="Bhaktapur">Bhaktapur</option>
                                <option value="Chitwan">Chitwan</option>
                                <option value="Dolakha">Dolakha</option>
                                <option value="Kavrepalanchok">Kavrepalanchok</option>
                                <option value="Nuwakot">Nuwakot</option>
                                <option value="Rasuwa">Rasuwa</option>
                                <option value="Sindhuli">Sindhuli</option>
                                <option value="Sindhupalchok">Sindhupalchok</option>
                            </select>
                        </div>

                        {/* DESTINATION */}
                        {/* <div className="input-group">
                            <label htmlFor="destination">
                                Preferred Destination
                            </label>
                            <input type="text" id="destination" name="destination" placeholder="Enter destination name..." />
                        </div> */}

                        {/* INTERESTS */}
                        <div className="input-group">
                            <label>
                                Interests <span className="required">*</span>
                            </label><br></br>

                            <div className="checkbox-group">
                                <div className="checkbox">
                                    <input type="checkbox" id="interest1" name="interest1" value="Adventure" defaultChecked />
                                    <label htmlFor="interest1"> Adventure </label>
                                </div>
                                <div className="checkbox">
                                    <input type="checkbox" id="interest2" name="interest2" value="Nature" />
                                    <label htmlFor="interest2"> Nature </label>
                                </div>
                                <div className="checkbox">
                                    <input type="checkbox" id="interest3" name="interest3" value="Culture" />
                                    <label htmlFor="interest3"> Culture </label>
                                </div>
                                <div className="checkbox">
                                    <input type="checkbox" id="interest4" name="interest4" value="Religious" />
                                    <label htmlFor="interest4"> Religious </label>
                                </div>
                            </div>
                        </div>

                        {/* MOBILITY TYPE */}
                        <div className="input-group">
                            <label>
                                Mobility Type <span className="required">*</span>
                            </label>

                            <div className="radio-group">
                                <div className="radio">
                                    <input type="radio" id="easy" name="mobility" value="Easy" defaultChecked />
                                    <label htmlFor="easy">Easy</label>
                                </div>
                                <div className="radio">
                                    <input type="radio" id="moderate" name="mobility" value="Moderate" />
                                    <label htmlFor="moderate">Moderate</label>
                                </div>
                                <div className="radio">
                                    <input type="radio" id="difficult" name="mobility" value="Difficult" />
                                    <label htmlFor="difficult">Difficult</label>
                                </div>
                            </div>
                        </div>

                        {/* TRIP BUDGET */}
                        <div className="input-group">
                            <label htmlFor="budget">
                                Trip Budget Range (NPR) <span className="required">*</span>
                            </label><br></br>
                            {/* <label htmlFor="minimumBudget">Minimum:</label><input type="number" name="minBudget" placeholder="Minimum Budget" min="1000" step="1000" />
                            <label htmlFor="maximumBudget">Maximum:</label><input type="number" name="maxBudget" placeholder="Maximum Budget" min="2000" max="20000" step="1000" /> */}
                            
                            <input type="number" name="trip budget" placeholder="Preferred total trip budget.." />
                        </div>

                        {/* HOTEL BUDGET */}
                        <div className="input-group">
                            <label htmlFor="hotelBudget">
                                Hotel Budget (NPR) <span className="required">*</span>
                            </label>

                            {/* <div className="radio-group">
                                <div className="radio">
                                    <input type="radio" id="low" name="budget" value="Low" defaultChecked />
                                    <label htmlFor="low">Low</label>
                                </div>
                                <div className="radio">
                                    <input type="radio" id="medium" name="budget" value="Medium" />
                                    <label htmlFor="medium">Medium</label>
                                </div>
                                <div className="radio">
                                    <input type="radio" id="high" name="budget" value="High" />
                                    <label htmlFor="high">High</label>
                                </div>
                            </div> */}

                            <input type="number" name="hotel budget" placeholder="Preferred hotel budget.." />
                        </div>

                        {/*  TRAVEL Date */}
                        <div className="input-group">
                            <label htmlFor="travelDate">Travel Date <span className="required">*</span></label><br></br>
                            <input type="date" id="travelDate" name="travelDate" required />
                        </div>

                        {/* TRIP DURATION */}
                        <div className="input-group">
                            <label htmlFor="duration">Trip Duration <span className="required">*</span></label><br></br>
                            <input type="number" placeholder="Number of travel days" id="duration" name="duration" min="1" required />
                        </div>

                        {/* START LOCATION */}
                        {/* <div className="input-group">
                            <label htmlFor="start">Starting Location</label><br></br>
                            <input type="text" id="start" name="start" placeholder="Kathmandu" disabled />
                        </div> */}

                        {/* BUTTON */}
                        <div className="btn-container">
                            <button type="submit" className="generate-btn">
                                Generate Itinerary
                            </button>
                        </div>

                    </form>

                </div>
            </div>

            </div>

        <Footer />
        </>
    );
}

export default PlanTrip;