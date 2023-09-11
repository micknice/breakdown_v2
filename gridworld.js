class GridWorld {
    constructor() {

        grid: [
            [new GridSqr(0, 0),new GridSqr(0, 1),new GridSqr(0, 2),new GridSqr(0, 3)],
            [new GridSqr(1, 0),new GridSqr(1, 1),new GridSqr(1, 2),new GridSqr(1, 3)],
            [new GridSqr(2, 0),new GridSqr(2, 1),new GridSqr(2, 2),new GridSqr(2, 3)],
            [new GridSqr(3, 0),new GridSqr(3, 1),new GridSqr(3, 2),new GridSqr(3, 3)]
        ]
        
    }
}

class GridSqr {
    constructor(x, y) {
        x: x
        y: y
        reward: reward
    }

    viable() {
        if (nextSqr.x === thisSqr.x +1 || nextSqr.x === thisSqr.x +1) {
            if(nextSqr.y === thisSqr.y +1 || nextSqr.y === thisSqr.y +1) {

            }
        }

    }
}


class Agent {
    constructor() {
        this.position = position
        this.stepsTaken
        this.cumulativeReward
        this.episode = []
        this.episodeOver = false
        this.policy = [
            [[[0,0], 0, 0], [[0,0], 0, 0], [[0,0], 0, 0], [[0,0], 0, 0]],
            [[[0,0], 0, 0], [[0,0], 0, 0], [[0,0], 0, 0], [[0,0], 0, 0]],
            [[[0,0], 0, 0], [[0,0], 0, 0], [[0,0], 0, 0], [[0,0], 0, 0]],
            [[[0,0], 0, 0], [[0,0], 0, 0], [[0,0], 0, 0], [[0,0], 0, 0]]
        ]



    }


    

    takeStep() {
        const rollForDirection  = Math.floor(Math.random()  *  3)

        let stepX = 0
        let stepY = 0

        switch(rollForDirection) {
            case 0: 
                stepY -=1
                break;
            case 1:
                stepX +=1
                break;
            case 2: 
                stepY +=1
                break;
            case 3:
                stepX -=1
                break;

        }


    }

    updatePolicy() {

        const revEp = this.episode.reverse()

        for(i = 0; i < revEp.length; i++) {
            if(revEp[i][1] <= this.cumulativeReward) {
                const policyUpdate = [[revEp[0, 0], 1, ], [], ]
            }
        }

        
    }

    addStepToEpisode() {
        const step = [[]]

    }

    
}























































// populate GridWorld
// create a way to execute an agen't policy through the gridworld
// add randomness to the agent policy
// print what happens on the way
// initialise the policy at 0, and take the largest value, or random with p eps.
// execute the loop, updating the policy

