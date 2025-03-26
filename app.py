# app.py
import os
import requests
from flask import Flask, jsonify, request, render_template
from dotenv import load_dotenv
import json
from datetime import datetime

# Load environment variables from .env file
load_dotenv()

class PrefixMiddleware:
    def __init__(self, app, prefix=''):
        self.app = app
        self.prefix = prefix

    def __call__(self, environ, start_response):
        if self.prefix:
            environ['SCRIPT_NAME'] = self.prefix
            path_info = environ['PATH_INFO']
            if path_info.startswith(self.prefix):
                environ['PATH_INFO'] = path_info[len(self.prefix):]
        return self.app(environ, start_response)

app = Flask(__name__)

# API keys from environment variables
OPENWEATHER_API_KEY = os.environ.get("dcea93c74219e2e2221e2f6f33a0a75d")
MAPBOX_API_KEY = os.environ.get("sk.eyJ1IjoiYnVsbGVyIiwiYSI6ImNtOG10d2F5eTFod3UyaXF5bDlqaXVuNzEifQ.-fJidcPTSPwE_r_OK0gVLg")

# Carbon footprint constants (kg CO2 per km)
CARBON_FOOTPRINTS = {
    "car": 0.192,
    "bus": 0.105,
    "train": 0.041,
    "bike": 0.0,
    "walk": 0.0
}

@app.route('/')
def index():
    """Render the main page of the application."""
    return render_template('index.html')

@app.route('/api/weather', methods=['GET'])
def get_weather():
    lat = request.args.get('lat')
    lon = request.args.get('lon')

    if not lat or not lon:
        return jsonify({"success": False, "error": "Latitude and longitude required"}), 400

    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"

    try:
        response = requests.get(url)
        data = response.json()

        if response.status_code != 200:
            return jsonify({"success": False, "error": data.get("message", "Weather API error")}), response.status_code

        return jsonify({"success": True, "weather": data})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/route')
def get_route():
    """Calculate route between origin and destination with different transport modes."""
    origin = request.args.get('origin')
    destination = request.args.get('destination')
    
    if not origin or not destination:
        return jsonify({
            "success": False, 
            "error": "Origin and destination are required."
        }), 400
    
    # In a production app, you'd use the Mapbox Directions API
    # Here we'll simulate route data for demonstration purposes
    
    # Simulate different transport options with varying times and distances
    transport_options = [
        {
            "mode": "car",
            "duration_minutes": 25,
            "distance_km": 12.5,
            "carbon_kg": 12.5 * CARBON_FOOTPRINTS["car"],
            "cost_estimate": 5.50,
            "route_summary": f"Drive from {origin} to {destination}"
        },
        {
            "mode": "bus",
            "duration_minutes": 40,
            "distance_km": 13.2,
            "carbon_kg": 13.2 * CARBON_FOOTPRINTS["bus"],
            "cost_estimate": 2.00,
            "route_summary": f"Take bus route 42 from {origin} to {destination}"
        },
        {
            "mode": "train",
            "duration_minutes": 30,
            "distance_km": 15.0,
            "carbon_kg": 15.0 * CARBON_FOOTPRINTS["train"],
            "cost_estimate": 3.50,
            "route_summary": f"Take the train from {origin} station to {destination} station"
        },
        {
            "mode": "bike",
            "duration_minutes": 55,
            "distance_km": 10.8,
            "carbon_kg": 10.8 * CARBON_FOOTPRINTS["bike"],
            "cost_estimate": 0.00,
            "route_summary": f"Cycle from {origin} to {destination}"
        },
        {
            "mode": "walk",
            "duration_minutes": 155,
            "distance_km": 10.5,
            "carbon_kg": 10.5 * CARBON_FOOTPRINTS["walk"],
            "cost_estimate": 0.00,
            "route_summary": f"Walk from {origin} to {destination}"
        }
    ]
    
    # Calculate car emissions as baseline for CO2 savings
    car_emissions = transport_options[0]["carbon_kg"]
    
    # Calculate CO2 savings for each option
    for option in transport_options:
        option["carbon_saved_kg"] = car_emissions - option["carbon_kg"]
        option["carbon_saved_percentage"] = (option["carbon_saved_kg"] / car_emissions * 100) if car_emissions > 0 else 0
    
    return jsonify({
        "success": True,
        "origin": origin,
        "destination": destination,
        "options": transport_options
    })

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
    app.wsgi_app = PrefixMiddleware(app.wsgi_app, prefix=os.environ.get('SCRIPT_NAME', ''))

