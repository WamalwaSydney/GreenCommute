document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const routeForm = document.getElementById('routeForm');
    const resultsPanel = document.getElementById('resultsPanel');
    const routeResults = document.getElementById('routeResults');
    const savingsSummary = document.getElementById('savingsSummary');
    const totalSavedCO2 = document.getElementById('totalSavedCO2');
    const treeEquivalent = document.getElementById('treeEquivalent');
    const savingsMessage = document.getElementById('savingsMessage');

    // Sort buttons
    const sortTime = document.getElementById('sortTime');
    const sortCost = document.getElementById('sortCost');
    const sortEco = document.getElementById('sortEco');

    // Weather elements
    const weatherLoading = document.getElementById('weatherLoading');
    const weatherContent = document.getElementById('weatherContent');
    const weatherError = document.getElementById('weatherError');
    const weatherCity = document.getElementById('weatherCity');
    const weatherTemp = document.getElementById('weatherTemp');
    const weatherDesc = document.getElementById('weatherDesc');
    const weatherIcon = document.getElementById('weatherIcon');
    const weatherHumidity = document.getElementById('weatherHumidity');
    const weatherWind = document.getElementById('weatherWind');
    const weatherAdvice = document.getElementById('weatherAdvice');

    // Store the route options
    let routeOptions = [];
    let routeMap;
    let currentRouteLayer;

    // Initialize map when page loads
    initMap();


    // Load weather data on page load
    loadWeatherData();


    // Add event listeners
    routeForm.addEventListener('submit', handleRouteSubmit);
    sortTime.addEventListener('click', () => sortRoutes('time'));
    sortCost.addEventListener('click', () => sortRoutes('cost'));
    sortEco.addEventListener('click', () => sortRoutes('eco'));
    // Add event listener for route selection
    routeResults.addEventListener('click', handleRouteSelection);

    /**
     * Load weather data for the current location
     */
    function loadWeatherData() {
        weatherLoading.style.display = 'block';
        weatherContent.style.display = 'none';
        weatherError.style.display = 'none';

        function fetchWeather() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    position => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;

                        console.log(`Fetching weather for: ${lat}, ${lon}`);

                        fetch(`/api/weather?lat=${lat}&lon=${lon}`)
                            .then(response => response.json())
                            .then(data => {
                                console.log("Weather Data:", data);
                                if (data.success) {
                                    displayWeatherData(data.weather);
                                } else {
                                    throw new Error(data.error || 'Unknown error');
                                }
                            })
                            .catch(error => {
                                console.error('Weather API Error:', error);
                                document.getElementById('weather-error').textContent = 'Could not load weather data. Please try again later.';
                            });
                    },
                    error => {
                        console.error("Geolocation Error:", error);
                        document.getElementById('weather-error').textContent = 'Location access denied. Please allow location to get the weather.';
                    }
                );
            } else {
                console.error("Geolocation not supported");
                document.getElementById('weather-error').textContent = 'Geolocation not supported on this browser.';
            }
        }

        // Call fetchWeather when the page loads
        fetchWeather();

    }

    /**
     * Display weather data in the UI
     */
    function displayWeatherData(weather) {
        weatherCity.textContent = weather.city;
        weatherTemp.textContent = `${Math.round(weather.temperature)}°C`;
        weatherDesc.textContent = capitalizeFirstLetter(weather.description);
        weatherIcon.src = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;
        weatherHumidity.textContent = `${weather.humidity}%`;
        weatherWind.textContent = `${weather.wind_speed} m/s`;

        // Set weather advice based on conditions
        setWeatherAdvice(weather);

        weatherLoading.style.display = 'none';
        weatherContent.style.display = 'block';
    }

    /**
     * Set weather advice based on current conditions
     */
    function setWeatherAdvice(weather) {
        let advice = '';

        if (weather.temperature > 30) {
            advice = 'It\'s very hot! Consider public transportation with air conditioning.';
            weatherAdvice.className = 'alert alert-warning';
        } else if (weather.temperature < 5) {
            advice = 'It\'s quite cold! Bundle up if walking or cycling.';
            weatherAdvice.className = 'alert alert-primary';
        } else if (weather.description.includes('rain') || weather.description.includes('shower')) {
            advice = 'Rain detected! Consider public transport or carpooling today.';
            weatherAdvice.className = 'alert alert-info';
        } else if (weather.wind_speed > 10) {
            advice = 'It\'s windy today! Cycling may require more effort.';
            weatherAdvice.className = 'alert alert-warning';
        } else {
            advice = 'Great weather for eco-friendly options like walking or cycling!';
            weatherAdvice.className = 'alert alert-success';
        }

        weatherAdvice.textContent = advice;
    }

    /**
 * Handle route form submission
 */
    function handleRouteSubmit(event) {
        event.preventDefault();

        const origin = document.getElementById('origin').value;
        const destination = document.getElementById('destination').value;

        console.log('Attempting to find route:', {
            origin: origin,
            destination: destination
        });

        if (!origin || !destination) {
            alert('Please enter both origin and destination');
            return;
        }

        // Show loading indicator
        routeResults.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-success" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Finding the best green routes...</p>
            </div>
        `;
        resultsPanel.style.display = 'block';

        // Fetch route and then process results
        fetchRoute(origin, destination)
            .then(data => {
                console.log('Detailed API Response:', data);

                if (data && data.routes && data.routes.length > 0) {
                    routeOptions = data.routes;
                    displayRouteOptions(routeOptions);
                    updateSavingsSummary(routeOptions);
                } else {
                    console.warn('No routes found', data);
                    routeResults.innerHTML = `
                        <div class="col-12 text-center py-5">
                            <p class="text-danger">No routes found. Possible reasons:
                                <ul>
                                    <li>Locations are too far apart</li>
                                    <li>Locations are invalid</li>
                                    <li>No transportation options available</li>
                                    <li>Geocoding failed</li>
                                </ul>
                            </p>
                        </div>
                    `;
                }
            })
            .catch(error => {
                console.error('Detailed Route fetching error:', error);
                routeResults.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <p class="text-danger">Error fetching routes.
                            <br>Check console for details.
                            <br>Possible network or server issue.</p>
                    </div>
                `;
            });
    }

    function initMap() {
        routeMap = L.map('routeMap').setView([51.505, -0.09], 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(routeMap);
    }

    function plotRouteOnMap(route) {
        // Clear previous route
        if (currentRouteLayer) {
            routeMap.removeLayer(currentRouteLayer);
            currentRouteLayer = null;
        }

        // Check if route has coordinates
        if (!route.geometry || !route.geometry.coordinates || route.geometry.coordinates.length === 0) {
            console.warn('No route geometry available. Attempting alternative mapping.');

            // Extract origin and destination from the route summary
            const summaryMatch = route.route_summary.match(/from (.*) to (.*)/);
            if (summaryMatch && summaryMatch[1] && summaryMatch[2]) {
                const origin = summaryMatch[1];
                const destination = summaryMatch[2];

                // Use fetch to get coordinates from backend
                fetch(`/api/geocode?location=${encodeURIComponent(origin)},${encodeURIComponent(destination)}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success && data.coordinates && data.coordinates.length === 2) {
                            const [originCoords, destCoords] = data.coordinates;

                            // Create markers for origin and destination
                            const originMarker = L.marker([originCoords[1], originCoords[0]], {
                                icon: L.divIcon({
                                    className: 'route-marker',
                                    html: '<div class="text-success"><i class="fas fa-map-marker-alt fa-2x"></i></div>'
                                })
                            }).addTo(routeMap).bindPopup(origin);

                            const destMarker = L.marker([destCoords[1], destCoords[0]], {
                                icon: L.divIcon({
                                    className: 'route-marker',
                                    html: '<div class="text-danger"><i class="fas fa-flag-checkered fa-2x"></i></div>'
                                })
                            }).addTo(routeMap).bindPopup(destination);

                            // Fit map to markers
                            routeMap.fitBounds(L.latLngBounds([
                                [originCoords[1], originCoords[0]],
                                [destCoords[1], destCoords[0]]
                            ]));

                            // Add warning about limited route information
                            const warningDiv = document.createElement('div');
                            warningDiv.className = 'alert alert-warning';
                            warningDiv.textContent = 'Detailed route map not available. Showing start and end points.';
                            document.getElementById('mapPanel').prepend(warningDiv);
                        } else {
                            // Fallback to default view
                            routeMap.setView([51.505, -0.09], 5);
                            console.error('Could not resolve coordinates');
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching coordinates:', error);
                        routeMap.setView([51.505, -0.09], 5);
                    });
            } else {
                // If no locations found in summary, use default view
                routeMap.setView([51.505, -0.09], 5);
                console.error('Could not extract locations from route summary');
            }
            return;
        }

        // Existing code for plotting route with geometry coordinates
        try {
            const coordinates = route.geometry.coordinates.map(coord => L.latLng(coord[1], coord[0]));

            // Create polyline with style based on transport mode
            currentRouteLayer = L.polyline(coordinates, {
                color: getRouteColor(route.mode),
                weight: 4,
                opacity: 0.7
            }).addTo(routeMap);

            // Add markers
            L.marker(coordinates[0], {
                icon: L.divIcon({
                    className: 'route-marker',
                    html: '<div class="text-success"><i class="fas fa-map-marker-alt fa-2x"></i></div>'
                })
            }).addTo(routeMap).bindPopup('Start Point');

            L.marker(coordinates[coordinates.length - 1], {
                icon: L.divIcon({
                    className: 'route-marker',
                    html: '<div class="text-danger"><i class="fas fa-flag-checkered fa-2x"></i></div>'
                })
            }).addTo(routeMap).bindPopup('End Point');

            // Adjust map view
            routeMap.fitBounds(currentRouteLayer.getBounds());
        } catch (error) {
            console.error('Error plotting route:', error);
            routeMap.setView([51.505, -0.09], 5);
        }
    }

    function showBasicRoutePoints(route) {
        // Try to show at least start and end points if available
        if (route.start_point && route.end_point) {
            const start = L.latLng(route.start_point[1], route.start_point[0]);
            const end = L.latLng(route.end_point[1], route.end_point[0]);

            L.marker(start, {
                icon: L.divIcon({
                    className: 'route-marker',
                    html: '<div class="text-success"><i class="fas fa-map-marker-alt fa-2x"></i></div>'
                })
            }).addTo(routeMap).bindPopup('Start Point');

            L.marker(end, {
                icon: L.divIcon({
                    className: 'route-marker',
                    html: '<div class="text-danger"><i class="fas fa-flag-checkered fa-2x"></i></div>'
                })
            }).addTo(routeMap).bindPopup('End Point');

            routeMap.fitBounds(L.latLngBounds([start, end]));
        } else {
            // Fallback to default view if no points available
            routeMap.setView([51.505, -0.09], 5);
        }
    }

    function getRouteColor(mode) {
        const colors = {
            walking: '#4CAF50',
            cycling: '#2196F3',
            car: '#F44336',
            bus: '#FF9800',
            train: '#9C27B0'
        };
        return colors[mode.toLowerCase()] || '#666';
    }

    function showRouteOnMap(route) {
        document.getElementById('mapPanel').style.display = 'block';
        plotRouteOnMap(route);
    }

    function addToHistory(route) {
        const history = JSON.parse(localStorage.getItem('routeHistory') || '[]'); // Fixed: Properly default to an empty array as a string
        history.unshift({
            date: new Date().toISOString(),
            mode: route.mode,
            distance: route.distance_km,
            saved: route.emissions_saved_kg
        });
        localStorage.setItem('routeHistory', JSON.stringify(history.slice(0, 5)));
    }


    function handleRouteSelection(event) {
        if (event.target.closest('.btn-choose-route')) {
            const card = event.target.closest('.route-card');
            const index = Array.from(routeResults.children).indexOf(card.parentElement);
            const selectedRoute = routeOptions[index];

            // Show confirmation modal
            const confirmModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
            document.getElementById('selectedMode').textContent = selectedRoute.mode;
            document.getElementById('selectedDetails').innerHTML = `
                <li>Duration: ${selectedRoute.duration_minutes} mins</li>
                <li>Distance: ${selectedRoute.distance_km} km</li>
                <li>CO₂ Saved: ${selectedRoute.emissions_saved_kg} kg</li>
            `;
            confirmModal.show();

            document.getElementById('confirmSelection').onclick = () => {
                confirmModal.hide();
                showRouteOnMap(selectedRoute);
                addToHistory(selectedRoute);
            };
        }
    }

/**
 * Fetch route data from API using provided origin and destination
 */

    // Fetch route function
    async function fetchRoute(origin, destination) {
        try {
            const response = await fetch(`/api/route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            // Log the entire response for debugging
            console.log('Full API Response:', data);

            // Return routes using the correct property
            return data.success ? { routes: data.options } : null;
        } catch (error) {
            console.error("Error fetching route data:", error);
            return null;
        }
    }


    /**
     * Display route options in the UI
     */
    function displayRouteOptions(options) {
        // Clear previous results
        routeResults.innerHTML = '';

        // Add an initial type and emptiness check
        if (!options || !Array.isArray(options) || options.length === 0) {
            console.error('Invalid or empty route options:', options);
            routeResults.innerHTML = `
                <div class="col-12 text-center py-5">
                    <p class="text-danger">No route options available</p>
                </div>
            `;
            return;
        }

        options.forEach((option, index) => {
            // Add type checking for numeric properties
            const safeOption = {
                mode: option.mode || 'unknown',
                duration_minutes: Number.isFinite(option.duration_minutes) ? option.duration_minutes : 0,
                distance_km: Number.isFinite(option.distance_km) ? option.distance_km : 0,
                cost_estimate: Number.isFinite(option.cost_estimate) ? option.cost_estimate : 0,
                carbon_saved_percentage: Number.isFinite(option.carbon_saved_percentage || option.savings_percentage)
                    ? (option.carbon_saved_percentage || option.savings_percentage)
                    : 0,
                emissions_saved_kg: Number.isFinite(option.emissions_saved_kg) ? option.emissions_saved_kg : 0,
                savings_percentage: Number.isFinite(option.savings_percentage) ? option.savings_percentage : 0,
                route_summary: option.route_summary || 'No summary available',
                geometry: option.geometry || null
            };

            const ecoRating = getEcoRating(safeOption);

            // Get appropriate icon for transport mode
            let icon = '';
            switch (safeOption.mode.toLowerCase()) {
                case 'car':
                    icon = 'fa-car';
                    break;
                case 'bus':
                    icon = 'fa-bus';
                    break;
                case 'train':
                    icon = 'fa-train';
                    break;
                case 'bike':
                case 'cycling':
                    icon = 'fa-bicycle';
                    break;
                case 'walk':
                case 'walking':
                    icon = 'fa-walking';
                    break;
                default:
                    icon = 'fa-route';
            }

            const card = document.createElement('div');
            card.className = 'col-md-6 col-lg-4 mb-4';
            card.innerHTML = `
                <div class="card route-card h-100 ${ecoRating.class}">
                    <div class="card-body text-center">
                        <div class="mode-icon">
                            <i class="fas ${icon}"></i>
                        </div>
                        <h5 class="card-title">${capitalizeFirstLetter(safeOption.mode)}</h5>
                        <span class="eco-rating ${ecoRating.class}">${ecoRating.label}</span>

                        <ul class="list-group list-group-flush mt-3">
                            <li class="list-group-item">
                                <i class="fas fa-clock me-2"></i>
                                ${safeOption.duration_minutes.toFixed(0)} min
                            </li>
                            <li class="list-group-item">
                                <i class="fas fa-road me-2"></i>
                                ${safeOption.distance_km.toFixed(1)} km
                            </li>
                            <li class="list-group-item">
                                <i class="fas fa-dollar-sign me-2"></i>
                                $${safeOption.cost_estimate.toFixed(2)}
                            </li>
                            <li class="list-group-item">
                                <i class="fas fa-leaf me-2"></i>
                                ${safeOption.carbon_saved_percentage.toFixed(0)}% less CO₂
                            </li>
                            <li class="list-group-item">
                                <i class="fas fa-weight me-2"></i>
                                ${safeOption.emissions_saved_kg.toFixed(1)}kg CO₂ saved
                            </li>
                            <li class="list-group-item">
                                <i class="fas fa-percentage me-2"></i>
                                ${safeOption.savings_percentage.toFixed(0)}% reduction
                            </li>
                        </ul>

                        <p class="card-text mt-3">
                            ${safeOption.route_summary}
                        </p>

                        <button class="btn btn-outline-success mt-3 btn-choose-route" data-index="${index}">
                            Choose This Route
                        </button>
                    </div>
                </div>
            `;

            routeResults.appendChild(card);
        });
    }

    /**
     * Get eco-rating information based on carbon savings
     */
    function getEcoRating(option) {
        const savedPercentage = option.savings_percentage;

        if (savedPercentage >= 90) {
            return { label: 'Excellent', class: 'eco-best' };
        } else if (savedPercentage >= 50) {
            return { label: 'Good', class: 'eco-good' };
        } else if (savedPercentage >= 20) {
            return { label: 'Medium', class: 'eco-medium' };
        } else {
            return { label: 'Poor', class: 'eco-poor' };
        }
    }

    /**
     * Update the savings summary panel
     */
    function updateSavingsSummary(options) {
        // Find the option with the highest emissions savings
        const bestOption = [...options].sort((a, b) => b.emissions_saved_kg - a.emissions_saved_kg)[0];

        // Calculate tree equivalent (1 tree absorbs ~22kg CO₂/year ≈ 0.0025kg/hour)
        const treeHours = bestOption.emissions_saved_kg / 0.0025;

        totalSavedCO2.textContent = bestOption.emissions_saved_kg.toFixed(1);
        treeEquivalent.textContent = Math.round(treeHours);

        // Update savings message based on percentage
        if (bestOption.savings_percentage > 80) { // Changed property
            savingsMessage.textContent = 'Excellent choice! You are making a significant difference!';
            savingsMessage.className = 'alert alert-success';
        } else if (bestOption.savings_percentage > 50) {
            savingsMessage.textContent = 'Great job! You are helping reduce carbon emissions!';
            savingsMessage.className = 'alert alert-success';
        } else if (bestOption.savings_percentage > 20) {
            savingsMessage.textContent = 'Good start! Consider greener options when possible.';
            savingsMessage.className = 'alert alert-info';
        } else {
            savingsMessage.textContent = 'There are greener transport options available!';
            savingsMessage.className = 'alert alert-warning';
        }
    }

    /**
     * Sort routes by different criteria
     */
    function sortRoutes(criteria) {
        // Update active button
        sortTime.classList.remove('active');
        sortCost.classList.remove('active');
        sortEco.classList.remove('active');

        switch (criteria) {
            case 'time':
                routeOptions.sort((a, b) => a.duration_minutes - b.duration_minutes);
                sortTime.classList.add('active');
                break;
            case 'cost':
                routeOptions.sort((a, b) => a.cost_estimate - b.cost_estimate);
                sortCost.classList.add('active');
                break;
            case 'eco':
                routeOptions.sort((a, b) => b.emissions_saved_kg - a.emissions_saved_kg);
                sortEco.classList.add('active');
                break;
        }

        displayRouteOptions(routeOptions);
    }

    /**
     * Helper function to capitalize the first letter of a string
     */
    function capitalizeFirstLetter(string) {
    if (!string || typeof string !== 'string' || string.length === 0) {
        return string;
    }
    return string.charAt(0).toUpperCase() + string.slice(1);
}
})
