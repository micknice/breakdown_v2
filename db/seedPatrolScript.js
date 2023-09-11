const seedPatrolSpawns = require('./seedPatrols');
const db = require('./connection');
const Patrol = require('../simulation/classes/patrol')

async function getPatrolSpawns(patrolCount) {
  const spawnArr = [];
  for (let i = 0; i < patrolCount; i++) {
    const patrol = new Patrol(i + 1);
    await patrol.initSpawnLocation();
    const coords = { latitude: patrol.spawnLocation[0], longitude: patrol.spawnLocation[1] };
    spawnArr.push(coords);

    // Add a 500ms delay after each iteration
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return spawnArr;
}
  
getPatrolSpawns(200)
.then(spawnArr => {
  console.log(spawnArr.length)
  seedPatrolSpawns(spawnArr)
  .then(() => {
    db.end()
  })
  .catch((error) => {
    console.error(error);
  });

})




