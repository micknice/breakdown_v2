
const amqp = require('amqplib/callback_api');

const breakdownToQueue = (breakdown) => {
    console.log('invoked')
    amqp.connect('amqp://localhost', function(error0, connection) {
        if (error0) {
            throw error0;
        }
        connection.createChannel(function(error1, channel) {
            if (error1) {
                throw error1;
            }
            const jsonStr = JSON.stringify(breakdown);
            console.log('jsonStr', jsonStr)
            const queue = 'Breakdowns';
    
            channel.assertQueue(queue, {
                durable: false
            });
            channel.sendToQueue(queue, Buffer.from(jsonStr));
    
            console.log(" [x] Sent %s", jsonStr);

            channel.close(function(err) {
                if (err) {
                    throw err;
                }
                connection.close();
            });
        });
        
    });
}
const breakdownToPatrol = (breakdownAndRoute) => {
    console.log('invoked')
    amqp.connect('amqp://localhost', function(error0, connection) {
        if (error0) {
            throw error0;
        }
        connection.createChannel(function(error1, channel) {
            if (error1) {
                throw error1;
            }
            const jsonStr = JSON.stringify(breakdownAndRoute);
            // console.log('jsonStr', jsonStr)
            const queue = `BreakdownToPatrol:${breakdownAndRoute.route.patrolId}`
    
            channel.assertQueue(queue, {
                durable: false
            });
            channel.sendToQueue(queue, Buffer.from(jsonStr));
    
            console.log(" [x] Sent %s", jsonStr);

            channel.close(function(err) {
                if (err) {
                    throw err;
                }
                connection.close();
            });
        });
        
    });
}


module.exports = {breakdownToQueue, breakdownToPatrol}