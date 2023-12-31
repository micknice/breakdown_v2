const {checkValidMainlandLocation} = require('../../api/api')
const {getPatrolSpawnById} = require('../../db/model')
const fs = require('fs')
var amqp = require('amqplib/callback_api');


class Patrol {
    constructor(patrolId, onJob = false, iterationDuration) {
      this.patrolId = patrolId;
      this.onJob = onJob;
      this.iterationDuration
      this.assignedJob = null;
      this.assignedJobLoc = null;
      this.assignedIteration = 0
      this.spawnLocation = null; 
      this.currentLocation = null;
      this.spawnLocationDetails = null;
      this.routePath = null;
      this.travelTimeActualMins = null;
      this.routeInterval = null;
      this.assignedSimIteration = null;
      this.currentRouteIndex = 0;
      this.init = this.initSpawnLocation()
      this.iteration = 1
      this.fixInProgress = false
      this.iterationsUntilArrival
      this.iterationsUntilFixed = 0
      this.recieve = amqp.connect('amqp://localhost', (error0, connection) => {
            if (error0) {
                throw error0;
            }
            connection.createChannel((error1, channel) => {
                if (error1) {
                    throw error1;
                }
        
                const queue = `BreakdownToPatrol:${this.patrolId}`;
        
                channel.assertQueue(queue, {
                    durable: false
                });
        
                console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queue);
        
                channel.consume(queue, (msg) => {
                  console.log(" [x] Received %s", msg.content.toString());
                    const jsonObj =  JSON.parse(msg.content)
                    this.assignedJob = jsonObj.breakdown
                    this.assignedJobLoc = jsonObj.breakdown.coordinates
                    console.log('assignedJobLoc', this.assignedJobLoc)
                    this.assignedIteration = this.iteration
                    this.routePath = jsonObj.route.routePath
                    this.travelTimeActualMins = jsonObj.route.etaWithTraffic / 60
                    this.routeInterval = Math.floor(this.routePath.length / this.travelTimeActualMins)
                    this.iterationsUntilArrival = Math.floor(this.routePath.length/this.routeInterval)
                    this.onJob = true
                    console.log(`patrol:${patrolId} recieved and accepted job no.${jsonObj.breakdown.jobId}`)
                }, {
                    noAck: true
                });
            });
        });
    }
  
    initSpawnLocation = async() => {
      console.log(`initializing patrol ${this.patrolId} spawn location`)
        try {
          const roll = Math.floor(Math.random() * 499)
          this.spawnLocation = await getPatrolSpawnById(roll)
          console.log('spawnLoc', this.spawnLocation)
          this.currentLocation = this.spawnLocation
          console.log('Spawn Location:', this.spawnLocation); 
          console.log('CurrentLocation:', typeof(this.currentLocation.latitude))
        } catch (error) {
          console.error('Error setting spawn location:', error);
        }
      }

    // logLocData = () => {
    //   const jsonData = {
    //     patrolId: this.patrolId,
    //     spawnLocationDetails: this.spawnLocationDetails,
    //     currentLoc: this.currentLocation
    //   };
    //   const jsonString = JSON.stringify(jsonData, null, 2);
    //   const filePath = `./logs/${this.patrolId}.json`;
    //   fs.writeFile(filePath, jsonString, (err) => {
    //     if (err) {
    //       console.error('Error logging patrol loc data @ Patrol class:', err);
    //     } else {
    //       console.log('patrol loc data logged @ Patrol Class');
    //     }
    //   });
    // }
  
    updatePatrol = () => {
      this.iteration += 1
      console.log('!!!!!!!------', this.currentLocation)
      // handle job finished
      if(this.fixInProgress && this.iterationsUntilFixed === 0) {
        this.completeJob()
      } else if (this.fixInProgress && this.iterationsUntilFixed > 0){ 
        this.iterationsUntilFixed -= 1
        console.log('iterations til fixed:', this.iterationsUntilFixed )
      }
      if(this.onJob && 
        this.iteration > this.assignedIteration && 
        this.currentLocation.latitude !== this.assignedJobLoc[0] && 
        this.currentLocation.longitude !== this.assignedJobLoc[1]
        ) {
          // logic for every iteration cycle here
          const routeIndex = (this.iteration - this.assignedIteration) * this.routeInterval
          if (routeIndex < this.routePath.length) {
            // if en route
            this.currentLocation = this.routePath[routeIndex]
            this.iterationsUntilArrival -= 1
          } else if(!this.fixInProgress) {
            // if arrived
              console.log('arrived')
              this.iterationsUntilArrival = 0
              this.currentLocation = this.routePath[this.routePath.length - 1]
              this.fixTimeIterations = this.rollForFixTime()
              this.fixInProgress = true
          }
          console.log('routeInterval', this.routeInterval)
          console.log('iterations to arrival', this.iterationsUntilArrival)
          console.log(`!!! current location patrol ${this.patrolId}`, this.currentLocation, '!!! current location')
      }
    }

    rollForFixTime() {
      const fixTimeIterations = Math.floor((Math.random() * 60) / this.iterationDuration)
      return fixTimeIterations
    }

    completeJob() {
      console.log(`Patrol: ${this.patrolId} Job: ${this.assignedJob} Complete!!!`)

      // complete job logic next!!!
    }
  }

module.exports = Patrol