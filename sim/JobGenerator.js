const { getMemberDetailsById } = require('../db/model');
const Breakdown = require('./Breakdown/Breakdown');
const { breakdownToQueue } = require('../rabbitmq/send');

class JobGenerator {
    constructor(projectedCount = 400, durationHours = 4, iterationDurationSecs = 5) {
        this.projectedJobCountForDuration = projectedCount;
        this.simDurationHours = durationHours
        this.simDuration = durationHours * 60 * 60 * 1000;
        this.jobCount = 1;
        this.jobMap = new Map();
        this.iteration = 1
        this.iterationDuration = iterationDurationSecs * 1000
        this.numIterations = this.simDuration / this.iterationDuration
        this.interval = null
       
    }

    rollForNewJob = async() => {
        console.log('rolling for new job')
        const prob = (this.projectedJobCountForDuration / this.simDurationHours) / 60;
        const roll = Math.random();
        console.log('roll:', roll, 'prob:', prob)
        if (roll < prob) {
            this.createNewBreakdown();
        }
    }

    sendBreakdownToQueue = (breakdown) => {
        console.log('sending to queue')
        return new Promise((resolve, reject) => {
            breakdownToQueue(breakdown, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    startGenerating = async() => {
        this.interval = setInterval(async () => {
            // actions for each iteration
            await this.rollForNewJob();
            this.iteration++;
            console.log('!!!!!');
    
            if (this.iteration > this.numIterations) {
                clearInterval(this.interval);
                console.log('Simulation complete');
            }
        }, 10000);
    }

    createNewBreakdown = () => {
        console.log('creatingnew breakdown')
        const randomId = Math.floor(Math.random() * 1999);
        console.log(`LOGGING NEW BREAKDOWN: mbr id: ${randomId}`);

        getMemberDetailsById(randomId)
        .then((member) => {
            if (member && 
                member.address_id && 
                member.address && 
                member.postcode && 
                member.latitude && 
                member.longitude
                ) {
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
                        console.log('BREAKDOWN!!!!', breakdown)
                    this.jobMap.set(randomId, breakdown)
                    this.jobCount +=1
                    this.sendBreakdownToQueue(breakdown)
                }
            } else {
                const breakdown = new Breakdown(
                    this.jobCount, 
                    member.address_id, 
                    member.address, 
                    member.postcode, 
                    member.latitude, 
                    member.longitude
                    )
                this.createNewBreakdown(breakdown);
            }
        });
    }
}

const sim = new JobGenerator()

sim.startGenerating()