let accountSid =  process.env.ACCOUNTSID   // twilio account sid
let authToken =  process.env.AUTHTOKEN     // twilio auth token
let serviceId =  process.env.SERVICEID     // twilio service Id
const client = require('twilio')(accountSid, authToken);   // connect twilio service into our server

/* Send SMS to the user by twilo service */
const sendSms = async (req , res) =>{
    const { from_address , to_address , body } = req.body
    
    try {
        if(! from_address || !to_address || !body ){
            return res.status(400).send({
                status :400,
                error : "Mandatory feilds are required!"
            })
        }
        await client.messages
            .create({
                body,
                from :from_address,
                to :to_address
            })
            .then(message =>{
                return res.status(200).send(message)
            }).catch((err)=>{
                return res.status(400).send(err) 
            });
    } catch (error) {
        return res.status(400).send(error)
    } 
}

/* validation of the phone number */
const validationPhoneNumber = async (req , res) =>{
    const { phone_number } = req.body
    try {    
        if(! phone_number ){
            return res.status(400).send({
                status :400,
                error : "Mandatory feilds are required!"
            })
        }       
        await client.lookups.v1.phoneNumbers(phone_number)
            .fetch()
            .then(response =>{
                   res.status(200).send(response)
            }).catch((err)=>{
                res.status(400).send(err)
            });
    } catch (error){
        return res.status(400).send(error)
    }
}

/* Verification of the phone number */
const verificationPhonenumber = async (req , res) =>{
    const { phone_number } = req.body
    try {
        if(!phone_number ){
            return res.status(400).send({
                status :400,
                error : "Mandatory feilds are required!"
            })
        }
        let servicedetails = ''
        await client.verify.services.create({friendlyName: 'My Verify Service'})
                  .then(service => {
                    servicedetails = service.sid
                  }).catch(err=>{return res.send(err)});
        console.log("servicedetails",servicedetails)
        await client.verify.services(servicedetails)
         .verifications
         .create({to: phone_number, channel: 'sms'})
         .then(verification => {
             return res.status(400).send(verification)
            })
         .catch(err=>{return res.status(400).send(err)}); 
    } catch (error) {
        return res.status(400).send(error)
    }
  /*   client.verify.services.create({friendlyName: 'My Verify Service'})
                  .then(service => console.log(service.sid)).catch(err=>{return res.send(err)});  */
   
}
/* Insert the verification code  */
const codeVerification = async (req , res) =>{
    const { code ,  phone_number , serviceSid} = req.body
    try {
        if(! code || !phone_number || !serviceSid){
            return res.status(400).send({
                status :400,
                error : "Mandatory feilds are required!"
            })
        }
        await client.verify.services(serviceSid)
        .verificationChecks
        .create({to: phone_number,  code:code})
        .then(verification_check => {return res.status(200).send(verification_check)})
        .catch(err=>{
            return res.status(400).send(err)}); 
    } catch (error) {
        console.log("error" , error)
        return res.status(400).send(error)
    }
}
module.exports = {
    sendSms , validationPhoneNumber , verificationPhonenumber , codeVerification
}
