import { useState } from "react";

import ItineraryCard from "./ItineraryCard";

import amayangriImg from "/images/amayangri.jpg";
import chitwanImg from "/images/chitwan.jpg";
import chandragiriImg from "/images/chandragiri.jpg";
import changunarayanImg from "/images/changunarayan.jpg";
import bhaktapurImg from "/images/mybhaktapur.jpg";


function ItinerarySection() {

  const itineraries = [
    {
      title: "Aama Yangri Trek",
      image: amayangriImg,
      description: "Scenic hiking spot with beautiful view"
    },

    {
      title: "Chitwan National Park",
      image: chitwanImg,
      description: "Wildlife Safari Experience"
    },

    {
      title: "Chandragiri Hills",
      image: chandragiriImg,
      description: "Cable car ride and stunning Himalayan panoramas"
    },

    {
      title: "Changunarayan Temple",
      image: changunarayanImg,
      description: "Ancient UNESCO-listed temple rich in history and art"
    },

    {
      title: "Bhaktapur Durbar Square",
      image: bhaktapurImg,
      description: "Living museum of ancient Newar architecture"
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

        <div className="itinerary-cards">

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