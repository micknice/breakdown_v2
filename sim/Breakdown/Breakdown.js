class Breakdown {
    constructor(
        jobId, 
        memberId, 
        address, 
        postcode, 
        latitude, 
        longitude

        ) {

        this.jobId = jobId
        this.memberId = memberId
        this.address = address;
        this.postcode = postcode; 
        this.latitude = latitude
        this.longitude = longitude
    }
}

module.exports = Breakdown