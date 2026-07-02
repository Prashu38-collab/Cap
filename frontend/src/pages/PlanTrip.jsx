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
                    
                    <form onSubmit={handleSubmit} className="form-content">

                        <fieldset className="form-fieldset">

                        <legend>Destination <span className="required">*</span> </legend>

                        <div className="form-row">

                        {/* DISTRICT */}
                        <div className="input-group">
                            <label htmlFor="district">
                                Starting District
                            </label><br></br>
                            <select id="district" name="district" defaultValue="" required>
                                <option value="" disabled hidden>Select...</option>

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
                                Ending District
                            </label><br></br>
                            <select id="district" name="district" defaultValue="" required>
                                <option value="" disabled hidden>Select...</option>

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

                        </div>

                        </fieldset>

                        <fieldset className="form-fieldset">

                        <legend>Category <span className="required">*</span> </legend>

                        {/* INTERESTS */}
                        <div className="input-group">
                            {/* <label>
                                Interests <span className="required">*</span>
                            </label><br></br> */}

                            <div className="checkbox-group">
                                <div className="checkbox">
                                    <input type="checkbox" id="interest5" name="interest5" value="any" defaultChecked />
                                    <label htmlFor="interest5"> Any </label>
                                </div> 
                                <div className="checkbox">
                                    <input type="checkbox" id="interest1" name="interest1" value="adventure" />
                                    <label htmlFor="interest1"> Adventure </label>
                                </div>
                                <div className="checkbox">
                                    <input type="checkbox" id="interest2" name="interest2" value="nature" />
                                    <label htmlFor="interest2"> Nature </label>
                                </div>
                                <div className="checkbox">
                                    <input type="checkbox" id="interest3" name="interest3" value="cultural" />
                                    <label htmlFor="interest3"> Cultural </label>
                                </div>
                                <div className="checkbox">
                                    <input type="checkbox" id="interest4" name="interest4" value="religious" />
                                    <label htmlFor="interest4"> Religious </label>
                                </div>
                            </div>
                        </div>

                        </fieldset>

                        <fieldset className="form-fieldset">

                        <legend>Mobility Type <span className="required">*</span> </legend>

                        {/* MOBILITY TYPE */}
                        <div className="input-group">
                            {/* <label>
                                Type <span className="required">*</span>
                            </label> */}

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

                        </fieldset>

                        <fieldset className="form-fieldset">

                        <legend>Budget(NPR) <span className="required">*</span> </legend>

                        <div className="form-row">

                        {/* TRIP BUDGET */}
                        <div className="input-group">
                            <label htmlFor="budget">
                                Trip Budget
                            </label><br></br>
                            {/* <label htmlFor="minimumBudget">Minimum:</label><input type="number" name="minBudget" placeholder="Minimum Budget" min="1000" step="1000" />
                            <label htmlFor="maximumBudget">Maximum:</label><input type="number" name="maxBudget" placeholder="Maximum Budget" min="2000" max="20000" step="1000" /> */}
                            
                            <input type="number" name="trip budget" placeholder="e.g. 5000" min="1000" step="1000" />
                        </div>

                        {/* HOTEL BUDGET */}
                        <div className="input-group">
                            <label htmlFor="hotelBudget">
                                Hotel Budget
                            </label>

                            <input type="number" name="hotel budget" placeholder="e.g. 4000" min="1000" step="1000" />
                        </div>

                        </div>

                        </fieldset>

                        <fieldset className="form-fieldset">

                        <legend>Schedule <span className="required">*</span> </legend>

                        <div className="form-row">

                        {/*  TRAVEL Date */}
                        <div className="input-group">
                            <label htmlFor="travelDate">Travel Date </label><br></br>
                            <input type="date" id="travelDate" name="travelDate" required />
                        </div>

                        {/* TRIP DURATION */}
                        <div className="input-group">
                            <label htmlFor="duration">Trip Duration </label><br></br>
                            <input type="number" placeholder="No. of days" id="duration" name="duration" min="1" required />
                        </div>

                        </div>

                        </fieldset>

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