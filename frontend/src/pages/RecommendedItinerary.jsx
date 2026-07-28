import { useParams, Link } from "react-router-dom";
import recommendedItineraries from "../data/recommendedItineraries";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import "../styles/recommendedDetails.css";

function RecommendedItinerary() {

  const { slug } = useParams();

  const itinerary = recommendedItineraries.find(
    (item) => item.slug === slug
  );

  if (!itinerary) {
    return (
      <>
        <Navbar />

        <section className="itinerary-not-found">
          <h1>Itinerary Not Found</h1>
          <p>The itinerary you are looking for does not exist.</p>

          <Link to="/dashboard" className="back-btn">
            Back to Dashboard
          </Link>
        </section>

        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <section className="recommended-hero">

        <img
          src={itinerary.image}
          alt={itinerary.title}
        />

        <div className="hero-overlay">
            <div className="hero-content">

  <span className="hero-badge">{itinerary.badge}</span>

  <h1>{itinerary.title}</h1>

  <div className="hero-meta">

    <span>{itinerary.duration}</span>

    <span>•</span>

    <span>{itinerary.category}</span>

    <span>•</span>

    <span>{itinerary.difficulty}</span>

  </div>

</div>

          

        </div>

      </section>

      <section className="recommended-overview">

        <h2>Overview</h2>

        <p>{itinerary.overview}</p>

      </section>

      <section className="quick-facts">

  <h2>Quick Facts</h2>

  <div className="facts-grid">

    <div className="fact-card">
      <span></span>
      <h4>Duration</h4>
      <p>{itinerary.duration}</p>
    </div>

    <div className="fact-card">
      <span></span>
      <h4>Difficulty</h4>
      <p>{itinerary.difficulty}</p>
    </div>

    <div className="fact-card">
      <span></span>
      <h4>Best Season</h4>
      <p>{itinerary.bestSeason}</p>
    </div>

    <div className="fact-card">
      <span></span>
      <h4>Transportation</h4>
      <p>{itinerary.transportation}</p>
    </div>

    <div className="fact-card">
      <span></span>
      <h4>Start</h4>
      <p>{itinerary.startingPoint}</p>
    </div>

    <div className="fact-card">
      <span></span>
      <h4>End</h4>
      <p>{itinerary.endingPoint}</p>
    </div>

  </div>

</section>

<section className="highlights">

    <h2>Destination Highlights</h2>

    <div className="highlight-grid">
        {itinerary.highlights?.map((item, index) => (

  <div
    key={index}
    className="highlight-card"
  >
     {item}
  </div>

))}
    </div>

</section>

<section className="timeline-section">

  <h2>Detailed Itinerary</h2>

  {itinerary.days?.map((day) => (

    <div className="day-card" key={day.day}>

      <div className="day-header">

        <h3>Day {day.day}</h3>

        <h4>{day.title}</h4>

      </div>

      <div className="timeline-grid">

        <div className="timeline-box">

          <h4> Morning</h4>

          <span>{day.morning.time}</span>

          <ul>

            {day.morning?.activities?.map((activity,index)=>(

              <li key={index}>{activity}</li>

            ))}

          </ul>

        </div>

        <div className="timeline-box">

          <h4> Afternoon</h4>

          <span>{day.afternoon.time}</span>

          <ul>

            {day.afternoon?.activities?.map((activity,index)=>(

              <li key={index}>{activity}</li>

            ))}

          </ul>

        </div>

        <div className="timeline-box">

          <h4> Evening</h4>

          <span>{day.evening.time}</span>

          <ul>

            {day.evening?.activities?.map((activity,index)=>(

              <li key={index}>{activity}</li>

            ))}

          </ul>

        </div>

      </div>

      {day.hotel && (

        <div className="hotel-card">

          <h3> Recommended Hotel</h3>

          <h4>{day.hotel.rating} {day.hotel.name}</h4>

          <p> {day.hotel.location}</p>

          <p>{day.hotel.description}</p>

        </div>

      )}

    </div>

  ))}

</section>

<section className="include-exclude">

  <div className="include-card">

    <h2>What's Included</h2>

    <ul>

      {itinerary.included?.map((item,index)=>(

        <li key={index}>{item}</li>

      ))}

    </ul>

  </div>

  <div className="exclude-card">

    <h2>What's Excluded</h2>

    <ul>

      {itinerary.excluded?.map((item,index)=>(

        <li key={index}> {item}</li>

      ))}

    </ul>

  </div>

</section>

<section className="packing-section">

  <h2>Packing Checklist</h2>

  <div className="packing-grid">

    {itinerary.packing?.map((item,index)=>(

      <div
        key={index}
        className="packing-item"
      >

         {item}

      </div>

    ))}

  </div>

</section>

<section className="tips-section">

  <h2>Travel Tips</h2>

  <div className="tips-grid">

    {itinerary.tips?.map((tip,index)=>(

      <div
        key={index}
        className="tip-card"
      >

         {tip}

      </div>

    ))}

  </div>

</section>

<section className="gallery-section">

  <h2>Photo Gallery</h2>

  <div className="gallery-grid">

    {itinerary.gallery?.map((image,index)=>(

      <img
        key={index}
        src={image}
        alt={itinerary.title}
      />

    ))}

  </div>

</section>

<div className="back-wrapper">

  <Link
    to="/dashboard"
    className="back-btn"
  >

    ← Back to Dashboard

  </Link>

</div>

      <Footer />
    </>
  );
}

export default RecommendedItinerary;