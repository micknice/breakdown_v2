// const Patrol = require('./classes/patrol')
const BreakdownLog = require('./Breakdown/BreakdownLog')
// const IterationSummary = require('./reports/summary')
const {getMemberDetailsById} = require('../db/model')
// const {getLatandLongByQuery, getDistanceAndTime} = require('../api/api')
const fs = require('fs')
const amqp = require('amqplib/callback_api');

class Allocation {
    constructor() {
        this.currentTime = new Date();
        this.currentTime.setHours(0, 0, 0, 0); // set the initial time to 00:00:00  
        this.patrols = {};        
        this.jobCount = 0;
        this.jobMap = new Map();
        this.completedJobMap = new Map();
        this.stopNext = false;
        this.recieve = amqp.connect('amqp://localhost', (error0, connection) => {
            if (error0) {
                throw error0;
            }
            connection.createChannel((error1, channel) => {
                if (error1) {
                    throw error1;
                }
        
                var queue = 'Breakdowns';
        
                channel.assertQueue(queue, {
                    durable: false
                });
        
                console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queue);
        
                channel.consume(queue, (msg) => {
                  console.log(" [x] Received %s", msg.content.toString());
                    const jsonObj =  JSON.parse(msg.content)
                    // const breakdown = new Breakdown(
                    //   jsonObj.jobId,
                    //   jsonObj.memberId,
                    //   jsonObj.address,
                    //   jsonObj.postcode,
                    //   jsonObj.latitude,
                    //   jsonObj.longitude
                    // )
                    // console.log('breakdown!!!!', breakdown)

                    this.logNewBreakdown(jsonObj)
                }, {
                    noAck: true
                });
            });
        });
        
    }
   

    // initializePatrols() {
    //     for (let i = 0; i < this.patrolCount; i++) {
    //         const patrolId = `patrol${i}`
    //         const newPatrol = new Patrol(patrolId)
    //         this.patrols[patrolId] = newPatrol            
    //     }
    // }

    // getPatrolCoordsForGUI() {
    //   const patrolData = [];

    //   for (const patrolId in this.patrols) {
    //     const patrol = this.patrols[patrolId];
    //     patrolData.push({
    //       latitude: patrol.currentLocation[0],
    //       longitude: patrol.currentLocation[1],          
    //     });
    //   }
    //   return patrolData;
    // }
    // getPatrolDataForGUI() {
    //   const patrolData = {
    //   };
    //   for (const patrolId in this.patrols) {
    //     const patrol = this.patrols[patrolId];
    //     patrolData[patrolId] = {
    //       patrolId: patrol.patrolId,
    //       onJob: patrol.onJob,
    //       assignedJob: patrol.assignedJob,
    //       assignedJobLoc: patrol.assignedJobLoc,
    //       currentLocation: patrol.currentLocation,
    //     };
    //   }
    //   return patrolData;
    // }

    async logNewBreakdown(breakdown) {
      const newBreakdown = new BreakdownLog(
        this.jobCount,
        breakdown,
        this.currentTime);

      this.jobMap.set(this.jobCount, newBreakdown);
      const setJob = this.jobMap.get(this.jobCount);
      console.log('setJob', setJob)
      this.jobCount += 1;
      console.log(this.jobCount)
    }
      // getAllJobsWithNoAssignedPatrol() {
      //   const unassignedJobsArr = []
      //   if (this.jobMap.size > 0) {
      //     this.jobMap.forEach((value, key) => {
      //       if(value.patrolAssigned === false) {
      //         unassignedJobsArr.push(value.jobId)
      //       }
      //     })
      //   }

      //   return unassignedJobsArr;
      // }
    //   getAllUnassignedPatrols() {
    //     const unassignedPatrolsArr = []
    //     Object.entries(this.patrols).map(([patrolKey, patrolValue]) => {
    //       if (patrolValue.onJob === false) {
    //         unassignedPatrolsArr.push(patrolValue.patrolId)
    //       }
    //     })
    //     return unassignedPatrolsArr;
    //   }

    //   getJobLocs() {
    //     const jobLocsArr = [];
    //     const values = this.jobMap.values()
    //     for (const x of values) {
    //       jobLocsArr.push(x.coordinates)
    //     }
    //     return jobLocsArr
    //   }


      async assignFreePatrolsToQueued() {
        console.log('ASSIGNING PATROLS');
        // loop through jobs map and check for patrolAssigned
        this.jobMap.forEach((value, key) => {
            const activeJob = value;
            const jobLoc = `${value.coordinates[0]},${value.coordinates[1]}`;     
            // if no patrol assigned map through patrols, check if patrol currently assigned
            // if not assigned then add to a list of Promises to get distance and estimated travel time from API
            if (value.patrolAssigned === false && value.jobCompleted === false) {         
                const closestPatrolPromises = Object.entries(this.patrols).map(([patrolKey, patrolValue]) => {
                    if (patrolValue.onJob === false) {
                      console.log('!!!!!',patrolValue.onJob)
                        const patrolLoc = `${patrolValue.currentLocation[0]},${patrolValue.currentLocation[1]}`;
                        console.log('patrolLoc', patrolLoc, "!!!!!!")
                        console.log('jobLoc', jobLoc)
                        return getDistanceAndTime(jobLoc, patrolLoc)
                            .then((resObj) => ({
                                patrolId: patrolValue.patrolId,
                                distance: Number(resObj.distance), 
                                eta: resObj.eta,
                                etaWithTraffic: resObj.etaWithTraffic,
                                routePath: resObj.routePath
                            }))
                            .catch((error) => {
                                console.log(error);
                                return null;
                            });
                    }
                    return null;
                });
                // cash in promises
                Promise.all(closestPatrolPromises)
                    .then((closestPatrols) => {
                        const filteredClosestPatrols = closestPatrols.filter((patrol) => patrol !== null);
                        if(filteredClosestPatrols.length > 0) {
                          // find the closest patrol
                          let finalClosestPatrol = null;
                          filteredClosestPatrols.forEach((patrol) => {
                            console.log(patrol.patrolId)
                              if (finalClosestPatrol === null || patrol.distance < finalClosestPatrol.distance) {
                                  finalClosestPatrol = patrol;
                              }
                          });
                          const fixTimeMins = this.rollForFixTimeInMinutes()
                          const travelTimeMins = this.rollForTravelTimeInMinutes(finalClosestPatrol.eta, finalClosestPatrol.etaWithTraffic)
                          const totalTimeFromAssignment = fixTimeMins + travelTimeMins;
                          const completionTime = this.addSeconds(this.currentTime, totalTimeFromAssignment*60)
                          
                          // assign closest patrol to job
                          this.patrols[finalClosestPatrol.patrolId].onJob = true;
                          this.patrols[finalClosestPatrol.patrolId].assignedJob = activeJob.jobId;
                          this.patrols[finalClosestPatrol.patrolId].assignedJobLoc = activeJob.coordinates;
                          this.patrols[finalClosestPatrol.patrolId].routePath = finalClosestPatrol.routePath;
                          this.patrols[finalClosestPatrol.patrolId].travelTimeActualMins = travelTimeMins;
                          this.patrols[finalClosestPatrol.patrolId].routeInterval = this.getRouteInterval(travelTimeMins, finalClosestPatrol.routePath.length);
                          this.patrols[finalClosestPatrol.patrolId].assignedSimIteration = this.iteration;
                          
                          this.logAssignedJobToJson(finalClosestPatrol, activeJob, this.getRouteInterval(travelTimeMins, finalClosestPatrol.routePath.length), travelTimeMins)
                          // update job as assigned with eta, patrolAssigned etc.
                          const updateActiveJob = {...this.jobMap.get(activeJob.jobId)}
                          // console.log('updateActiveJob', updateActiveJob)
                          // console.log('updateActiveJob', updateActiveJob)
                          updateActiveJob.patrolAssigned = true;
                          const dateCopy = new Date(this.currentTime);
                          updateActiveJob.assignmentTime = dateCopy;
                          updateActiveJob.travelTimeActual = travelTimeMins;
                          updateActiveJob.completionTime = completionTime;                                               
                          updateActiveJob.eta = finalClosestPatrol.eta;
                          updateActiveJob.etaWithTraffic = finalClosestPatrol.etaWithTraffic;
                          updateActiveJob.patrolId = finalClosestPatrol.patrolId;
                          this.jobMap.set(activeJob.jobId, updateActiveJob)                                              
                        }
                    })
                    .catch((error) => {
                        console.log(error);
                    });
            }
        });
    }

    // logAssignedJobToJson(finalClosestPatrol, activeJob, routeInterval) {
    //   const filePath = `./logs/${finalClosestPatrol.patrolId}.json`;
    //   try {
    //     const jsonString = fs.readFileSync(filePath, 'utf8');
    //     const jsonObj = JSON.parse(jsonString);
    //     //if first job of sim
    //     if (jsonObj.hasOwnProperty('assignedJobs')) {
    //       const keysArr = Object.keys(jsonObj.assignedJobs)
    //       const jobLogNum = `job${keysArr.length +1}`;
    //       jsonObj.assignedJobs[jobLogNum] = {};
    //       jsonObj.assignedJobs[jobLogNum].jobId = activeJob.jobId;
    //       jsonObj.assignedJobs[jobLogNum].assignedJobLoc = activeJob.coordinates;
    //       jsonObj.assignedJobs[jobLogNum].routePath = finalClosestPatrol.routePath;
    //       jsonObj.assignedJobs[jobLogNum].routeInterval = routeInterval
    //       jsonObj.assignedJobs[jobLogNum].assignedSimIteration = this.iteration;
        
    //     // any job after first assigned job
    //     } else {
    //       const jobLogNum = 'job1';
    //       jsonObj.assignedJobs = {};
    //       jsonObj.assignedJobs[jobLogNum] = {};
    //       jsonObj.assignedJobs[jobLogNum].jobId = activeJob.jobId;
    //       jsonObj.assignedJobs[jobLogNum].assignedJobLoc = activeJob.coordinates;
    //       jsonObj.assignedJobs[jobLogNum].routePath = finalClosestPatrol.routePath;
    //       jsonObj.assignedJobs[jobLogNum].routeInterval = routeInterval
    //       jsonObj.assignedJobs[jobLogNum].assignedSimIteration = this.iteration;
    //       jsonObj.pingsArr = [jsonObj.currentLoc];

    //     }
    //     const jsonWriteString = JSON.stringify(jsonObj, null, 2);
    //     fs.writeFile(filePath, jsonWriteString, (err) => {
    //       if (err) {
    //         console.error('log assign job error:', err);
    //       } else {
    //         console.log('JSON data has been written to the file successfully.');
    //       }
    //     });


    //   } catch (err) {
    //     console.log('error logging assigned job to json', err.message)
    //   }

    // }
    // logPingsToJson(patrolForUpdate, newLoc, currentRouteIndex, routePathLength) {
    //   console.log(newLoc)
    //   const filePath = `./logs/${patrolForUpdate.patrolId}.json`;
    //   try {
    //     const jsonString = fs.readFileSync(filePath, 'utf8');
    //     const jsonObj = JSON.parse(jsonString);        
    //     jsonObj.pingsArr.push(newLoc, patrolForUpdate.onJob, currentRouteIndex, routePathLength)       
    //     const jsonWriteString = JSON.stringify(jsonObj, null, 2);
    //     fs.writeFile(filePath, jsonWriteString, (err) => {
    //       if (err) {
    //         console.error('Error writing JSON file:', err);
    //       } else {
    //         console.log('JSON data has been written to the file successfully.');
    //       }
    //     });

    //   } catch (err) {
    //     console.log('log ping error', err.message)
    //   }

    // }

    // completeJobsAndDeassignPatrols() {
    //   this.jobMap.forEach((value, key) => {
    //     const activeJob = {...this.jobMap.get(value.jobId)};
    //     if (activeJob.patrolAssigned && this.currentTime > activeJob.completionTime) {
    //       console.log('complete jobs activeJobId and currentLoc', activeJob.jobId, activeJob.coordinates)
    //       console.log('COMPLETING AND DEASSIGNING')
    //       activeJob.jobCompleted = true;
    //       this.completedJobMap.set(activeJob.jobId, activeJob)
    //       this.patrols[activeJob.patrolId].onJob = false;
    //       this.patrols[activeJob.patrolId].assignedJob = null;
    //       this.patrols[activeJob.patrolId].assignedJobLoc = null;
    //       this.patrols[activeJob.patrolId].routePath = null;
    //       this.patrols[activeJob.patrolId].travelTimeActualMins = null;
    //       this.patrols[activeJob.patrolId].routeInterval = null;
    //       this.patrols[activeJob.patrolId].assignedSimIteration = null;
    //       this.patrols[activeJob.patrolId].currentRouteIndex = 0;
    //       this.patrols[activeJob.patrolId].currentLocation = activeJob.coordinates;
    //       console.log('this.patrols[activeJob.patrolId].currentLocation', this.patrols[activeJob.patrolId].currentLocation)
    //       this.jobMap.delete(value.jobId)
    //     }
    //   })
    // }


    
    // updateActivePatrolsLocation() {
    //   console.log('UPDATING PATROL LOCATIONS')
    //   for (const patrol in this.patrols) {
    //     if (this.patrols[patrol].onJob && 
    //     this.iteration > this.patrols[patrol].assignedSimIteration && 
    //     this.patrols[patrol].currentLocation[0] !== this.patrols[patrol].assignedJobLoc[0] && 
    //     this.patrols[patrol].currentLocation[1] !== this.patrols[patrol].assignedJobLoc[1]) {
    //       if (this.patrols[patrol].currentRouteIndex + this.patrols[patrol].routeInterval < this.patrols[patrol].routePath.length) {
    //         this.patrols[patrol].currentRouteIndex += this.patrols[patrol].routeInterval;
    //         this.patrols[patrol].currentLocation = this.patrols[patrol].routePath[this.patrols[patrol].currentRouteIndex];
    //         this.logPingsToJson(this.patrols[patrol], this.patrols[patrol].currentLocation, this.patrols[patrol].currentRouteIndex, this.patrols[patrol].routePath.length);
    //       } else {
    //         this.patrols[patrol].currentRouteIndex = this.patrols[patrol].routePath.length - 1;
    //         this.patrols[patrol].currentLocation = this.patrols[patrol].assignedJobLoc;
    //         this.logPingsToJson(this.patrols[patrol], this.patrols[patrol].currentLocation, this.patrols[patrol].currentRouteIndex, this.patrols[patrol].routePath.length);
    //       }
    //     }
    //   }
    // }

    // rollForFixTimeInMinutes() {
    //   const fixTime = Math.random() * (60 - 10) + 10;
    //   return fixTime
    // }

    // rollForTravelTimeInMinutes(eta, etaWithTraffic) {
    //   const travelTime = Math.random() * (etaWithTraffic - eta) + eta
    //   return travelTime /60
    // }   
    
    
    // getRouteInterval(travelTimeActualMins, routePathArrLength) {
    //   const intervalMins = travelTimeActualMins / 5;
    //   const arrInterval = Math.floor(routePathArrLength / intervalMins)
    //   return arrInterval;
    // }

    // addSeconds(date, seconds) {
    //   const dateCopy = new Date(date);
    //   dateCopy.setSeconds(date.getSeconds() + seconds);    
    //   return dateCopy;
    // }

    // getUnassignedPatrols() {
    //   let count = 0;
    //   for (const [key, value] of Object.entries(this.patrols)) {
    //     if (value.onJob === false) {
    //       count += 1;
    //     }
    //   }
    //   return count;
    // }

    // getAssignedPatrols() {
    //   let count = 0;
    //   for (const [key, value] of Object.entries(this.patrols)) {
    //     if (value.onJob === true) {
    //       count += 1;
    //     }
    //   }
    //   return count;
    // }

    // getIterationSummary() {
    //   const iterationSummary = new IterationSummary(
    //     this.iteration, 
    //     this.currentTime, 
    //     this.jobCount, 
    //     this.completedJobMap.size, 
    //     this.jobMap.size, 
    //     this.getAssignedPatrols(), 
    //     this.getUnassignedPatrols()
    //     )
    //     return iterationSummary
    // }

    
 
    // startSimulation() {
      
    //   this.interval = setInterval(async () => {
    //     // actions for each iteration 
    //     const hours = this.currentTime.getHours().toString().padStart(2, '0');
    //     const minutes = this.currentTime.getMinutes().toString().padStart(2, '0');
    //     const seconds = this.currentTime.getSeconds().toString().padStart(2, '0');
    //     this.updateActivePatrolsLocation();
    //     await this.rollForNewJob()
    //     await this.assignFreePatrolsToQueued();
    //     await this.completeJobsAndDeassignPatrols();

    //     const iterationSummary = new IterationSummary(this.iteration, this.currentTime, this.jobCount, this.completedJobMap.size, this.jobMap.size, this.getAssignedPatrols(), this.getUnassignedPatrols())
    //     console.log(iterationSummary);
    //     // increment iteration and time
    //     this.iteration++;
    //     this.currentTime.setTime(this.currentTime.getTime() + this.iterationDuration);
        
  
  
    //     if (this.iteration > this.numIterations) {
    //       this.stopSimulation();
    //       console.log('Simulation complete');
    //     }
    //   }, 5000); 
    // }


  
    // stopSimulation() {
    //   // console.log('patrolount @ stopSim', this.patrolCount)
    //   console.log('iteration @ stopSim', this.iteration)
    //   console.log('!!!', this.interval)
    //   clearInterval(this.interval);
    // }

    // forceStop() {

    // }
  }
  
const allocation = new Allocation()


  
  
 

  module.exports = Allocation;
  

