# GreenCommute

GreenCommute is a web application designed to promote eco-friendly commuting options. It helps users find eco-friendly transportation routes, and monitor their carbon footprint, addressing the need for sustainable urban mobility.

## Features

- Transport Routes: Transportation information using an external API.
- **Carbon Footprint Tracker**: Estimates CO2 emissions based on travel habits.
- **Sorting & Filtering**: Users can filter rides by location, time, and available seats.
- **Secure Authentication**: User data is securely stored and managed.

---
## API Usage

This application integrates the **Google Maps API** for geolocation and route mapping, ensuring real-time and accurate navigation assistance.

- **API Key Handling:** All API keys are stored securely in environment variables and never hardcoded.
- **Data Fetching:** Retrieves live location and traffic data to improve user experience.
- **Secure Communication:** Requests are made over HTTPS to prevent data interception.

---
## Error Handling

The application includes robust error handling for:

- **API Downtime:** Displays a user-friendly message if data cannot be fetched.
- **Invalid User Input:** Provides clear feedback on incorrect entries.
- **Network Errors:** Retries API requests in case of connection issues.

---
## User Interaction with Data

- **Sorting & Filtering:** Users can search, sort, and filter rides based on distance, cost, and availability.
- **Interactive Maps:** Displays live locations of public transport and carpooling routes.

---
## Deployment

The application is deployed on **NGINX** and served through **Gunicorn**, ensuring high availability and performance.

- **Production Server:** Hosted on an Ubuntu server with HTTPS enabled.
- **Domain:** Accessible via [wamalwa.tech](https://wamalwa.tech).
- **Load Balancer:** Configured to efficiently distribute traffic across multiple instances.

---
## User Experience

- **User Interface:** Designed for intuitive navigation with a clean UI.
- **Data Presentation:** Key information is displayed in an organized and visually appealing manner.

---
## Installation Guide

### 1. Clone the Repository
```sh
 git clone https://github.com/yourusername/GreenCommute.git
 cd GreenCommute
```

### 2. Install Dependencies
```sh
pip install -r requirements.txt
```

### 3. Set Up Environment Variables
Create a `.env` file and add:
```env
SECRET_KEY=your_secret_key
MAPBOX_API_KEY=your_api_key
DATABASE_URL=your_database_url
```

### 4. Start the Application
```sh
gunicorn --workers 3 --bind unix:/home/ubuntu/GreenCommute/greencommute.sock wsgi:app
```

---
## Attribution

- ** Mapbox API**: Used for geolocation services.
- **OpenWeather API**: Provides weather data for commute planning.

---
## Demo Video

A demo video showcasing the application’s features can be found [here](https://youtu.be/jlcbGnITUO0).

---
## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

