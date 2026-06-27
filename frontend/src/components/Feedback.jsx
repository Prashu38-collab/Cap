import { useState, useEffect } from "react";

function Feedback() {

    const [current, setCurrent] = useState(0);
    
    const feedbacks = [
        {
        name: "Sarah Johnson",
        image: "/images/user1.jpg",
        rating: 5,
        feedback: "The itinerary planner helped us explore Kathmandu, Lalitpur, and Bhaktapur effortlessly. Every recommendation matched our interests perfectly, and the suggested attractions, accommodations, and transportation options saved us a lot of time. Our trip to Nepal turned out exactly how we had imagined, making the entire experience enjoyable and stress-free."
        },

        {
        name: "John Raj Vaidya",
        image: "/images/user2.jpg",
        rating: 4,
        feedback: "The weather information and interactive map were extremely useful throughout our journey. Being able to check weather conditions and locate destinations in one place helped us plan our daily activities more efficiently. We also found comfortable hotels and reliable transportation options that fit our budget, making the trip both enjoyable and convenient."
        },

        {
        name: "Shubham Pokhrel",
        image: "/images/user3.jpg",
        rating: 5,
        feedback: "A simple and intuitive platform that made planning our family trip incredibly easy. The user-friendly interface allowed us to organize our itinerary quickly, even with very little time to prepare. We were especially impressed by the personalized recommendations, and we are grateful that Go Travel helped make our last-minute vacation a memorable success."
        },

        {
        name: "Aarti Bishwokarma",
        image: "/images/user4.jpg",
        rating: 4,
        feedback: "The destination recommendations helped us discover several amazing places that we might not have discovered otherwise. The detailed information about attractions, accommodations, and travel options made decision-making much easier. Our experience with Go Travel exceeded expectations, and we will definitely recommend it to friends and family while looking forward to using it again for future adventures."
        }
    ];
    
    useEffect(() => {

        const interval = setInterval(() => {
            setCurrent((prev) =>
            (prev + 1) % feedbacks.length
            );
        }, 7000);

        return () => clearInterval(interval);

    }, []);

    return (
    <section className="feedback-section">

        <h1>What our Clients are Saying</h1>

        <div className="feedback-container">

            <div className="feedback-card" >

                <img src={feedbacks[current].image} alt={feedbacks[current].name} />
                <h3>{feedbacks[current].name}</h3>
                <div className="feedback-stars">
                {"★".repeat(feedbacks[current].rating)}
                </div>
                <p>{feedbacks[current].feedback}</p>

            </div>

        </div>

        <div className="feedback-dots">
            {feedbacks.map((_, index) => (
                <span key={index} className={
                    current === index
                    ? "dot active"
                    : "dot"
                }

                onClick={() => setCurrent(index)}
                />
            ))}
        </div>

    </section>
    );
}

export default Feedback;