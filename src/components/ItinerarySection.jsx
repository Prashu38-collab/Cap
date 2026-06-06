import { useState } from "react";

import ItineraryCard from "./ItineraryCard";

import pokharaImg from "/images/pokhara.jpg";
import chitwanImg from "/images/chitwan.jpg";
import abcImg from "/images/ABC.jpg";
import bhaktapurImg from "/images/bhaktapur.jpg";


function ItinerarySection() {

  const itineraries = [
    {
      title: "Pokhara Adventure",
      image: pokharaImg,
      description: "Adventure Activities in Pokhara"
    },

    {
      title: "Chitwan Safari",
      image: chitwanImg,
      description: "Wildlife Safari Experience"
    },

    {
      title: "ABC Trek",
      image: abcImg,
      description: "Amazing Trekking Journey"
    },

    {
      title: "Bhaktapur Durbar Square",
      image: bhaktapurImg,
      description: "Khwopa, Open Museum"
    }
  ];

  const [startIndex, setStartIndex] = useState(0);

  const nextSlide = () => {
    if (startIndex < itineraries.length - 3) {
      setStartIndex(startIndex + 1);
    }
  };

  const prevSlide = () => {
    if (startIndex > 0) {
      setStartIndex(startIndex - 1);
    }
  };

  return (

    <section className="itinerary-section">

      <h1>Recommended Itineraries</h1>

      <div className="itinerary-container">

        <button
          className="carousel-btn left"
          onClick={prevSlide}
        >
          ❮
        </button>

        <div className="card">

          {itineraries
          .slice(startIndex, startIndex + 3)
          .map((item, index) => (
            <ItineraryCard
              key={index}
              title={item.title}
              image={item.image}
              description={item.description}
            />
          ))}

        </div>

        <button
          className="carousel-btn right"
          onClick={nextSlide}
        >
          ❯
        </button>

      </div>

    </section>

  );
}

export default ItinerarySection;