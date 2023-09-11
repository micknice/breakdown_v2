// const csvParser = require('csv-parser');
const csvParse = require('csv-parse');
const fs = require('fs');
const seed = require('./seed');
const db = require('./connection');
const path = require('path');
const csvParser = csvParse.parse;
const {getLatandLongByQuery} = require('../api/api')

function parseCSVFiles(directoryPath) {
    return new Promise((resolve, reject) => {
      fs.readdir(directoryPath, { withFileTypes: true }, (err, files) => {
        if (err) {
          reject(err);
          return;
        }
  
        const filePromises = files.map((file) => {
          const filePath = path.join(directoryPath, file.name);
  
          if (file.isFile() && path.extname(file.name) === '.csv') {
            return new Promise((resolveFile, rejectFile) => {
              const result = [];
  
              fs.createReadStream(filePath)
                .pipe(csvParser({bom: true}))
                .on('data', (data) => {

                    // console.log('!!!!', Object.keys(data))
                    // console.log('!!!!', data[0], data[1])
                    // console.log('!!!!', typeof(data.Postcode))
                  const formattedData = {
                    Address: data[0],
                    Postcode: data[1],
                    }
                  result.push(formattedData);
                })
                .on('end', () => {
                  resolveFile(result);
                })
                .on('error', (error) => {
                  rejectFile(error);
                });
            });
          }
  
          return Promise.resolve(null);
        });
  
        Promise.all(filePromises)
          .then((dataArray) => {
            const parsedDataArray = dataArray.filter(Boolean);
            
            resolve(parsedDataArray);
          })
          .catch((error) => {
            reject(error);
          });
      });
    });
  }

  parseCSVFiles('./data')
  .then(async(parsedDataArray) => {
    
    const flattenedDataArray = [].concat(...parsedDataArray);
    // console.log(flattenedDataArray)
    const dataArrayWithCoords = [];
    for(customer of flattenedDataArray) {
      const customerCopy = {...customer}
      const coords = await getLatandLongByQuery(customer.Address, customer.Postcode)
      customerCopy.latitude = coords[0]
      customerCopy.longitude = coords[1]
      dataArrayWithCoords.push(customerCopy)
      console.log(coords)      
    }
    return seed(dataArrayWithCoords);
  })
  
  .then(() => {
    db.end();
  })
  .catch((error) => {
    console.error(error);
  });