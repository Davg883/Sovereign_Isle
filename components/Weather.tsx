import React, { useState, useEffect } from 'react';

// WMO Weather interpretation codes to description and icon mapping
const getWeatherInfo = (code: number): { description: string; icon: JSX.Element } => {
  if (code === 0) return { description: 'Clear sky', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> };
  if (code >= 1 && code <= 3) return { description: 'Partly cloudy', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15.25a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 15.25v-2.5a2.25 2.25 0 00-2.25-2.25h-.5a6 6 0 00-11.5 0h-.5A2.25 2.25 0 003 12.75v2.5z" /></svg> };
  if (code >= 45 && code <= 48) return { description: 'Fog', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 9h16.5M3.75 12h16.5m-16.5 3h16.5" /></svg> };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { description: 'Rain', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75l.373.497a2.25 2.25 0 01-3.248 3.248L6 16.5m12-3.75l-.373.497a2.25 2.25 0 003.248 3.248L18 16.5m-7.5-3.75h.008v.008H10.5v-.008zm3.75 0h.008v.008H14.25v-.008zm-1.5-3.75a3 3 0 00-3 3V12h6v-1.5a3 3 0 00-3-3z" /></svg> };
  if (code >= 71 && code <= 77) return { description: 'Snow', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 21l-3-3m0 0l3-3m-3 3h12M13.5 3l3 3m0 0l-3 3m3-3H6" /></svg> };
  if (code >= 95 && code <= 99) return { description: 'Thunderstorm', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 13.5l3-3h12l3 3-6 7.5h-4.5l-6-7.5z" /></svg> };
  return { description: 'Weather unavailable', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> };
};

interface WeatherData {
    temp: number;
    description: string;
    icon: JSX.Element;
}

export const Weather: React.FC = () => {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=50.69&longitude=-1.30&current=temperature_2m,weather_code&wind_speed_unit=mph&temperature_unit=celsius');
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                if (data && data.current) {
                    const info = getWeatherInfo(data.current.weather_code);
                    setWeather({
                        temp: Math.round(data.current.temperature_2m),
                        description: info.description,
                        icon: info.icon,
                    });
                } else {
                    throw new Error('Invalid weather data format');
                }
            } catch (err: any) {
                console.error("Failed to fetch weather:", err);
                setError('Could not retrieve weather');
            }
        };

        fetchWeather();
    }, []);

    const renderContent = () => {
        if (error) {
            return <span className="text-xs text-gray-400">{error}</span>;
        }
        if (!weather) {
            return <span className="text-xs text-gray-400">Loading weather...</span>;
        }
        return (
            <>
                {weather.icon}
                <span className="font-semibold">{weather.temp}°C</span>
                <span className="text-gray-300 hidden sm:inline">{weather.description}</span>
            </>
        );
    };

    return (
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 border-b border-white/10 text-white text-sm">
            <span className="font-serif-elegant text-base mr-auto">Isle of Wight</span>
            <div className="flex items-center gap-2">
                {renderContent()}
            </div>
        </div>
    );
};
