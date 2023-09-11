const { getMemberDetailsById } = require('../db/model');
const Breakdown = require('./Breakdown/Breakdown');
const breakdownToQueue = require('../rabbitmq/send');

interface Member {
    address_id: number;
    address: string;
    postcode: string;
    latitude: number;
    longitude: number;
}

class JobGenerator {
    projectedJobCountForDuration: number;
    simDuration: number;
    jobCount: number;
    jobMap: Map<number, typeof Breakdown>;
    iteration: number
    iterationDuration: number
    numIterations: number
    interval: ReturnType<typeof setInterval> | null


    constructor(projectedCount: number = 500, durationHours: number = 4, iterationDurationSecs: number = 5) {
        this.projectedJobCountForDuration = projectedCount;
        this.simDuration = durationHours * 60 * 60 * 1000;
        this.jobCount = 1;
        this.jobMap = new Map();
        this.iteration = 1
        this.iterationDuration = iterationDurationSecs * 1000
        this.numIterations = this.simDuration / this.iterationDuration
        this.interval = null
       
    }

    sendBreakddownToQueue(breakdown: typeof Breakdown) {

    }

    startSimulation() {
        this.interval = setInterval(async () => {
          // actions for each iteration 
          await this.rollForNewJob()
          this.iteration++;
    
          if (this.iteration > this.numIterations) {
            // this.stopSimulation();
            console.log('Simulation complete');
          }
        }, 5000); 
      }

    async rollForNewJob() {
        const prob = (this.projectedJobCountForDuration / this.simDuration) / 60;
        const roll = Math.random();
        if (roll < prob) {
            this.createNewBreakdown();
        }
    }

    createNewBreakdown() {
        const randomId = Math.floor(Math.random() * 1999);
        console.log(`LOGGING NEW BREAKDOWN: mbr id: ${randomId}`);

        getMemberDetailsById(randomId)
        .then((member: Member | null) => {
            if (member) {
                if (this.jobMap.has(randomId)) {
                    console.log(`Job in with memberID: ${randomId} - Re-rolling!!!`);
                    this.createNewBreakdown();
                } else {
                    const breakdown = new Breakdown(
                        this.jobCount, 
                        member.address_id, 
                        member.address, 
                        member.postcode, 
                        member.latitude, 
                        member.longitude
                        )

                    this.jobMap.set(this.jobCount, breakdown)
                    this.jobCount +=1
                }
            } else {
                this.createNewBreakdown();
            }
        });
    }
}

const sim = new JobGenerator()

sim.startSimulation()