import os
import requests
from flask import Flask, jsonify, request, render_template
from dotenv import load_dotenv
import urllib.parse
from datetime import datetime
import logging
from logging.handlers import RotatingFileHandler

# Load environment variables from .env file
load_dotenv(dotenv_path="venv/.env")

app = Flask(__name__)

# Configure logging
def setup_logging():
    if not os.path.exists('logs'):
        os.mkdir('logs')
    file_handler = RotatingFileHandler('logs/greencommute.log', maxBytes=10240, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)

# Setup logging when the app starts
setup_logging()

# API keys from environment variables
OPENWEATHER_API_KEY = os.environ.get("OPENWEATHER_API_KEY")
MAPBOX_API_KEY = os.environ.get("MAPBOX_API_KEY")
app.logger.info(f"MAPBOX_API_KEY: {MAPBOX_API_KEY}")
# Comprehensive carbon footprint constants (kg CO2 per passenger-km)
CARBON_FOOTPRINTS = {
    "car": 0.192,       # Average passenger car
    "electric_car": 0.096,  # Electric car (assuming clean energy mix)
    "bus": 0.105,       # Average city bus
    "train": 0.041,     # Average train
    "subway": 0.035,    # Subway/metro
    "walking": 0.0,     # No emissions
    "cycling": 0.0      # No direct emissions
}

# Transportation cost estimation factors ($ per km)
COST_FACTORS = {
    "car": 0.25,        # Fuel, maintenance, depreciation
    "electric_car": 0.15,  # Lower fuel costs
    "bus": 0.10,        # Public transit fare
    "train": 0.15,      # Train ticket
    "subway": 0.08,     # Subway/metro fare
    "walking": 0.0,     # Free
    "cycling": 0.02     # Bike maintenance
}

def geocode_location(location):
    """
    Convert a location name to coordinates using Mapbox Geocoding API.

    :param location: String representing a location name
    :return: Coordinates as a comma-separated string or None
    """
    try:
        encoded_location = urllib.parse.quote(location)
        geocode_url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{encoded_location}.json?access_token={MAPBOX_API_KEY}"

        response = requests.get(geocode_url)
        response.raise_for_status()

        data = response.json()

        if "features" in data and data["features"]:
            coordinates = data["features"][0]["center"]
            return f"{coordinates[0]},{coordinates[1]}"

        app.logger.warning(f"No geocoding results for location: {location}")
        return None

    except requests.RequestException as e:
        app.logger.error(f"Geocoding error for {location}: {e}")
        return None

def ensure_coordinates(location):
    """
    Validate and convert location to coordinates.

    :param location: Location name or coordinates
    :return: Coordinates as a string or None
    """
    # Check if location is already in coordinate format
    try:
        parts = location.split(',')
        if len(parts) == 2:
            float(parts[0].strip())
            float(parts[1].strip())
            return location
    except (ValueError, TypeError):
        pass

    # If not coordinates, try geocoding
    return geocode_location(location)

def calculate_emissions_savings(distance_km, transport_mode):
    """
    Calculate CO2 emissions and savings for a given transport mode.

    :param distance_km: Distance traveled in kilometers
    :param transport_mode: Mode of transportation
    :return: Dictionary with emissions and savings data
    """
    # Baseline emissions (car as reference)
    baseline_emissions = distance_km * CARBON_FOOTPRINTS.get("car", 0.192)

    # Current mode emissions
    current_emissions = distance_km * CARBON_FOOTPRINTS.get(transport_mode, 0.192)

    # Calculate savings
    emissions_saved_kg = max(baseline_emissions - current_emissions, 0)
    savings_percentage = (emissions_saved_kg / baseline_emissions) * 100 if baseline_emissions > 0 else 0

    return {
        "baseline_emissions_kg": round(baseline_emissions, 2),
        "current_emissions_kg": round(current_emissions, 2),
        "emissions_saved_kg": round(emissions_saved_kg, 2),
        "savings_percentage": round(savings_percentage, 2)
    }

