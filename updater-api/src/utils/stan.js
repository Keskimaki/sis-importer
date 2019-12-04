const natsStreaming = require('node-nats-streaming')
const { HOSTNAME, NATS_URI } = process.env

console.log(`Connecting to NATS as ${process.env.HOSTNAME}...`)
const stan = natsStreaming.connect('sis-updater-nats', HOSTNAME, NATS_URI)

const opts = stan.subscriptionOptions()
opts.setManualAckMode(true)
opts.setAckWait(10 * 60 * 1000)
opts.setMaxInFlight(1)

const ORI_PERSON_CHANNEL = 'ORI_PERSON_CHANNEL'

module.exports = {
  stan,
  opts,
  ORI_PERSON_CHANNEL
}
