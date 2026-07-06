# Moon-API Demo: Astronomical Dashboard 🌕 ☀️

A real-time astronomical dashboard demonstrating the capabilities of [Moon-API.com](https://moon-api.com). This interactive dashboard visualizes lunar and solar data, providing a comprehensive view of celestial positions, phases, and astronomical events.

## 🌟 Features

- **Real-time Data Updates**: Automatically refreshes every 5 minutes
- **Interactive Charts**: 
  - Moon Position (Altitude & Azimuth)
  - Sun Position (Altitude & Azimuth)
  - Celestial Distances
- **Detailed Information**:
  - Current Moon Phase & Illumination
  - Sun Rise/Set Times
  - Zodiac Information
  - Equipment Recommendations
  - Optimal Viewing Periods
- **Data Explorer**: Click any value to see its location in the API response
- **Historical Data**: Tracks and displays 7 days of data
- **Demo Mode**: Try the dashboard without an API key

## 🚀 Getting Started

1. Clone this repository:
    ```bash
    git clone https://github.com/iLoveSpace/MoonAPI_Demo-Astronomical_Dashboard.git
    ```

2. Open `index.html` in your browser or serve via a web server.

3. Either:
   - Enter your Moon-API key (get one at [Moon-API.com or RapidAPI])
   - Or click "View Demo with Sample Data" to try the dashboard

## 📊 Data Visualization

The dashboard includes three main charts:
- **Moon Position**: Shows altitude (-90° to +90°) and azimuth (0° to 360°)
- **Sun Position**: Displays current solar position and movement
- **Celestial Distances**: Tracks distances of both bodies over time

## 🔑 API Integration

This demo uses the Moon-API Advanced endpoint which provides:
- Detailed moon phase information
- Precise positional data
- Visibility conditions
- Equipment recommendations
- Astronomical events

## 🛠️ Technical Details

Built with:
- Pure JavaScript (ES6+)
- Chart.js for data visualization
- Bootstrap 5 for UI components
- Local Storage for data persistence

## 💻 Key Components

### Dashboard Features
- Real-time data updates every 5 minutes
- Interactive data explorer
- Historical data tracking
- Change detection and logging
- Responsive design for all screen sizes

### Data Management
- Local storage for historical data
- Demo mode with simulated updates
- API key management
- Error handling and validation

### Visualization
- Dynamic charts with Chart.js
- Custom tooltips
- Interactive data points
- Responsive layouts

## 🔧 Configuration

The dashboard uses the following default settings:
- Update interval: 5 minutes
- Historical data retention: 7 days
- Data points per hour: 12 (one every 5 minutes)
- Default location: London (51.4768, -0.0004)

## 🔗 Links

- [Moon-API Website](https://moon-api.com)
- [API Documentation](https://moon-api.com/docs)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### How to Contribute
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📫 Support

- For API-related questions, visit [Moon-API.com](https://moon-api.com)
- For demo-specific issues, open a GitHub issue
- For general queries, contact support@moon-api.com

## 📊 Demo Data

The demo mode uses simulated data that demonstrates:
- Moon phase transitions
- Daily celestial movements
- Distance variations
- Viewing conditions
- Equipment recommendations

## 🌟 Acknowledgments

- Thanks to all contributors and users of Moon-API
- Built with [Chart.js](https://www.chartjs.org/) and [Bootstrap](https://getbootstrap.com/)

## 📝 License

This demo code is available under the MIT License. Feel free to use it as a starting point for your own projects.
