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
    
    // Load weather data on page load
    loadWeatherData();
    
    // Add event listeners
    routeForm.addEventListener('submit', handleRouteSubmit);
    sortTime.addEventListener('click', () => sortRoutes('time'));
    sortCost.addEventListener('click', () => sortRoutes('cost'));
    sortEco.addEventListener('click', () => sortRoutes('eco'));
    
    /**
     * Load weather data for the current location
     */
    function loadWeatherData() {
        weatherLoading.style.display = 'block';
        weatherContent.style.display = 'none';
        weatherError.style.display = 'none';
        
        fetch('/api/weather?city=Kigali')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Weather API error');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    displayWeatherData(data.weather);
                } else {
                    throw new Error(data.error || 'Unknown error');
                }
            })
            .catch(error => {
                console.error('Error fetching weather data:', error);
                weatherLoading.style.display = 'none';
                weatherError.style.display = 'block';
                weatherError.textContent = 'Could not load weather data. Please try again later.';
            });
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
        
        // Fetch route data from API
        fetch(`/api/route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Route API error');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    routeOptions = data.options;
                    displayRouteOptions(routeOptions);
                    updateSavingsSummary(routeOptions);
                } else {
                    throw new Error(data.error || 'Unknown error');
                }
            })
            .catch(error => {
                console.error('Error fetching route data:', error);
                routeResults.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-danger">
                            Could not load route data. Please try again later.
                        </div>
                    </div>
                `;
            });
    }
    
    /**
     * Display route options in the UI
     */
    function displayRouteOptions(options) {
        routeResults.innerHTML = '';
        
        options.forEach(option => {
            const ecoRating = getEcoRating(option);
            
            // Get appropriate icon for transport mode
            let icon = '';
            switch (option.mode) {
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
                    icon = 'fa-bicycle';
                    break;
                case 'walk':
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
                        <h5 class="card-title">${capitalizeFirstLetter(option.mode)}</h5>
                        <span class="eco-rating ${ecoRating.class}">${ecoRating.label}</span>
                        
                        <ul class="list-group list-group-flush mt-3">
                            <li class="list-group-item">
                                <i class="fas fa-clock me-2"></i>
                                ${option.duration_minutes} min
                            </li>
                            <li class="list-group-item">
                                <i class="fas fa-road me-2"></i>
                                ${option.distance_km.toFixed(1)} km
                            </li>
                            <li class="list-group-item">
                                <i class="fas fa-dollar-sign me-2"></i>
                                $${option.cost_estimate.toFixed(2)}
                            </li>
                            <li class="list-group-item">
                                <i class="fas fa-leaf me-2"></i>
                                ${option.carbon_saved_percentage.toFixed(0)}% less CO₂
                            </li>
                        </ul>
                        
                        <p class="card-text mt-3">
                            ${option.route_summary}
                        </p>
                        
                        <button class="btn btn-outline-success mt-3">
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
        const savedPercentage = option.carbon_saved_percentage;
        
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
        // Find the option with the highest carbon savings
        const bestOption = [...options].sort((a, b) => b.carbon_saved_kg - a.carbon_saved_kg)[0];
        
        // Calculate tree equivalent (rough estimate: 1 tree absorbs ~22kg CO2 per year)
        // That's about 0.06kg per day or 0.0025kg per hour
        const treeHours = bestOption.carbon_saved_kg / 0.0025;
        
        totalSavedCO2.textContent = bestOption.carbon_saved_kg.toFixed(1);
        treeEquivalent.textContent = Math.round(treeHours);
        
        // Update savings message
        if (bestOption.carbon_saved_percentage > 80) {
            savingsMessage.textContent = 'Excellent choice! You are making a significant difference!';
            savingsMessage.className = 'alert alert-success';
        } else if (bestOption.carbon_saved_percentage > 50) {
            savingsMessage.textContent = 'Great job! You are helping reduce carbon emissions!';
            savingsMessage.className = 'alert alert-success';
        } else if (bestOption.carbon_saved_percentage > 20) {
            savingsMessage.textContent = 'Good start! Consider greener options when possible.';
            savingsMessage.className = 'alert alert-info';
        } else {
            savingsMessage.textContent = 'There are greener transport options available!';
            savingsMessage.className = 'alert alert-warning';
        }
        
        savingsSummary.style.display = 'block';
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
                routeOptions.sort((a, b) => b.carbon_saved_kg - a.carbon_saved_kg);
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
