const {getLatandLongByQuery} = require('../../api/api')

class BreakdownLog {
    constructor(jobId, breakdown, logTime) {
        this.jobId = jobId
        this.memberId = breakdown.memberId
        this.address = breakdown.address;
        this.postCode = breakdown.postcode ; 
        this.coordinates = [breakdown.latitude, breakdown.longitude];
        this.latitude = breakdown.latitude
        this.longitude = breakdown.longitude
        this.logTime = logTime;
        this.patrolAssigned = false;
        this.patrolId = null;
        this.assignmentTime = null;
        this.eta = null;
        this.etaWithTraffic = null;
        this.jobCompleted = false;
        this.completionTime = null;
    }
}

module.exports = BreakdownLog