def get_route_data(origin, destination, mode):
    """
    Fetch route data from Mapbox Directions API with comprehensive calculations.
    Ensures geometry is always included or generated.
    """
    origin_coords = ensure_coordinates(origin)
    destination_coords = ensure_coordinates(destination)

    if not origin_coords or not destination_coords:
        app.logger.error(f"Could not resolve coordinates for {origin} or {destination}")
        return None

    # Map frontend modes to Mapbox routing modes
    mapbox_modes = {
        "car": "driving",
        "walking": "walking",
        "cycling": "cycling"
    }
    mapbox_mode = mapbox_modes.get(mode, "driving")

    url = (
        f"https://api.mapbox.com/directions/v5/mapbox/{mapbox_mode}/"
        f"{origin_coords};{destination_coords}?access_token={MAPBOX_API_KEY}&geometries=geojson"
    )

    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        # Check if routes exist
        if not data.get("routes"):
            # If no routes, generate a simple linear geometry
            origin_point = list(map(float, origin_coords.split(',')))
            dest_point = list(map(float, destination_coords.split(',')))

            # Create a simple line geometry
            simple_geometry = {
                "type": "LineString",
                "coordinates": [origin_point, dest_point]
            }

            distance_km = haversine_distance(
                origin_point[1], origin_point[0],
                dest_point[1], dest_point[0]
            )

            duration_minutes = distance_km / (mode_speeds.get(mode, 5))  # Estimate duration based on mode

            return {
                "mode": mode,
                "duration_minutes": round(duration_minutes, 1),
                "distance_km": round(distance_km, 2),
                "geometry": simple_geometry,
                "cost_estimate": round(distance_km * COST_FACTORS.get(mode, 0.20), 2),
                **calculate_emissions_savings(distance_km, mode),
                "route_summary": f"{mode.capitalize()} route from {origin} to {destination}"
            }

        route = data["routes"][0]
        distance_km = route["distance"] / 1000
        duration_minutes = route["duration"] / 60

        # Comprehensive emissions calculations
        emissions_data = calculate_emissions_savings(distance_km, mode)

        return {
            "mode": mode,
            "duration_minutes": round(duration_minutes, 1),
            "distance_km": round(distance_km, 2),
            "geometry": route.get("geometry", {
                "type": "LineString",
                "coordinates": []
            }),
            "cost_estimate": round(distance_km * COST_FACTORS.get(mode, 0.20), 2),
            **emissions_data,
            "route_summary": f"{mode.capitalize()} route from {origin} to {destination}"
        }

    except requests.RequestException as e:
        app.logger.error(f"Route API error for {mode} route: {e}")
        return None

# Helper function to calculate distance
def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points
    on the earth's surface in kilometers.
    """
    from math import radians, sin, cos, sqrt, atan2

    R = 6371  # Earth's radius in kilometers

    # Convert degrees to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    distance = R * c

    return distance

# Estimated speeds for different modes (km/h)
mode_speeds = {
    "walking": 5,
    "cycling": 15,
    "car": 60,
    "bus": 30,
    "train": 80
}

def get_weather(lat, lon):
    """
    Fetch current weather data from OpenWeatherMap API.

    :param lat: Latitude
    :param lon: Longitude
    :return: Dictionary with weather details
    """
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"

    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        return {
            "city": data["name"],
            "temperature": round(data["main"]["temp"], 1),
            "description": data["weather"][0]["description"],
            "icon": data["weather"][0]["icon"],
            "humidity": data["main"]["humidity"],
            "wind_speed": round(data["wind"]["speed"], 1)
        }

    except requests.RequestException as e:
        app.logger.error(f"Weather API error: {e}")
        return None

@app.route('/')
def index():
    """Render the main page of the application."""
    return render_template('index.html')

@app.route('/api/route')
def get_route():
    """Calculate route options for different transportation modes."""
    origin = request.args.get('origin')
    destination = request.args.get('destination')

    if not origin or not destination:
        return jsonify({"success": False, "error": "Origin and destination are required"}), 400

    transport_modes = ["car", "walking", "cycling"]
    route_options = []

    for mode in transport_modes:
        route_data = get_route_data(origin, destination, mode)
        if route_data:
            route_options.append(route_data)

    if not route_options:
        return jsonify({"success": False, "error": "No routes found"}), 404

    return jsonify({
        "success": True,
        "origin": origin,
        "destination": destination,
        "options": route_options
    })

@app.route('/api/geocode')
def geocode_locations():
    """
    Geocode multiple locations.

    Accepts a comma-separated string of locations.
    Returns coordinates for those locations.
    """
    locations_str = request.args.get('location', '')
    locations = [loc.strip() for loc in locations_str.split(',')]

    if not locations or len(locations) < 2:
        return jsonify({
            "success": False,
            "error": "At least two locations are required"
        }), 400

    try:
        coordinates = []
        for location in locations:
            coord = geocode_location(location)
            if not coord:
                return jsonify({
                    "success": False,
                    "error": f"Could not geocode location: {location}"
                }), 404

            # Parse the coordinate string into a list
            lon, lat = map(float, coord.split(','))
            coordinates.append([lon, lat])

        return jsonify({
            "success": True,
            "coordinates": coordinates
        })

    except Exception as e:
        app.logger.error(f"Geocoding error: {e}")
        return jsonify({
            "success": False,
            "error": "Error processing locations"
        }), 500

@app.route('/api/weather')
def fetch_weather():
    """Get weather data for given coordinates."""
    lat = request.args.get('lat')
    lon = request.args.get('lon')

    if not lat or not lon:
        return jsonify({"success": False, "error": "Latitude and longitude required"}), 400

    weather_data = get_weather(lat, lon)

    if not weather_data:
        return jsonify({"success": False, "error": "Could not fetch weather data"}), 500

    return jsonify({"success": True, "weather": weather_data})

@app.route('/health')
def health_check():
    """Health check endpoint for load balancer."""
    server_id = os.environ.get("SERVER_ID", "unknown")
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "server_id": server_id
    })

if __name__ == '__main__':
    # Default to port 5000 if PORT env var is not set
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
