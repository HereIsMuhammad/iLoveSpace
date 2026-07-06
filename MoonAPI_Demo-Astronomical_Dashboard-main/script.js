/**
 * Astronomical Dashboard
 * 
 * This dashboard visualizes data from the Moon-API.com API (https://moon-api.com).
 * The data structure follows this pattern:
 * 
 * data
 * ├── moon                          // Moon-related data
 * │   ├── phase                     // Current moon phase (0-1)
 * │   ├── phase_name               // Name of current phase
 * │   ├── illumination             // Current illumination percentage
 * │   ├── detailed
 * │   │   ├── position             // Current position data
 * │   │   ├── visibility           // Viewing conditions
 * │   │   └── upcoming_phases      // Next phase dates
 * │   └── events                   // Rise/set times and viewing periods
 * │
 * └── sun                          // Sun-related data
 *     ├── position                 // Current position data
 *     ├── sunrise/sunset           // Daily timing data
 *     └── next_solar_eclipse       // Upcoming eclipse info
 * 
 * The dashboard updates every 5 minutes and stores 7 days of historical data
 * in the browser's localStorage.
 */
class AstronomicalDashboard {
    constructor() {
        this.apiKey = localStorage.getItem('moonApiKey');
        this.historicalData = this.loadHistoricalData();
        this.keyStatus = 'checking';
        this.lastData = null;
        this.daysToShow = 7;    // Show 7 days of data
        this.dataPointsPerHour = 12; // One point every 5 minutes
        this.maxDataPoints = 24 * this.dataPointsPerHour * this.daysToShow; // Keep 7 days of data
        this.updateInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
        this.nextUpdateTime = null;
        this.charts = {};
        this.currentData = null;
        this.initializeCharts();
        this.checkApiKey();
        this.startDataFetching();
        this.startUpdateTimer();
        this.initializeTooltips();
        this.initializeDataExplorer();
        
        // Make dashboard instance available globally for the toggle button
        window.dashboard = this;
    }

    checkApiKey() {
        if (!this.apiKey) {
            const modal = new bootstrap.Modal(document.getElementById('apiKeyModal'), {
                backdrop: 'static',
                keyboard: false
            });
            modal.show();
        }
    }

    saveApiKey() {
        const input = document.getElementById('apiKeyInput');
        const key = input.value.trim();
        
        if (key.length !== 50) {
            input.classList.add('is-invalid');
            return;
        }
        
        this.apiKey = key;
        localStorage.setItem('moonApiKey', key);
        this.updateKeyStatus('checking');
        const modal = bootstrap.Modal.getInstance(document.getElementById('apiKeyModal'));
        if (modal) {
            modal.hide();
            input.value = ''; // Clear the input
            input.classList.remove('is-invalid');
        }
        this.fetchData(); // Fetch data immediately with new key
    }

    initializeTooltips() {
        // Initialize all tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    loadHistoricalData() {
        const saved = localStorage.getItem('astronomicalData');
        const defaultData = {
            moon: [],
            sun: [],
            lastTimestamp: null
        };
        
        if (!saved) return defaultData;
        
        try {
            const parsedData = JSON.parse(saved);
            // Validate the data structure
            if (!Array.isArray(parsedData.moon) || !Array.isArray(parsedData.sun)) {
                return defaultData;
            }
            return parsedData;
        } catch (e) {
            console.error('Error loading historical data:', e);
            return defaultData;
        }
    }

    saveHistoricalData() {
        // Validate data before saving
        if (!Array.isArray(this.historicalData.moon) || !Array.isArray(this.historicalData.sun)) {
            console.error('Invalid historical data structure');
            return;
        }
        
        // Keep data points within max limit
        if (this.historicalData.moon.length > this.maxDataPoints) {
            this.historicalData.moon = this.historicalData.moon.slice(-this.maxDataPoints);
            this.historicalData.sun = this.historicalData.sun.slice(-this.maxDataPoints);
        }
        
        // Ensure all data points have required properties
        this.historicalData.moon = this.historicalData.moon.filter(d => 
            d && typeof d.timestamp === 'number' &&
            typeof d.altitude === 'number' &&
            typeof d.azimuth === 'number' &&
            typeof d.distance === 'number'
        );
        
        this.historicalData.sun = this.historicalData.sun.filter(d => 
            d && typeof d.timestamp === 'number' &&
            typeof d.altitude === 'number' &&
            typeof d.azimuth === 'number' &&
            typeof d.distance === 'number'
        );

        localStorage.setItem('astronomicalData', JSON.stringify(this.historicalData));
    }

