const express = require('express');
const moment = require('moment-timezone');
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;
//public
app.use(express.static(path.join(__dirname, 'public')));
// ejs config
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

const cities = ['KOLKATA', 'MUMBAI', 'DELHI', 'CHENNAI'];

const apiKeys = [
    {
        key: "1bb751943343a500033cd1cfc600b9f3",
        called: 0
    },
    {
        key: "962aee98de076486dacce0146d97ad92",
        called: 0
    }
    // {
    //     key: "e93932794bcd01593299b3e3db4d687f",
    //     called: 0
    // }  
];

app.post('/fetch-weather-data', async (req, res) => {    
    // use promise all to fetch all cities weather data parallely

    try {

        //fetch the last updated time (file) weather data foo index 0 

        const filePath = path.join(__dirname, `data/${cities[0]}.json`);
        const fileStats = fs.statSync(filePath);

        // check if the file is older than 30 minutes
        console.log(fileStats.mtime);
        if (fileStats.mtimeMs > (new Date().getTime() - 1 * 60 * 1000)) {            
            return res.json({ message: 'Weather data is up to date', status: 200 });            
        }

        await Promise.all(cities.map(city => fetchSingleCityWeather(city)));
        res.json({ message: 'Weather data fetched successfully', status: 200 });
    } catch (error) {
        console.log(error);
        res.json({ message: 'Failed to fetch weather data', status: 500 });        
    }    
});

const fetchSingleCityWeather = async (city) => {

    // find the api key with minimum called
    const apiKey = apiKeys.reduce((prev, current) => {
        return (prev.called < current.called) ? prev : current;
    });

    // increment the called count and save into apiKeys array    
    apiKey.called++;    
    console.log(`Fetching weather data for ${city} using ${apiKey.key}`);

    // log the all api keys with called count
    console.log(apiKeys);

     //fetch data and save into data/${city}.json
    const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey.key}`);

    if (response.data.cod === 200) {
        const data = response.data;
        const filePath = path.join(__dirname, `data/${city}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data));
        console.log(`Weather data for ${city} saved successfully`);
        return true;
    }

    return false;    
};


app.get('/', (req, res) => {
    const city = req.query.city.toUpperCase();
    if(!cities.includes(city)){
        res.send("City Not Exist in our system");
    }
    let weatherData  = fs.readFileSync(path.join(__dirname,"data",`${city}.json`))
    weatherData = JSON.parse(weatherData);
    // console.log(JSON.parse(weatherData));
    // console.log(weatherData);
    const istTimestamp = moment().tz("Asia/Kolkata").unix();
    let timeStatus = "day";
    let weatherStatus = "clear";
    console.log(istTimestamp);
    if(istTimestamp>=weatherData.sys.sunset ){
        timeStatus = "night";
    }
    if(weatherData.weather.filter((weather) => weather.main === "Clouds").length > 0){
        weatherStatus = "cloud";
    }
    if(weatherData.weather.filter((weather) => weather.main === "Rain").length > 0){
        weatherStatus = "rain";
    }

    if(weatherData.weather.filter((weather) => weather.main === "Snow").length > 0){
        weatherStatus = "snow";
    }
    
    if(weatherData.weather.filter((weather) => weather.main === "Thunderstorm").length > 0){
        weatherStatus = "thunderstorm";
    }   
 
    
    res.render(`${timeStatus}-${weatherStatus}`, {weatherData,city});
    // res.render('day-snow',{weatherData,city});
    

});



app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);    
});

cron.schedule('* * * * *', async () => {    
    // axios call /fetch-weather-data
    try {
        await axios.post('http://localhost:3000/fetch-weather-data');
        console.log('Weather data fetched successfully');
    } catch (error) {
        console.log('Failed to fetch weather data');
    }   
});