# db.py
import psycopg2

# 🔥 UPDATE THIS WITH YOUR SUPABASE CONNECTION STRING
# You can find this in Supabase Dashboard -> Settings -> Database -> Connection string (URI)
DB_CONFIG = {
    "dbname": "postgres", # Usually 'postgres' in Supabase
    "user": "postgres",   # Usually 'postgres' in Supabase
    "password": "CAPSTONE@1234@",
    "host": "db.fzmwbkmbumgfmqelvmjo.supabase.co", # Your Supabase host
    "port": "5432"
}

def get_connection():
    return psycopg2.connect(**DB_CONFIG)

def create_database():
    """Creates the new Forecast table in Supabase"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS weather (
        id SERIAL PRIMARY KEY,
        district_name TEXT,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        forecast_date DATE,          
        weather_code INTEGER,        
        temp_max DOUBLE PRECISION,
        temp_min DOUBLE PRECISION,
        precipitation_sum DOUBLE PRECISION,
        rain_sum DOUBLE PRECISION,
        snowfall_sum DOUBLE PRECISION,
        wind_speed_max DOUBLE PRECISION,
        is_bad_weather BOOLEAN,      
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(district_name, forecast_date) 
    )
    """)
    conn.commit()
    cursor.close()
    conn.close()
    print("Weather table ready.")

def load_forecast_to_db(rows):
    """Inserts multiple rows of forecast data, updating if the date already exists"""
    conn = get_connection()
    cursor = conn.cursor()

    query = """
    INSERT INTO weather (
        district_name, latitude, longitude, forecast_date,
        weather_code, temp_max, temp_min, precipitation_sum,
        rain_sum, snowfall_sum, wind_speed_max, is_bad_weather
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (district_name, forecast_date) 
    DO UPDATE SET
        weather_code = EXCLUDED.weather_code,
        temp_max = EXCLUDED.temp_max,
        precipitation_sum = EXCLUDED.precipitation_sum,
        is_bad_weather = EXCLUDED.is_bad_weather,
        updated_at = CURRENT_TIMESTAMP;
    """

    values = [
        (
            r['district_name'], r['latitude'], r['longitude'], r['forecast_date'],
            r['weather_code'], r['temp_max'], r['temp_min'], r['precipitation_sum'],
            r['rain_sum'], r['snowfall_sum'], r['wind_speed_max'], r['is_bad_weather']
        )
        for r in rows
    ]
    
    cursor.executemany(query, values)
    conn.commit()
    cursor.close()
    conn.close()
