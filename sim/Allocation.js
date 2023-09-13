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
                  console.log(" [x] Received from second queue: %s", msg.content.toString());
              }, {
                  noAck: true
              });

              this.PatrolPingsConsumer = channel2;
          });
      });
  }

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
  }
  
const allocation = new Allocation(1)

module.exports = Allocation;
  

