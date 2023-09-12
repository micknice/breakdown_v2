const Patrol = require('./Patrol')
const ClockStore = require('../../ClockStore/ClockStore')

class PatrolPool {
    constructor(patrolCount, iterationDuration) {
        this.patrolCount = patrolCount
        this.patrols = {}
        this.init = this.initializePatrols()
        this.patrolSync()

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

    getFreePatrolIdsAndCoords = () => {
        const freePatrols = Object.values(this.patrols).filter(patrol => !patrol.onJob).map(patrol => ({
            patrolId: patrol.patrolId,
            currentLocation: patrol.currentLocation
        }));
          return freePatrols
          
    }
    patrolSync = () => {
        setInterval(() => {
            for (const patrol in this.patrols) {
                this.patrols[patrol].updatePatrol()
            }

        }, 1000)
    }
}

module.exports = PatrolPool