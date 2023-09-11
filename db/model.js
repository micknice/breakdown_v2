const format = require('pg-format');
const db = require('./connection');


const getMemberDetailsById = (id) => {
    console.log('getMemberDetailsById')
    return db.query(
        `SELECT * FROM addresses
        WHERE address_id = $1`, [id]
        )
    .then(result => {
        // console.log('model output', result.rows[0])
        return result.rows[0];
    })
}

const getPatrolSpawnById = async (id) => {
    return db.query(
        `SELECT * FROM patrol_spawns
        WHERE address_id = $1`, [id]
    )
    .then(result => {
        console.log('result at db', result.rows)
        return result.rows[0]
    })
}


module.exports = {getMemberDetailsById, getPatrolSpawnById}