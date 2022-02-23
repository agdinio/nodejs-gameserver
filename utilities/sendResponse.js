class Response {

    constructor(success, error, response) {
        this.version = '1.0'
        this.success = success
        this.error = error || ''
        this.response = response
    }

    toSend() {
        return {
            version: this.version,
            success: this.success,
            error: this.error,
            response: this.response
        }
    }

}

const sendResponse = (respond, success, error, response) => {
    const result = new Response(success, error, response)
    console.log('send response response', result.toSend())

    respond(result)
}

module.exports = sendResponse
