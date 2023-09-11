


class Breakdown {

    jobId: number;
    memberId: number
    address: string;
    postcode: string;
    latitude: number;
    longitude: number;

    constructor(

        jobId:number, 
        memberId: number, 
        address: string, 
        postcode: string, latitude: number, 
        longitude: number

        ) {

        this.jobId = jobId
        this.memberId = memberId
        this.address = address;
        this.postcode = postcode; 
        this.latitude = latitude
        this.longitude = longitude
    }
}

export default Breakdown