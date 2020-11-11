const axios = require('axios').default
const fs = require('fs')
const https = require('https')
const { request } = require('./index')
const { SIS_API_URL, PROXY_TOKEN, KEY_PATH, CERT_PATH } = process.env

const hasCerts = KEY_PATH && CERT_PATH

const agent = hasCerts
  ? new https.Agent({
      cert: fs.readFileSync(CERT_PATH, 'utf8'),
      key: fs.readFileSync(KEY_PATH, 'utf8')
    })
  : new https.Agent()

const headers = hasCerts ? {} : { token: PROXY_TOKEN }

const ilmoInstance = axios.create({
  baseURL: `${SIS_API_URL}/ilmo/api`,
  headers,
  httpsAgent: agent
})

const ilmoRequest = async (path, retry = 6) => request(ilmoInstance, path, retry)

module.exports = {
  ilmoRequest
}
