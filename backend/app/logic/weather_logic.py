def get_weather(city: str):

    weather_data = {
        "Kathmandu": {
            "temperature": 28,
            "condition": "Sunny"
        },
        "Pokhara": {
            "temperature": 25,
            "condition": "Cloudy"
        },
        "Chitwan": {
            "temperature": 32,
            "condition": "Hot"
        }
    }

    if city in weather_data:
        return weather_data[city]

    return {
        "temperature": "Unknown",
        "condition": "No data available"
    }