import "../styles/dashboard.css";
import { useState, useEffect } from "react";

const api={
  key: "895e4f1b43b1bc4b2bda5c1d9153e560",
  base: "https://api.openweathermap.org/data/2.5/",
}

function WeatherSection() {
  const [search, setSearch] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [error, setError] = useState("");

  //search result weather and forecast display//
  const searchPressed = () => {
    //prevents empty search//
    if (!search.trim()) return;
    fetch(`${api.base}weather?q=${search}&units=metric&APPID=${api.key}`)
    .then((res) => res.json())
    .then((result) => {

      if (result.cod === 200) {
        setWeather(result);
        setError("");

        fetch(`${api.base}forecast?q=${search}&units=metric&APPID=${api.key}`)
        .then((res) => res.json())
        .then((result) => {
          setForecast(result.list.slice(0, 23));
        });
      } else {
          setError("Location not found!");
        }
      });
  };

  //default Kathmandu weather and forecast display//
  useEffect(() => {
    fetch(`${api.base}weather?q=Kathmandu&units=metric&APPID=${api.key}`)
      .then((res) => res.json())
      .then((result) => {
        setWeather(result);
      });

      fetch(`${api.base}forecast?q=Kathmandu&units=metric&APPID=${api.key}`)
        .then((res) => res.json())
        .then((result) => {
          setForecast(result.list.slice(0, 23));
        });
  }, []);

  //weather background images//
  const getBackground = () => {
    if (!weather) return "/images/weatherbg.jpg";

    const condition = weather.weather[0].main;

    switch (condition) {
      case "Clouds":
        return "/images/cloudy.jpg";

      case "Rain":
        return "/images/rain.jpg";

      case "Snow":
        return "/images/snow.jpg";

      case "Clear":
        return "/images/clear.jpg";

      default:
        return "/images/weatherbg.jpg";
    }
  };

  //weather emojis//
  const getWeatherEmoji = (condition) => {
    switch (condition) {
      case "Clear":
        return "☀️";

      case "Clouds":
        return "☁️";

      case "Rain":
        return "🌧️";

      case "Thunderstorm":
        return "⛈️";

      case "Snow":
        return "❄️";

      case "Mist":
      case "Fog":
      case "Haze":
        return "🌫️";

      default:
        return "🌤️";
    }
  };

  return (
    <section className="weather-section">
      
      <h1>Current Weather</h1>

      <div className="weather-card" 
        style={{backgroundImage: `url(${getBackground()})`,}}>

        <div className="weather-overlay">

          {/* search box */}
          <div className="search">
            <input type="text" placeholder="Enter location.." onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchPressed()} />

            <button onClick={searchPressed}>
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
          </div>

          {/* error message */}
          {error && (
            <div className="error-box">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{error}</span>
            </div>
          )}

          {/* search location weather forecast display */}
          {weather && weather.main && (
            <>
              <h3>{weather.name}</h3>
              <div className="weather-header">

                <div className="temperature">
                  {Math.round(weather.main.temp)}°C
                </div>

                {/* <img src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`} alt="weather icon" /> */}
                <div className="weather-emoji">
                  {getWeatherEmoji(weather.weather[0].main)}
                </div>
              
                <div className="condition">
                  {weather.weather[0].description}
                </div>

              </div>
              
              <div className="weather-details">

                <div>
                  <i className="fa-solid fa-wind"></i>
                  {weather.wind.speed} m/s
                </div>

                <div>
                  <i className="fa-solid fa-droplet"></i>
                  {weather.main.humidity}%
                </div>

                <div>
                  <i className="fa-solid fa-gauge"></i>
                  {weather.main.pressure} hPa
                </div>

              </div>
            </>
          )}

          <div className="forecast-wrapper">

            <button className="scroll-btn left" onClick={() =>
              document
                .querySelector(".forecast-container")
                .scrollBy({ left: -250, behavior: "smooth" })
              }
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>

            <div className="forecast-container">

              {forecast.map((item, index) => (
                <div className="forecast-card" key={index}>

                  <p className="forecast-time">
                    {new Date(item.dt_txt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </p>

                  {/* <img src={`https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`} alt="weather icon" /> */}
                  <div className="forecast-emoji">
                    {getWeatherEmoji(item.weather[0].main)}
                  </div>

                  <p className="forecast-temp">
                    {Math.round(item.main.temp)}°C
                  </p>

                </div>
              ))}

            </div>

             <button className="scroll-btn right" onClick={() =>
                document
                  .querySelector(".forecast-container")
                  .scrollBy({ left: 250, behavior: "smooth" })
                }
              >
              <i className="fa-solid fa-chevron-right"></i>
            </button>

          </div>

        </div>

      </div>
      
    </section>
  );
}

export default WeatherSection;