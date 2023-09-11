const format = require('pg-format');
const db = require('./connection');

const seed = (data) => {
    console.log('!!££', data[0])
    return db.query(`DROP TABLE IF EXISTS addresses;`)
    .then(() => {
        return db.query(`CREATE TABLE addresses (
            address_id SERIAL PRIMARY KEY,
            address VARCHAR,
            postcode VARCHAR,
            latitude NUMERIC,
            longitude NUMERIC
            
        );`)
        .then(() => {
            const queryStr = format(
                `INSERT INTO addresses (
                    address,
                    postcode,
                    latitude,
                    longitude            
                ) VALUES %L RETURNING *;`,
            data.map(({Address, Postcode, latitude, longitude}) => [
                Address, 
                Postcode,
                latitude,
                longitude
                ]) 
            );
            return db.query(queryStr)
        })
        .then(() => {
            return db.query(`SELECT * FROM addresses;`)
            .then(result => {
                const results = result.rows
                console.log(results.length)
            })
        })
    })
    
}

module.exports = seed;