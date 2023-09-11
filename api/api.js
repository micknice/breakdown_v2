const ENV = process.env.NODE_ENV || 'dev'

require('dotenv').config({
  path: `${__dirname}/../.env.${ENV}`,
});
const axios = require('axios');

function getLatandLongByQuery(address, postCode) {
    const apiKey = process.env.BING_MAPS_API_KEY;
    return new Promise((resolve, reject) => {
      axios.get(`http://dev.virtualearth.net/REST/v1/Locations?countryRegion=uk&postalCode=${postCode}&addressLine=${address}&key=${apiKey}`)
        .then((response) => {
          const coordinates = response.data.resourceSets[0].resources[0].geocodePoints[0].coordinates;
          resolve(coordinates);
        })
        .catch((error) => {
          console.log(error, 'error');
          reject(error);
        });
    });
  }

  getDistanceAndTime = async(jobLoc, patrolLoc, patrolId) => {
    const apiKey = process.env.BING_MAPS_API_KEY;
    return new Promise((resolve, reject) => {
      axios.get(`http://dev.virtualearth.net/REST/v1/Routes?wayPoint.1=${patrolLoc}&wayPoint.2=${jobLoc}&optimize=time&routeAttributes=excludeItinerary,routePath&maxSolutions=1&distanceUnit=Mile&key=${apiKey}`)
        .then((response) => {
          const resObj = response.data.resourceSets[0].resources[0];
        //DISTANCE IN MILES ETA IN SECONDS
          const result = {
            'patrolId': patrolId,
            'distance': resObj.travelDistance,
            'eta': resObj.travelDuration,
            'etaWithTraffic': resObj.travelDurationTraffic,
            'routePath': resObj.routePath.line.coordinates
          };
          resolve(result);
        })
        .catch((error) => {
          console.log(error, 'error');
          reject(error);
        });
    });
  }
  
  function checkValidMainlandLocation(lat, long) {
    const latLong = `${lat},${long}`
    const apiKey = process.env.BING_MAPS_API_KEY;
    return new Promise((resolve, reject) => {
      axios.get(`http://dev.virtualearth.net/REST/v1/locationrecog/${latLong}?key=${apiKey}&includeEntityTypes=address&output=json`)
        .then((response) => {
        //   resArr contains object with address details if valid latLong else empty arr
          const resArr = response.data.resourceSets[0].resources[0].addressOfLocation
          resolve(resArr);
        })
        .catch((error) => {
          console.log(error, 'error');
          reject(error);
        });
    });
  }


  

module.exports = {getLatandLongByQuery, getDistanceAndTime, checkValidMainlandLocation}

