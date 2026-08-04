import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import TransportCard from "../components/TransportCard";

import "../styles/transport.css";

import { getTransport } from "../services/transportService";

function Transport() {

    const navigate = useNavigate();
    const location = useLocation();
    const preferenceId = location.state?.preferenceId || 2;

    const [transportData, setTransportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {

        if (!preferenceId) {
            setError("No itinerary selected.");
            setLoading(false);
            return;
        }

        loadTransport();

    }, []);

    async function loadTransport() {

        try {

            const response = await getTransport(preferenceId);

            setTransportData(response);

        } catch (err) {

            console.error("Transport Error:", err);
            console.error("Response:", err.response);
            console.error("Data:", err.response?.data);

            setError(err.response?.data?.detail || err.message);

        } finally {

            setLoading(false);

        }

    }

    return (

        <>
            <Navbar />

            <div className="transport-page">

                <div className="transport-header">

                    <h1>Recommended Transport</h1>

                    <p>
                        Transportation options based on your generated itinerary.
                    </p>

                </div>

                {loading && (

                    <div className="loading-box">

                        Loading transport...

                    </div>

                )}

                {!loading && error && (

                    <div className="error-box">

                        {error}

                    </div>

                )}

                {!loading && !error && transportData && (

                    <>

                        <section className="transport-section">

                            <h2>
                                Outbound Journey
                            </h2>

                            {transportData.outbound_transport.length === 0 ? (

                                <p>No outbound transport available.</p>

                            ) : (

                                transportData.outbound_transport.map((item) => (

                                    <TransportCard
                                        key={item.transport_id}
                                        transport={item}
                                    />

                                ))

                            )}

                        </section>

                        <section className="transport-section">

                            <h2>
                                Return Journey
                            </h2>

                            {transportData.return_transport.length === 0 ? (

                                <p>No return transport available.</p>

                            ) : (

                                transportData.return_transport.map((item) => (

                                    <TransportCard
                                        key={item.transport_id}
                                        transport={item}
                                    />

                                ))

                            )}

                        </section>

                    </>

                )}

                <div className="transport-actions">

                    <button
                        className="transport-btn"
                        onClick={() => navigate(-1)}
                    >
                        ← Back to Itinerary
                    </button>

                </div>

            </div>

            <Footer />

        </>

    );

}

export default Transport;
