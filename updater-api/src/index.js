const { set: redisSet } = require('./utils/redis')
const { randomBytes } = require('crypto')
const { serviceIds } = require('./services')
const { schedule } = require('./scheduler')
const { CURRENT_EXECUTION_HASH } = require('./config')
const { stan } = require('./utils/stan')

if (process.env.NODE_ENV === 'development') {
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'
}

const updateOrdinalFrom = async (total, redisKey, ordinal) => {
  if (total) await redisSet(redisKey, ordinal)
}

const updateHash = async () => {
  const generatedHash = randomBytes(12).toString('hex')
  await redisSet(CURRENT_EXECUTION_HASH, generatedHash)
  return generatedHash
}

const update = async current => {
  const generatedHash = await updateHash()
  const serviceId = serviceIds[current]
  if (!serviceId) {
    console.log('finito!')
    return
  }
  console.log(`Updating ${serviceId}`)
  try {
    const data = await schedule(serviceId, generatedHash)
    if (data) {
      const { greatestOrdinal, hasMore, total, ordinalKey } = data
      console.log(`New ordinal for ${serviceId}: ${greatestOrdinal}`)
      await updateOrdinalFrom(total, ordinalKey, greatestOrdinal)
      update(hasMore ? current : current + 1, generatedHash)
    } else {
      update(current + 1, generatedHash)
    }
  } catch (e) {
    console.log('Updating failed', e)
  }
}

const initialize = async () => {
  update(0)
}

stan.on('connect', () => {
  initialize()
})
