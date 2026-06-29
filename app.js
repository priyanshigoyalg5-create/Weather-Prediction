// OpenWeatherMap API Key
const apiKey = "594d6c89c926800afe16cbfc3f253f91"; 
let clockInterval;

// 1. Event Listeners UI Controls
document.getElementById('location-btn').addEventListener('click', useGPSLocation);
document.getElementById('search-btn').addEventListener('click', useCustomSearch);
document.getElementById('search-input').addEventListener('keypress', (e) => { 
    if (e.key === 'Enter') useCustomSearch(); 
});

// 🌟 NEW FIX: Real-time ticking clock engine with STATUS SYNC
function startLiveClock(timezoneOffset, mainCondition, detailedDesc, sunriseMin, sunsetMin) {
    if (clockInterval) clearInterval(clockInterval);

    const timeElement = document.getElementById('local-time');
    const statusLabel = document.getElementById('time-status');

    const tick = () => {
        const currentUnixTime = Math.floor(Date.now() / 1000); 
        const exactCityTime = new Date((currentUnixTime + timezoneOffset) * 1000);

        let hours = exactCityTime.getUTCHours();
        const minutes = exactCityTime.getUTCMinutes().toString().padStart(2, '0');
        const seconds = exactCityTime.getUTCSeconds().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12 || 12;
        
        // 1. Screen par live time display
        timeElement.innerText = `Local Time: ${hours.toString().padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;

        // 2. Dynamic Text Status Syncing (Real-Time Counter)
        const currentTotalMinutes = (exactCityTime.getUTCHours() * 60) + exactCityTime.getUTCMinutes();
        let statusText = "☀️ Daytime";

        const main = mainCondition.toLowerCase();
        const desc = detailedDesc.toLowerCase();

        if (main === 'rain' || main === 'thunderstorm' || main === 'drizzle' || desc.includes('heavy rain')) {
            statusText = "🌧️ Rainy Weather";
        } else {
            if (currentTotalMinutes >= (sunsetMin - 30) && currentTotalMinutes <= (sunsetMin + 30)) {
                statusText = "🌅 Sunset Time";
            } else if (currentTotalMinutes > (sunsetMin + 30) || currentTotalMinutes < sunriseMin) {
                statusText = "🌙 Night";
            } else {
                statusText = "☀️ Daytime";
            }
        }

        if (statusLabel && statusLabel.innerText !== statusText) {
            statusLabel.innerText = statusText;
        }

        // Real-time updates directly map background constraints inside tick loop
        changeBackgroundMedia(mainCondition, detailedDesc, currentTotalMinutes, sunriseMin, sunsetMin);
    };

    tick(); 
    clockInterval = setInterval(tick, 1000); 
}

// Mode 1: GPS location tracking
function useGPSLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            fetchData(position.coords.latitude, position.coords.longitude);
        }, () => alert("GPS Permission Denied. Manually search city."));
    }
}

// Mode 2: Search Box input parser
function useCustomSearch() {
    const cityName = document.getElementById('search-input').value.trim();
    if (!cityName) return alert("Please type a city name first!");

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}&units=metric`;
    
    fetch(url)
        .then(res => { if (!res.ok) throw new Error("Location not found."); return res.json(); })
        .then(data => fetchData(data.coord.lat, data.coord.lon))
        .catch(err => alert(err.message));
}

// Global Core Data Pipeline
function fetchData(lat, lon) {
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    fetch(weatherUrl)
        .then(res => res.json())
        .then(weatherData => {
            fetch(`https://api.sunrisesunset.io/json?lat=${lat}&lng=${lon}`)
                .then(res => res.json())
                .then(astroData => {
                    updateWeatherUI(weatherData, astroData.results);
                    calculateCelestialAnomalies(lat, lon, weatherData, astroData.results);
                })
                .catch(() => {
                    updateWeatherUI(weatherData, null);
                    calculateCelestialAnomalies(lat, lon, weatherData, null);
                });
        });
}

// Update Weather UI
function updateWeatherUI(data, astroResults) {
    const mainCondition = data.weather[0].main;
    let detailedDesc = data.weather[0].description;

    document.getElementById('city').innerText = `${data.name}, ${data.sys.country}`;
    document.getElementById('temp').innerText = `${Math.round(data.main.temp)}°C`;
    
    if (detailedDesc.toLowerCase() === 'clear sky' || detailedDesc.toLowerCase() === 'clear') {
        detailedDesc = "Sunny"; 
    }
    document.getElementById('description').innerText = detailedDesc;

    const formatTime = (unixTimestamp, timezoneOffset) => {
        const utcTimestamp = (unixTimestamp + timezoneOffset) * 1000;
        const date = new Date(utcTimestamp);
        let hours = date.getUTCHours();
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    };

    document.getElementById('sunrise').innerText = formatTime(data.sys.sunrise, data.timezone);
    document.getElementById('sunset').innerText = formatTime(data.sys.sunset, data.timezone);
    
    document.getElementById('moonrise').innerText = astroResults?.moonrise || "--:--";
    document.getElementById('moonphase').innerText = astroResults?.moon_phase || "--";

    // Sunrise/Sunset calculations parsed to absolute minutes rules
    const sunriseDate = new Date((data.sys.sunrise + data.timezone) * 1000);
    const sunsetDate = new Date((data.sys.sunset + data.timezone) * 1000);
    const sunriseMinutes = (sunriseDate.getUTCHours() * 60) + sunriseDate.getUTCMinutes();
    const sunsetMinutes = (sunsetDate.getUTCHours() * 60) + sunsetDate.getUTCMinutes();

    // 🌟 Trigger clock mapping with mainCondition and detailedDesc parameter states
    startLiveClock(data.timezone, mainCondition, detailedDesc, sunriseMinutes, sunsetMinutes);
    
    document.getElementById('weather-info').classList.remove('hidden');
}

// AI Space Agent Logic System
function calculateCelestialAnomalies(lat, lon, weatherData, externalAstro) {
    const alertBox = document.getElementById('astro-alert');
    const cloudCover = weatherData.clouds.all;
    const weatherDesc = weatherData.weather[0].description.toLowerCase();
    
    let diagnosis = "";

    if (cloudCover > 60) {
        diagnosis = `❌ **Observation Blocked:** High atmospheric opacity (${cloudCover}% cloud cover due to ${weatherDesc}). Visible spectrum stargazing is heavily obscured tonight over your location.`;
        alertBox.innerHTML = diagnosis;
        return;
    }

    diagnosis = `🔭 **Optimal Visual Window Clear!** (${cloudCover}% cloud density). Planetary alignment checks out West-Northwest exactly 40 minutes post-sunset.`;
    alertBox.innerHTML = diagnosis;
}

// ✅ FIXED: Media Swapper Engine vector mapping check standard parameter check
function changeBackgroundMedia(main, desc, currentTime, sunriseTime, sunsetTime) {
    const video = document.getElementById('weather-video');
    const source = video.querySelector('source');
    const container = document.querySelector('.video-container'); 
    
    let videoFile = "";
    let imageFile = "";

    main = main.toLowerCase();
    desc = desc.toLowerCase();

    if (main === 'rain' || main === 'thunderstorm' || main === 'drizzle' || desc.includes('heavy rain')) {
        videoFile = 'heavy-rain.mp4';
    } 
    else {
        if (currentTime >= (sunsetTime - 30) && currentTime <= (sunsetTime + 30)) {
            imageFile = "sunset.jpg";
        }
        else if (currentTime > (sunsetTime + 30) || currentTime < sunriseTime) {
            videoFile = "night.mp4";
        }
        else {
            videoFile = "clear.mp4";
        }
    }

    if (imageFile) {
        video.style.display = "none";
        container.style.backgroundImage = `url('./videos/${imageFile}')`;
    } 
    else if (videoFile) {
        container.style.backgroundImage = "none";
        video.style.display = "block";
        if (source && !source.src.includes(videoFile)) {
            source.src = `./videos/${videoFile}`;
            video.load();
            video.muted = true;
            video.play().catch(e => console.log("Video play error: ", e));
        }
    }
}