const { ORI_PERSON_CHANNEL } = require('../utils/stan')
const PERSON_SCHEDULE_ID = 'PERSON'

const info = {
  CHANNEL: ORI_PERSON_CHANNEL,
  LATEST_ORDINAL_KEY: 'LATEST_PERSON_ORDINAL',
  API_URL: '/persons/v1/export'
}

module.exports = {
  PERSON_SCHEDULE_ID,
  info
}