#!/usr/bin/env node

var amqp = require('amqplib/callback_api');
const Breakdown = require('../sim/Breakdown/Breakdown')

const consume = () => {
    amqp.connect('amqp://localhost', function(error0, connection) {
                if (error0) {
                    throw error0;
                }
                connection.createChannel(function(error1, channel) {
                    if (error1) {
                        throw error1;
                    }
            
                    var queue = 'Breakdowns';
            
                    channel.assertQueue(queue, {
                        durable: false
                    });
            
                    console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queue);
            
                    channel.consume(queue, function(msg) {
                      console.log(" [x] Received %s", msg.content.toString());
                        const jsonObj =  JSON.parse(msg.content)
                        const breakdown = new Breakdown(
                          jsonObj.jobId,
                          jsonObj.memberId,
                          jsonObj.address,
                          jsonObj.postcode,
                          jsonObj.latitude,
                          jsonObj.longitude
                        )
    
                        return breakdown
                    }, {
                        noAck: true
                    });
                });
            });
}
const consumeBreakdownAndRoute = () => {
    amqp.connect('amqp://localhost', function(error0, connection) {
                if (error0) {
                    throw error0;
                }
                connection.createChannel(function(error1, channel) {
                    if (error1) {
                        throw error1;
                    }
            
                    var queue = 'Breakdowns';
            
                    channel.assertQueue(queue, {
                        durable: false
                    });
            
                    console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queue);
            
                    channel.consume(queue, function(msg) {
                      console.log(" [x] Received %s", msg.content.toString());
                        const jsonObj =  JSON.parse(msg.content)
                        
    
                        return jsonObj
                    }, {
                        noAck: true
                    });
                });
            });
}

module.exports = {consume, consumeBreakdownAndRoute}