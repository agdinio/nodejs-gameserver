const ID = function() {
    const n = 90;
    let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let uuid = '';

    for (let i = 0; i < n; i++) {
        uuid += chars[Math.floor(Math.random() * chars.length)];
    }
    return '_' + uuid;
}

const userId = function() {
    // Math.random should be unique because of its seeding algorithm.
    // Convert it to base 16 (numbers + letters), and grab the first 16 characters
    // after the decimal.
//    return '_' + Math.random().toString(36).substr(2, 9);

    var S4 = () => {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
    }

    return (
        S4() +
        S4() +
        S4() +
        S4() +
        S4() +
        S4()
    ).toLowerCase()
}

const analyticsId = function() {
    var S4 = () => {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
    }

    return (
        S4() +
        S4() +
        S4() +
        S4() +
        S4() +
        S4() +
        S4() +
        S4() +
        S4() +
        S4() +
        S4() +
        S4() +
        S4() +
        S4() +
        S4() +
        S4() +
        S4() +
        S4() +
        S4() +
        S4()
    ).toLowerCase()
}

const anonymousUserToken = function(n) {
    var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var token = '';
    for (var i = 0; i < n; i++) {
        token += chars[Math.floor(Math.random() * chars.length)];
    }
    return token;
}

module.exports = {
    ID,
    userId,
    analyticsId,
    anonymousUserToken
}
