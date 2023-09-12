// const Patrol = require('./classes/patrol')
const BreakdownLog = require('./Breakdown/BreakdownLog')
// const IterationSummary = require('./reports/summary')
const {getMemberDetailsById} = require('../db/model')
// const {getLatandLongByQuery, getDistanceAndTime} = require('../api/api')
const fs = require('fs')
const amqp = require('amqplib/callback_api');
const PatrolPool = require('./Patrol/PatrolPool');
const { getDistanceAndTime } = require('../api/api');
const { breakdownToPatrol } = require('../rabbitmq/send')


class Allocation {
    constructor(patrolCount) {
        this.currentTime = new Date();
        this.currentTime.setHours(0, 0, 0, 0); // set the initial time to 00:00:00  
        this.patrolPool = new PatrolPool(patrolCount);        
        this.jobCount = 0;
        this.freePatrolIds = []
        this.jobMap = new Map();
        this.completedJobMap = new Map();
        this.stopNext = false;
        this.setupQueues()
    }

    setupQueues() {
      amqp.connect('amqp://localhost', (error0, connection) => {
        if (error0) {
          throw error0;
        }
        
        // this.BreakdownsConsumer
          connection.createChannel((error1, channel) => {
              if (error1) {
                  throw error1;
              }

              var queue = 'Breakdowns';

              channel.assertQueue(queue, {
                  durable: false
              });

              channel.consume(queue, async (msg) => {
                  console.log(" [x] Received %s", msg.content.toString());
                  const jsonObj = JSON.parse(msg.content);
                  await this.logNewBreakdown(jsonObj);
                  await this.assignFreeToQueued();
              }, {
                  noAck: true
              });

              this.BreakdownsConsumer = channel;
          });
          // this.PatrolPingsConsumer
          connection.createChannel((error2, channel2) => {

              if (error2) {
                  throw error2;
              }

              var queue2 = 'PatrolPings';

              channel2.assertQueue(queue2, {
                  durable: false
              });

              channel2.consume(queue2, async (msg) => {
                  // Handle messages from the second queue
                  console.log(" [x] Received from second queue: %s", msg.content.toString());
                  // Handle messages from this queue as needed
              }, {
                  noAck: true
              });

              // Save the second channel for the "OtherQueueName" queue for future use
              this.PatrolPingsConsumer = channel2;
          });
      });
  }
   

    

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

    logNewBreakdown = (breakdown) => {
      console.log('logging new breakdown')
      const newBreakdown = new BreakdownLog(
        this.jobCount,
        breakdown,
        this.currentTime);

      this.jobMap.set(this.jobCount, newBreakdown);
      const setJob = this.jobMap.get(this.jobCount);
      this.jobCount += 1;
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

    

      assignFreeToQueued = async() => {
        console.log('ASSIGNING PATROLS');
        this.jobMap.forEach(async(value, key) => {
            const activeJob = value;
            const jobLoc = `${value.latitude},${value.longitude}`;     
            if (!value.patrolAssigned  && !value.jobCompleted) {    
              const freePatrollArr = this.patrolPool.getFreePatrolIdsAndCoords()
              if (freePatrollArr.length > 0) {
                // console.log('freepatrolarry @ assign', freePatrollArr)
                const distanceAndTimeArray = []
                for (const patrol of freePatrollArr) {
                  const patrolLoc = `${patrol.currentLocation.latitude},${patrol.currentLocation.longitude}`
                  const distanceAndTime = await getDistanceAndTime(jobLoc, patrolLoc, patrol.patrolId)
                  distanceAndTimeArray.push(distanceAndTime)
                }
                // get closest patrol
                let finalClosestPatrol = null
                distanceAndTimeArray.forEach((patrol) => {
                    if (finalClosestPatrol === null || patrol.distance < finalClosestPatrol.distance) {
                        finalClosestPatrol = patrol;
                    }
                });
                const breakdownAndRoute = {breakdown: activeJob, route: finalClosestPatrol}
                breakdownToPatrol(breakdownAndRoute)
                value.patrolAssigned = true

              }     
            }     
        });
    }
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

    
  }
  
const allocation = new Allocation(5)


  
  
 

  module.exports = Allocation;
  

