const redis = require('redis')

const redisRetry = ({ attempt, error }) => {
  if (attempt > 100) {
    throw new Error('Lost connection to Redis...', error)
  }

  return Math.min(attempt * 100, 5000)
}

const client = redis.createClient({
  url: process.env.REDIS_URI,
  retry_strategy: redisRetry,
})

client.on('connect', () => console.log('REDIS CONNECTED'))
client.on('ready', () => console.log('REDIS READY'))
client.on('error', () => console.log('REDIS ERROR'))

const redisPromisify = async (func, ...params) =>
  new Promise((res, rej) => {
    func.call(client, ...params, (err, data) => {
      if (err) rej(err)
      else res(data)
    })
  })

const get = async key => await redisPromisify(client.get, key)

const set = async (key, val) => await redisPromisify(client.set, key, val)

const redisClient = {
  get,
  set,
}

module.exports = {
  redisClient,
}
