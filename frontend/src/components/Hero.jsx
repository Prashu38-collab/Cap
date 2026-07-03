import { Link } from "react-router-dom";

function Hero() {
  return (
    <section className="hero">

      {/* <div className="overlay"></div> */}

      <div className="container">

        <h1>Go Travel Nepal</h1>

        <p>We got your back!</p>

        <div className="action">
            <Link to="/plantrip" className="start">
              Plan My Trip
            </Link>
        </div>

      </div>

    </section>
  );
}

export default Hero;