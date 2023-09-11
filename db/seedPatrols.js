const format = require('pg-format');
const db = require('./connection');

const seedPatrolSpawns = (data) => {
    console.log('!!££', data[0])
    return db.query(`DROP TABLE IF EXISTS patrol_spawns;`)
    .then(() => {
        return db.query(`CREATE TABLE patrol_spawns (
            address_id SERIAL PRIMARY KEY,
            latitude NUMERIC,
            longitude NUMERIC
            
        );`)
        .then(() => {
            const queryStr = format(
                `INSERT INTO patrol_spawns (
                    latitude,
                    longitude            
                ) VALUES %L RETURNING *;`,
            data.map(({latitude, longitude}) => [                
                latitude,
                longitude
                ]) 
            );
            return db.query(queryStr)
        })
        .then(() => {
            return db.query(`SELECT * FROM patrol_spawns;`)
            .then(result => {
                const results = result.rows
                console.log(results.length)
            })
        })
    })
    
}

module.exports = seedPatrolSpawns;