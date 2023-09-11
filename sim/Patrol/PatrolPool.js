const Patrol = require('./Patrol')

class PatrolPool {
    constructor(patrolCount) {
        
        this.patrolCount = patrolCount
        this.patrols = {}
        this.init = this.initializePatrols()

    }

    initializePatrols = () => {
        console.log('initializing patrol pool')
        for (let i = 0; i < this.patrolCount; i++) {
            const patrolId = i
            const newPatrol = new Patrol(patrolId)
            this.patrols[patrolId] = newPatrol  
            console.log(`patrol ${i} added to pool`)          
        }
    }

    getFreePatrolIdsAndCoords() {
        // console.log('this.patrols', this.patrols, 'this.patrols')

        const freePatrols = Object.values(this.patrols).filter(patrol => !patrol.onJob).map(patrol => ({
            patrolId: patrol.patrolId,
            currentLocation: patrol.currentLocation
        }));
        // console.log('!!!!', freePatrols, '!!!!')
        //   console.log(freePatrols, 'freePAt @  get')
          return freePatrols
          
    }
}

module.exports = PatrolPool