    initializeCharts() {
        const timeOptions = {
            type: 'time',
            time: {
                unit: 'hour',
                displayFormats: {
                    hour: 'HH:mm'
                },
                tooltipFormat: 'HH:mm',
                adapters: {
                    date: {
                        zone: 'UTC'
                    }
                }
            },
            grid: {
                color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
                color: '#e6e6e6'
            }
        };

        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#e6e6e6'
                    }
                }
            },
            scales: {
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#e6e6e6'
                    }
                }
            }
        };

        // Moon movement chart
        this.charts.moon = new Chart(document.getElementById('moonChart'), {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Moon Altitude 🌕',
                    data: [],
                    borderColor: '#4da8da',
                    backgroundColor: 'rgba(77, 168, 218, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHitRadius: 10,
                    yAxisID: 'y'
                }, {
                    label: 'Moon Azimuth 🧭',
                    data: [],
                    borderColor: '#f7d794',
                    backgroundColor: 'rgba(247, 215, 148, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHitRadius: 10,
                    yAxisID: 'y1'
                }]
            },
            options: {
                ...commonOptions,
                scales: {
                    x: timeOptions,
                    y: {
                        ...commonOptions.scales.y,
                        min: -90,
                        max: 90,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Altitude (°)',
                            color: '#e6e6e6'
                        }
                    },
                    y1: {
                        min: 0,
                        max: 360,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        title: {
                            display: true,
                            text: 'Azimuth (°)',
                            color: '#e6e6e6'
                        },
                        ticks: {
                            color: '#e6e6e6'
                        }
                    }
                }
            }
        });

        // Sun movement chart
        this.charts.sun = new Chart(document.getElementById('sunChart'), {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Sun Altitude ☀️',
                    data: [],
                    borderColor: '#ffc107',
                    backgroundColor: 'rgba(255, 193, 7, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHitRadius: 10,
                    yAxisID: 'y'
                }, {
                    label: 'Sun Azimuth 🧭',
                    data: [],
                    borderColor: '#fd7e14',
                    backgroundColor: 'rgba(253, 126, 20, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHitRadius: 10,
                    yAxisID: 'y1'
                }]
            },
            options: {
                ...commonOptions,
                scales: {
                    x: timeOptions,
                    y: {
                        ...commonOptions.scales.y,
                        min: -90,
                        max: 90,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Altitude (°)',
                            color: '#e6e6e6'
                        }
                    },
                    y1: {
                        min: 0,
                        max: 360,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        title: {
                            display: true,
                            text: 'Azimuth (°)',
                            color: '#e6e6e6'
                        },
                        ticks: {
                            color: '#e6e6e6'
                        }
                    }
                }
            }
        });

        // Distance chart
        this.charts.distance = new Chart(document.getElementById('distanceChart'), {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Moon Distance 🌕',
                    data: [],
                    borderColor: '#4da8da',
                    backgroundColor: 'rgba(77, 168, 218, 0.1)',
                    fill: true,
                    yAxisID: 'y'
                }, {
                    label: 'Sun Distance ☀️',
                    data: [],
                    borderColor: '#ffc107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    fill: true,
                    yAxisID: 'y1'
                }]
            },
            options: {
                ...commonOptions,
                plugins: {
                    title: {
                        display: true,
                        text: 'Celestial Distances'
                    }
                },
                scales: {
                    x: timeOptions,
                    y: {
                        ...commonOptions.scales.y,
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Moon Distance (km) 🌕',
                            color: '#e6e6e6'
                        }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        title: {
                            display: true,
                            text: 'Sun Distance (million km) ☀️',
                            color: '#e6e6e6'
                        },
                        ticks: {
                            color: '#e6e6e6'
                        }
                    }
                }
            }
        });
    }

    updateCharts(data) {
        const timestamp = data.timestamp;
        
        // Validate incoming data
        if (!timestamp || 
            !data.moon?.detailed?.position?.altitude || 
            !data.sun?.position?.altitude) {
            console.error('Invalid data received');
            return;
        }
        
        // Check for duplicate timestamp before adding new data
        const isDuplicate = this.historicalData.moon.some(d => d.timestamp === timestamp);
        if (isDuplicate) {
            console.log('Skipping duplicate data point');
            return;
        }
        
        this.historicalData.lastTimestamp = timestamp;
        
        // Remove data points older than 7 days
        const oneWeekAgo = timestamp - (this.daysToShow * 24 * 60 * 60);
        this.historicalData.moon = this.historicalData.moon.filter(d => d.timestamp > oneWeekAgo);
        this.historicalData.sun = this.historicalData.sun.filter(d => d.timestamp > oneWeekAgo);
        
        this.historicalData.moon.push({
            timestamp: timestamp,
            altitude: data.moon.detailed.position.altitude,
            azimuth: data.moon.detailed.position.azimuth,
            distance: data.moon.detailed.position.distance
        });
        this.historicalData.moon.sort((a, b) => a.timestamp - b.timestamp);
        
        this.historicalData.sun.push({
            timestamp: timestamp,
            altitude: data.sun.position.altitude,
            azimuth: data.sun.position.azimuth,
            distance: data.sun.position.distance
        });
        this.historicalData.sun.sort((a, b) => a.timestamp - b.timestamp);

        this.saveHistoricalData();

        // Update x-axis range to show the week's data
        const now = timestamp * 1000;
        const weekStartTime = now - (this.daysToShow * 24 * 60 * 60 * 1000);
        const weekEndTime = now;

        // Calculate min and max values for better y-axis scaling
        const getMinMax = (data, key) => {
            const values = data.map(d => d[key]);
            return {
                min: Math.min(...values),
                max: Math.max(...values)
            };
        };

        Object.values(this.charts).forEach(chart => {
            if (chart.options.scales.x) {
                chart.options.scales.x.min = weekStartTime;
                chart.options.scales.x.max = weekEndTime;
            }
            
            // Update datasets with current data
            if (chart === this.charts.moon) {
                const altitudeRange = getMinMax(this.historicalData.moon, 'altitude');
                const azimuthRange = getMinMax(this.historicalData.moon, 'azimuth');
                
                // Fixed ranges for better visualization
                chart.options.scales.y.min = -90;
                chart.options.scales.y.max = 90;
                chart.options.scales.y1.min = 0;
                chart.options.scales.y1.max = 360;
                
                chart.data.datasets[0].data = this.historicalData.moon.map(d => ({
                    x: d.timestamp * 1000,
                    y: d.altitude
                }));
                chart.data.datasets[1].data = this.historicalData.moon.map(d => ({
                    x: d.timestamp * 1000,
                    y: d.azimuth
                }));
            } else if (chart === this.charts.sun) {
                // Fixed ranges for better visualization
                chart.options.scales.y.min = -90;
                chart.options.scales.y.max = 90;
                chart.options.scales.y1.min = 0;
                chart.options.scales.y1.max = 360;
                
                chart.data.datasets[0].data = this.historicalData.sun.map(d => ({
                    x: d.timestamp * 1000,
                    y: d.altitude
                }));
                chart.data.datasets[1].data = this.historicalData.sun.map(d => ({
                    x: d.timestamp * 1000,
                    y: d.azimuth
                }));
            } else if (chart === this.charts.distance) {
                chart.data.datasets[0].data = this.historicalData.moon.map(d => ({
                    x: d.timestamp * 1000,
                    y: d.distance / 1000
                }));
                chart.data.datasets[1].data = this.historicalData.sun.map(d => ({
                    x: d.timestamp * 1000,
                    y: d.distance / 1000000
                }));
            }
            
            chart.update('none');
        });

        // Update the historical data table
        this.updateDataTable();
    }

    updateDataTable() {
        const tbody = document.getElementById('dataTableBody');
        if (!tbody) return;

        // Combine moon and sun data
        const allData = this.historicalData.moon.map(moonData => {
            const sunData = this.historicalData.sun.find(s => s.timestamp === moonData.timestamp);
            return {
                timestamp: moonData.timestamp,
                moonAlt: moonData.altitude,
                moonAz: moonData.azimuth,
                moonDist: moonData.distance,
                sunAlt: sunData?.altitude ?? 0,
                sunAz: sunData?.azimuth ?? 0,
                sunDist: sunData?.distance ?? 0
            };
        }).sort((a, b) => b.timestamp - a.timestamp); // Sort newest first

        // Update table content with null checks
        tbody.innerHTML = allData.map(data => `
            <tr>
                <td>${new Date(data.timestamp * 1000).toLocaleString()}</td>
                <td>${(data.moonAlt || 0).toFixed(2)}°</td>
                <td>${(data.moonAz || 0).toFixed(2)}°</td>
                <td>${((data.moonDist || 0) / 1000).toFixed(2)}</td>
                <td>${(data.sunAlt || 0).toFixed(2)}°</td>
                <td>${(data.sunAz || 0).toFixed(2)}°</td>
                <td>${((data.sunDist || 0) / 1000000).toFixed(2)}</td>
            </tr>
        `).join('');
    }

    findChanges(newData, oldData) {
        if (!oldData) return null;
        
        const changes = [];
        const compareFields = {
            moon: {
                'detailed.position.altitude': 'Moon altitude (°)',
                'detailed.position.azimuth': 'Moon azimuth (°)',
                'detailed.position.distance': 'Moon distance (km)',
                phase: 'Moon phase',
                illumination: 'Moon illumination',
                moonrise: 'Moonrise',
                moonset: 'Moonset'
            },
            sun: {
                'position.altitude': 'Sun altitude (°)',
                'position.azimuth': 'Sun azimuth (°)',
                'position.distance': 'Sun distance (km)',
                day_length: 'Day length',
                sunrise_timestamp: 'Sunrise',
                sunset_timestamp: 'Sunset',
                solar_noon: 'Solar noon'
            }
        };

        // Compare all fields and record changes
        for (const [category, fields] of Object.entries(compareFields)) {
            for (const [field, label] of Object.entries(fields)) {
                // Handle nested fields
                const getValue = (obj, path) => {
                    return path.split('.').reduce((o, i) => o ? o[i] : undefined, obj);
                };
                
                const oldValue = getValue(oldData[category], field);
                const newValue = getValue(newData[category], field);
                
                if (oldValue !== newValue) {
                    if (typeof oldValue === 'number') {
                        const oldFormatted = Math.abs(oldValue) > 1000 ? oldValue.toExponential(2) : oldValue.toFixed(2);
                        const newFormatted = Math.abs(newValue) > 1000 ? newValue.toExponential(2) : newValue.toFixed(2);
                        changes.push(`${label}: ${oldFormatted} → ${newFormatted}`);
                    } else {
                        changes.push(`${label}: ${oldValue} → ${newValue}`);
                    }
                }
            }
        }
        
        // Add timestamp to changes
        if (changes.length > 0) {
            changes.unshift(`Time: ${new Date(newData.timestamp * 1000).toLocaleTimeString()}`);
        }
        
        return changes;
    }

    updateInfoTiles(data) {
        // Check if elements exist before updating
        const elements = {
            moonEmoji: document.getElementById('moonEmoji'),
            moonPhaseInfo: document.getElementById('moonPhaseInfo'),
            sunInfo: document.getElementById('sunInfo'),
            moonDetails: document.getElementById('moonDetails'),
            upcomingEvents: document.getElementById('upcomingEvents'),
            changesLog: document.getElementById('changesLog'),
            zodiacInfo: document.getElementById('zodiacInfo'),
            moonViewingDetails: document.getElementById('moonViewingDetails'),
            equipmentRecommendations: document.getElementById('equipmentRecommendations'),
            optimalViewing: document.getElementById('optimalViewing')
        };

        // Check if any required element is missing
        if (Object.values(elements).includes(null)) {
            console.error('Some required DOM elements are missing');
            return;
        }

        // Moon info
        elements.moonEmoji.textContent = data.moon.emoji;
        elements.moonPhaseInfo.innerHTML = `
            <p>Phase: <span data-path="moon.phase_name">${data.moon.phase_name}</span> (<span data-path="moon.illumination">${data.moon.illumination}</span>)</p>
            <p>Age: <span data-path="moon.age_days">${data.moon.age_days}</span> days</p>
            <p>Next rise: <span data-path="moon.moonrise">${data.moon.moonrise}</span></p>
            <p>Next set: <span data-path="moon.moonset">${data.moon.moonset}</span></p>
        `;

        // Sun info
        elements.sunInfo.innerHTML = `
            <p data-path="sun.sunrise_timestamp">Sunrise: ${data.sun.sunrise_timestamp}</p>
            <p data-path="sun.sunset_timestamp">Sunset: ${data.sun.sunset_timestamp}</p>
            <p data-path="sun.day_length">Day length: ${data.sun.day_length}</p>
            <p data-path="sun.solar_noon">Solar noon: ${data.sun.solar_noon}</p>
        `;

        // Moon details
        elements.moonDetails.innerHTML = `
            <p data-path="moon.detailed.position.distance">Distance: ${(data.moon.detailed.position.distance / 1000).toFixed(0)}km</p>
            <p data-path="moon.detailed.position.altitude">Altitude: ${data.moon.detailed.position.altitude.toFixed(1)}°</p>
            <p data-path="moon.detailed.position.azimuth">Azimuth: ${data.moon.detailed.position.azimuth.toFixed(1)}°</p>
            <p data-path="moon.detailed.position.parallactic_angle">Parallactic Angle: ${data.moon.detailed.position.parallactic_angle.toFixed(1)}°</p>
        `;

        // Upcoming events
        elements.upcomingEvents.innerHTML = `
            <p><strong>Next Solar Eclipse:</strong><br>
            <span data-path="sun.next_solar_eclipse.type">${data.sun.next_solar_eclipse.type}</span><br>
            <span data-path="sun.next_solar_eclipse.timestamp">${new Date(data.sun.next_solar_eclipse.timestamp * 1000).toLocaleDateString()}</span></p>
            <p><strong>Next Lunar Eclipse:</strong><br>
            <span data-path="moon.next_lunar_eclipse.type">${data.moon.next_lunar_eclipse.type}</span><br>
            <span data-path="moon.next_lunar_eclipse.timestamp">${new Date(data.moon.next_lunar_eclipse.timestamp * 1000).toLocaleDateString()}</span></p>
        `;

        // Zodiac info
        elements.zodiacInfo.innerHTML = `
            <p>Sun Sign: <span data-path="moon.zodiac.sun_sign">${data.moon.zodiac.sun_sign}</span></p>
            <p>Moon Sign: <span data-path="moon.zodiac.moon_sign">${data.moon.zodiac.moon_sign}</span></p>
            <p>Lunar Cycle: <span data-path="moon.lunar_cycle">${data.moon.lunar_cycle}</span></p>
            <p>Moon Age: <span data-path="moon.age_days">${data.moon.age_days}</span> days</p>
        `;

        // Moon Viewing Details
        elements.moonViewingDetails.innerHTML = `
            <p data-path="moon.detailed.visibility.visibility_rating"><strong>Visibility Rating:</strong> ${data.moon.detailed.visibility.visibility_rating}</p>
            <p data-path="moon.detailed.visibility.viewing_conditions.phase_quality"><strong>Phase Quality:</strong> ${data.moon.detailed.visibility.viewing_conditions.phase_quality}</p>
            <p data-path="moon.detailed.illumination_details.percentage"><strong>Current Illumination:</strong> ${data.moon.detailed.illumination_details.percentage.toFixed(1)}%</p>
            <p data-path="moon.detailed.illumination_details.visible_fraction"><strong>Visible Fraction:</strong> ${data.moon.detailed.illumination_details.visible_fraction.toFixed(3)}</p>
            <p data-path="moon.detailed.illumination_details.phase_angle"><strong>Phase Angle:</strong> ${data.moon.detailed.illumination_details.phase_angle.toFixed(1)}°</p>
        `;

        // Equipment Recommendations
        const equipment = data.moon.detailed.visibility.viewing_conditions.recommended_equipment;
        elements.equipmentRecommendations.innerHTML = `
            <p><strong>Telescope:</strong> <span data-path="moon.detailed.visibility.viewing_conditions.recommended_equipment.telescope">${equipment.telescope}</span></p>
            <p><strong>Magnification:</strong> <span data-path="moon.detailed.visibility.viewing_conditions.recommended_equipment.best_magnification">${equipment.best_magnification}</span></p>
            <p><strong>Filters:</strong> <span data-path="moon.detailed.visibility.viewing_conditions.recommended_equipment.filters">${equipment.filters}</span></p>
        `;

        // Optimal Viewing Period
        const optimal = data.moon.events.optimal_viewing_period;
        elements.optimalViewing.innerHTML = `
            <p><strong>Best Time:</strong> <span data-path="moon.events.optimal_viewing_period.start_time">${optimal.start_time}</span> - <span data-path="moon.events.optimal_viewing_period.end_time">${optimal.end_time}</span></p>
            <p><strong>Duration:</strong> <span data-path="moon.events.optimal_viewing_period.duration_hours">${optimal.duration_hours}</span> hours</p>
            <p><strong>Quality:</strong> <span data-path="moon.events.optimal_viewing_period.viewing_quality">${optimal.viewing_quality}</span></p>
            <div class="mt-2">
                <strong>Recommendations:</strong>
                <ul class="list-unstyled">
                    ${optimal.recommendations.map((rec, index) => 
                        `<li>• <span data-path="moon.events.optimal_viewing_period.recommendations.${index}">${rec}</span></li>`
                    ).join('')}
                </ul>
            </div>
        `;

        // Update changes log if we have previous data
        const changes = this.findChanges(data, this.lastData);
        if (changes && changes.length > 0) {
            const changesHtml = `
                <div class="change-entry latest">
                    <div class="change-time">${changes[0]}</div>
                    <ul class="mb-0">
                        ${changes.slice(1).map(change => `<li>${change}</li>`).join('')}
                    </ul>
                </div>
            `;
            elements.changesLog.innerHTML = changesHtml + elements.changesLog.innerHTML;
            
            // Keep only last 4 change entries
            const entries = elements.changesLog.children;
            while (entries.length > 4) {
                elements.changesLog.removeChild(entries[entries.length - 1]);
            }
            
            // Remove 'latest' class from previous entries
            Array.from(entries).forEach((entry, index) => {
                if (index > 0) entry.classList.remove('latest');
            });
        }

        // Store current data for next comparison
        this.lastData = data;
    }

    simulateDataChanges(data) {
        const now = Math.floor(Date.now() / 1000);
        const clone = JSON.parse(JSON.stringify(data));
        
        // Update timestamps
        clone.timestamp = now;
        clone.datestamp = new Date(now * 1000).toUTCString();
        
        // Calculate time progression (0-1 for a full day)
        const dayProgress = (now % 86400) / 86400;
        
        // Simulate realistic moon movement
        // Moon completes roughly one rotation per day
        clone.moon.detailed.position.azimuth = (dayProgress * 360) % 360;
        
        // Moon's altitude follows a sine wave pattern
        clone.moon.detailed.position.altitude = 
            Math.sin(dayProgress * Math.PI * 2) * 60; // Max altitude ±60°
        
        // Moon's distance varies by about ±20,000 km over its orbit
        const baseDistance = 384400; // Average moon distance in km
        clone.moon.detailed.position.distance = 
            baseDistance + Math.sin(dayProgress * Math.PI * 2) * 20000;
        
        // Simulate realistic sun movement
        // Sun moves 360° over 24 hours
        clone.sun.position.azimuth = (dayProgress * 360 + 180) % 360;
        
        // Sun's altitude follows a sine wave pattern offset by time of year
        // Using a simplified model for demo purposes
        clone.sun.position.altitude = 
            Math.sin(dayProgress * Math.PI) * 50; // Max altitude ±50°
        
        // Sun's distance varies by about ±2.5 million km over the year
        const baseSunDistance = 149600000; // Average sun distance in km
        clone.sun.position.distance = 
            baseSunDistance + Math.sin(dayProgress * Math.PI * 2) * 2500000;
        
        // Update illumination
        // Moon phase changes over ~29.5 days
        const lunarMonth = 29.5 * 86400; // 29.5 days in seconds
        const phaseProgress = (now % lunarMonth) / lunarMonth;
        clone.moon.phase = phaseProgress;
        clone.moon.illumination = `${Math.round(clone.moon.phase * 100)}%`;
        
        return clone;
    }

    // Add method to generate historical demo data
    generateHistoricalDemoData(data) {
        const now = Math.floor(Date.now() / 1000);
        const historicalData = {
            moon: [],
            sun: [],
            lastTimestamp: now
        };
        
        // Define constants for time calculations and base distances
        const HOURS_24 = 86400;  // Seconds in a day
        const DAYS_7 = HOURS_24 * 7;  // Seconds in a week
        const moonBaseDistance = 384400;  // Average moon distance in km
        const sunBaseDistance = 149600000;  // Average sun distance in km
        
        // Set fixed sun position values for demo mode
        // These values create a realistic night-time scenario
        const sunAltitude = -50;  // Sun well below horizon
        const sunAzimuth = 320;   // Fixed NW position
        
        // Generate a week's worth of data points
        // 288 points per day (every 5 minutes) * 7 days = 2016 points
        for (let i = 2016; i >= 0; i--) {
            // Calculate timestamp for each data point, moving backwards from now
            const timestamp = now - (i * 300);  // 300 seconds = 5 minutes
            const dayProgress = (timestamp % HOURS_24) / HOURS_24;  // 0-1 progress through day
            
            // Calculate stepped distances that change every 24 hours
            // This creates the stair-step pattern seen in the distance chart
            const timeStep = Math.floor(i / 288);  // Changes every 24 hours (288 points per day)
            const moonDistance = moonBaseDistance + (timeStep * 10000);  // 10,000km steps
            const sunDistance = sunBaseDistance + (timeStep * 10000);  // Same step size
            
            // Add moon data point
            historicalData.moon.push({
                timestamp: timestamp,
                // Altitude follows sinusoidal pattern through the day (-30° to +30°)
                altitude: Math.sin(dayProgress * Math.PI * 2) * 30,
                // Azimuth makes one complete 360° rotation per day
                azimuth: (dayProgress * 360) % 360,
                // Distance follows step pattern for clear visualization
                distance: moonDistance
            });
            
            // Add sun data point
            historicalData.sun.push({
                timestamp: timestamp,
                // Sun maintains fixed position for demo
                altitude: sunAltitude,  // Constant low altitude (night time)
                azimuth: sunAzimuth,   // Fixed position
                // Distance follows similar step pattern to moon
                distance: sunDistance
            });
        }
        
        return historicalData;
    }

    async fetchData() {
        if (!this.apiKey) {
            this.checkApiKey();
            this.updateKeyStatus('invalid');
            return;
        }

        // Use demo data if API key is "Demo"
        if (this.apiKey === "Demo") {
            try {
                // Load sample data only if we don't have it yet
                if (!this.demoData) {
                    const response = await fetch('sample_data.json');
                    this.demoData = await response.json();
                    // Initialize historical data for demo mode
                    this.historicalData = this.generateHistoricalDemoData(this.demoData);
                    // Update charts immediately with historical data
                    this.updateCharts(this.demoData);
                }
                
                // Simulate changes to the demo data
                const data = this.simulateDataChanges(this.demoData);
                this.updateKeyStatus('demo');
                this.currentData = data;
                
                // Update last update time
                const lastUpdateTime = new Date().toLocaleTimeString();
                document.getElementById('lastUpdate').textContent = `Last Update: ${lastUpdateTime}`;
                
                // Set next update time
                this.nextUpdateTime = Date.now() + this.updateInterval;
                
                this.updateInfoTiles(data);
                return;
            } catch (error) {
                console.error('Error loading demo data:', error);
            }
        }

        try {
            const response = await fetch('https://moon-phase.p.rapidapi.com/advanced?lat=51.4768&lon=-0.0004', {
                headers: {
                    'x-rapidapi-host': 'moon-phase.p.rapidapi.com',
                    'x-rapidapi-key': this.apiKey
                }
            });
            const data = await response.json();
            
            if (response.status !== 200 || data.message) {
                if (data.error?.includes('API key') || data.message?.includes('not subscribed')) {
                    localStorage.removeItem('moonApiKey');
                    this.apiKey = null;
                    this.checkApiKey();
                    this.updateKeyStatus('invalid');
                    throw new Error(data.message || data.error);
                }
                throw new Error(data.message || data.error);
            }
            
            // Update key status to valid
            this.updateKeyStatus('valid', this.apiKey);
            
            // Store current data for the explorer
            this.currentData = data;
            
            // Update last update time
            const lastUpdateTime = new Date().toLocaleTimeString();
            document.getElementById('lastUpdate').textContent = `Last Update: ${lastUpdateTime}`;
            
            // Set next update time
            this.nextUpdateTime = Date.now() + this.updateInterval;
            
            this.updateCharts(data);
            this.updateInfoTiles(data);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    startDataFetching() {
        // Fetch immediately
        this.fetchData();
        
        // Then fetch every 5 minutes
        setInterval(() => this.fetchData(), this.updateInterval);
    }

    startUpdateTimer() {
        const updateTimer = () => {
            if (this.nextUpdateTime) {
                const now = Date.now();
                const timeLeft = this.nextUpdateTime - now;
                
                if (timeLeft > 0) {
                    const minutes = Math.floor(timeLeft / 60000);
                    const seconds = Math.floor((timeLeft % 60000) / 1000);
                    document.getElementById('nextUpdate').textContent = 
                        `Next Update: ${minutes}:${seconds.toString().padStart(2, '0')}`;
                }
            }
        };

        // Update timer every second
        setInterval(updateTimer, 1000);
    }

    initializeDataExplorer() {
        // Add click handler to the document for delegation
        document.addEventListener('click', (event) => {
            const element = event.target.closest('[data-path]');
            if (element) {
                this.highlightData(element.dataset.path);
            }
        });
    }

    toggleDataExplorer() {
        const explorer = document.getElementById('dataExplorer');
        const container = document.querySelector('.container-fluid');
        explorer.classList.toggle('active');
        container.classList.toggle('explorer-active');
    }

    highlightData(path) {
        if (!this.currentData) return;

        const pathElement = document.querySelector('.data-path');
        const codeElement = document.getElementById('rawData');
        
        // Add a title to show what was clicked
        pathElement.innerHTML = `<strong>Data Path:</strong> data.${path}`;
        
        // Format and display the full data
        const formattedData = JSON.stringify(this.currentData, null, 2);
        
        // Highlight the relevant part
        const highlightedData = this.highlightJsonPath(formattedData, path);
        codeElement.innerHTML = highlightedData;
        
        // Show the explorer if it's not already visible
        document.getElementById('dataExplorer').classList.add('active');
    }

    highlightJsonPath(json, path) {
        const lines = json.split('\n');
        let currentPath = [];
        let highlightLines = new Set();
        let bracketCount = 0;
        let inArray = false;
        let arrayIndex = null;
        
        // Handle array indices in the path
        const pathParts = path.split('.').map(part => {
            if (!isNaN(part)) {
                arrayIndex = parseInt(part);
                return null;
            }
            return part;
        }).filter(Boolean);
        
        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            
            // Track object depth
            if (trimmedLine.includes('{')) bracketCount++;
            if (trimmedLine.includes('}')) bracketCount--;
            
            // Track arrays
            if (trimmedLine.includes('[')) inArray = true;
            if (trimmedLine.includes(']')) inArray = false;
            
            // Track current path
            if (trimmedLine.includes('":')) {
                const key = trimmedLine.split('":')[0].trim().replace(/"/g, '');
                while (currentPath.length >= bracketCount) currentPath.pop();
                currentPath.push(key);
                
                // Check if this is our target
                const fullPath = currentPath.join('.');
                if (fullPath === pathParts.join('.')) {
                    highlightLines.add(index);
                    // Add next line if it contains the value
                    if (!trimmedLine.includes('{') && !trimmedLine.includes('[')) {
                        highlightLines.add(index + 1);
                    }
                }
            } else if (inArray && arrayIndex !== null) {
                // Handle array elements
                const arrayMatch = trimmedLine.match(/^\s*"([^"]+)"/);
                if (arrayMatch) {
                    highlightLines.add(index);
                }
            }
        });
        
        return lines.map((line, index) => {
            return highlightLines.has(index) 
                ? `<span class="highlight">${line}</span>` 
                : line;
        }).join('\n');
    }

    showApiKeyModal() {
        const modal = new bootstrap.Modal(document.getElementById('apiKeyModal'));
        modal.show();
    }

    updateKeyStatus(status, key = null) {
        const statusElement = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        const keyPreview = document.querySelector('.key-preview');
        const apiKeyStatus = document.querySelector('.api-key-status');
        
        statusElement.classList.remove('valid', 'invalid', 'demo');
        apiKeyStatus.classList.remove('has-valid-key');
        
        switch(status) {
            case 'valid':
                statusElement.classList.add('valid');
                statusText.textContent = 'Valid API Key';
                keyPreview.textContent = `${key.substring(0, 6)}...`;
                apiKeyStatus.classList.add('has-valid-key');
                break;
            case 'demo':
                statusElement.classList.add('demo');
                statusText.textContent = 'Demo Mode';
                keyPreview.textContent = 'Using sample data';
                apiKeyStatus.classList.add('has-valid-key');
                break;
            case 'invalid':
                statusElement.classList.add('invalid');
                statusText.textContent = 'Invalid API Key';
                keyPreview.textContent = '';
                break;
            default:
                statusText.textContent = 'Checking API Key...';
                keyPreview.textContent = '';
        }
    }

    removeApiKey(event) {
        // Prevent the click from triggering the modal
        event.stopPropagation();
        
        if (confirm('Are you sure you want to remove your API key?')) {
            localStorage.removeItem('moonApiKey');
            localStorage.removeItem('astronomicalData'); // Clear historical data
            this.apiKey = null;
            this.historicalData = this.loadHistoricalData();
            this.updateKeyStatus('invalid');
            this.checkApiKey();
        }
    }

    startDemoMode() {
        this.apiKey = "Demo";
        localStorage.setItem('moonApiKey', "Demo");
        const modal = bootstrap.Modal.getInstance(document.getElementById('apiKeyModal'));
        if (modal) {
            modal.hide();
        }
        this.fetchData();
    }
}

// Start the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new AstronomicalDashboard();
}); 