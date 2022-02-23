const delayReport = deplayMs => new Promise((resolve) => {
    setTimeout(resolve, deplayMs);
});

let clearNow = false

class VideoFootageStore {
    constructor(gameId) {
        this.gameId = gameId;
        this.currentTime = 0;
        this.footageInterval = null;
        this.headerPlaySequence = 0;
        this.playSequence = 0;
        this.sequence = 0;
        this.timestampWait = 0;
        this.isTimeStarted = false;
        this.automationTimestamp = null;
    }

    timeStart() {
        // if (t) {
        //     this.currentTime = t;
        // }

        // this.footageInterval = setInterval(() => {
        //     this.currentTime += 1;
        //     console.log(this.gameId + ' current time: ' + this.currentTime)
        // }, 1000)

        // clearNow = false;
        // this.interval(() => {
        //     this.currentTime += 1;
        //     console.log(this.gameId + ' current time: ' + this.currentTime)
        // }, 1000, 0);

        // clearNow = false;
        // this.setIntervalAsync(() => {
        //     this.currentTime += 1;
        //     console.log(this.gameId + ' current time: ' + this.currentTime)
        // }, 1000)


        this.isTimeStarted = true;
        clearNow = false;
        this.interval(() => {
            this.currentTime++;
            this.timestampWait++;
            console.log(this.gameId + ' current time: ' + this.timestampWait)
        }, 1000, 0);
    }

    timePause() {
        this.isTimeStarted = false
        clearNow = true;
    }

    timeStop() {
        // clearInterval(this.footageInterval);
        this.isTimeStarted = false
        this.currentTime = 0;
        this.timestampWait = 0
        clearNow = true;
    }

    resetCurrentTime() {
        this.currentTime = 0;
    }

    interval(func, wait, times) {
        const interv = function(w, t){
            return function(){
                if (!clearNow) {
                    setTimeout(interv, w);
                    try{
                        func.call(null);
                    }
                    catch(e){
                        t = 0;
                        throw e.toString();
                    }
                }
            };
        }(wait, times);

        setTimeout(interv, wait);
    };

    setIntervalAsync(fn, ms) {
        fn().then(() => {
            if (!clearNow) {
                setTimeout(() => this.setIntervalAsync(fn, ms), ms);
            }
        });
    };

}

module.exports = VideoFootageStore;