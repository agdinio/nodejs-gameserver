class UserStore {
    constructor(gameStore, playStore, userDbComponent) {
        this.gameStore = gameStore
        this.playStore = playStore
        this.userDbComponent = userDbComponent
    }

    getInfo(gameId) {
        return this.gameStore.getInfo(gameId)
    }

    initPlays(gameId) {
        return this.playStore.initPlays(gameId)
    }

    login(args) {
        return this.userDbComponent.login(args)
    }

    getHistoryPlays(args) {
        return this.userDbComponent.getHistoryPlays(args)
    }

    // anonymousUserInfo(gameId, user) {
    //     let info = {profile: null, historyPlays: []};
    //     this.userDbComponent.anonymousLogin(user)
    //         .then(profile => {
    //             info.profile = profile
    //             return this.getHistoryPlays({gameId: gameId, userId: profile.anonymousUserId})
    //         })
    //
    //
    // }
}

module.exports = UserStore