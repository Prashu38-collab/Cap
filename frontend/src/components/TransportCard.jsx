import busImage from "../assets/bus.png";
import flightImage from "../assets/flight.png";

import MiniMap from "./MiniMap";

function TransportCard({ transport }) {

    const image =
        transport.transport_type?.toLowerCase() === "flight"
            ? flightImage
            : busImage;

    return (

        <div className="transport-card">

            {/* Left Side */}

            <div className="transport-left">

                <img
                    src={image}
                    alt={transport.transport_type}
                    className="transport-image"
                />

                <span className="transport-type">
                    {transport.transport_type}
                </span>

                <h2 className="transport-operator">
                    {transport.operator}
                </h2>

                <p className="transport-route">
                    {transport.from_district} → {transport.to_district}
                </p>

                <div className="transport-grid">

                    <div className="transport-item">
                        <h4>📍 Departure</h4>
                        <p>{transport.departure_point}</p>
                    </div>

                    <div className="transport-item">
                        <h4>📍 Arrival</h4>
                        <p>{transport.arrival_point}</p>
                    </div>

                    <div className="transport-item">
                        <h4>⏰ Departure Time</h4>
                        <p>{transport.departure_time}</p>
                    </div>

                    <div className="transport-item">
                        <h4>🕒 Duration</h4>
                        <p>{transport.duration}</p>
                    </div>

                    <div className="transport-item">
                        <h4>💰 Cost</h4>
                        <p>NPR {transport.cost_npr}</p>
                    </div>

                    <div className="transport-item">
                        <h4>🛣 Route</h4>
                        <p>{transport.route}</p>
                    </div>

                </div>

            </div>

            {/* Right Side */}

            <div className="transport-right">

                <div className="map-box">

                    <MiniMap
                        latitude={transport.latitude}
                        longitude={transport.longitude}
                        locationName={transport.departure_point}
                    />

                </div>

            </div>

        </div>

    );

}

export default TransportCard;