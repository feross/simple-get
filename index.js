/*! simple-get. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
module.exports = simpleGet

const concat = require('simple-concat')
const decompressResponse = require('decompress-response') // excluded from browser build
const http = require('http')
const https = require('https')
const once = require('once')

const isStream = o => o !== null && typeof o === 'object' && typeof o.pipe === 'function'

function simpleGet (opts, cb) {
  opts = Object.assign({ maxRedirects: 10 }, typeof opts === 'string' ? { href: opts } : opts)
  cb = once(cb)

  if (opts.auth) throw new Error('simple-get: opts.auth has been removed in favour of opts.username and opts.password')
  if (opts.path) throw new Error('simple-get: opts.path has been removed in favour of opts.pathname')
  if (opts.url) throw new Error('simple-get: opts.url has been removed in favour of opts.href')

  const url = new URL(opts.href || '', 'http://localhost'); delete opts.href
  ;['hash', 'host', 'hostname', 'origin', 'password', 'pathname', 'port', 'protocol', 'search', 'searchParams', 'username'].forEach(key => {
    if (opts[key]) url[key] = opts[key]
    delete opts[key]
  })

  const headers = { 'accept-encoding': 'gzip, deflate' }
  if (opts.headers) Object.keys(opts.headers).forEach(k => (headers[k.toLowerCase()] = opts.headers[k]))
  opts.headers = headers

  let body
  if (opts.body) {
    body = opts.json && !isStream(opts.body) ? JSON.stringify(opts.body) : opts.body
  } else if (opts.form) {
    body = typeof opts.form === 'string' ? opts.form : new URLSearchParams(opts.form).toString()
    opts.headers['content-type'] = 'application/x-www-form-urlencoded'
  }

  if (body) {
    if (!opts.method) opts.method = 'POST'
    if (!isStream(body)) opts.headers['content-length'] = Buffer.byteLength(body)
    if (opts.json && !opts.form) opts.headers['content-type'] = 'application/json'
  }
  delete opts.body; delete opts.form

  if (opts.json) opts.headers.accept = 'application/json'
  if (opts.method) opts.method = opts.method.toUpperCase()

  const protocol = url.protocol === 'https:' ? https : http // Support http/https urls
  const req = protocol.request(url, opts, res => {
    if (opts.followRedirects !== false && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      const target = new URL(res.headers.location, url) // Follow 3xx redirects
      opts.href = target.href
      delete opts.headers.host // Discard `host` header on redirect (see #32)
      res.resume() // Discard response

      // If redirected host is different than original host, drop headers to prevent cookie leak (#73)
      if (target.hostname !== url.hostname) {
        delete opts.headers.cookie
        delete opts.headers.authorization
      }

      if (opts.method === 'POST' && [301, 302].includes(res.statusCode)) {
        opts.method = 'GET' // On 301/302 redirect, change POST to GET (see #35)
        delete opts.headers['content-length']; delete opts.headers['content-type']
      }

      if (opts.maxRedirects-- === 0) return cb(new Error('too many redirects'))
      else return simpleGet(opts, cb)
    }

    const tryUnzip = typeof decompressResponse === 'function' && opts.method !== 'HEAD'
    cb(null, tryUnzip ? decompressResponse(res) : res)
  })
  req.on('timeout', () => {
    req.abort()
    cb(new Error('Request timed out'))
  })
  req.on('error', cb)

  if (isStream(body)) body.on('error', cb).pipe(req)
  else req.end(body)

  return req
}

simpleGet.concat = (opts, cb) => {
  return simpleGet(opts, (err, res) => {
    if (err) return cb(err)
    concat(res, (err, data) => {
      if (err) return cb(err)
      if (opts.json) {
        try {
          data = JSON.parse(data.toString())
        } catch (err) {
          return cb(err, res, data)
        }
      }
      cb(null, res, data)
    })
  })
}

;['get', 'post', 'put', 'patch', 'head', 'delete'].forEach(method => {
  simpleGet[method] = (opts, cb) => {
    if (typeof opts === 'string') opts = { href: opts }
    return simpleGet(Object.assign({ method: method.toUpperCase() }, opts), cb)
  }
})
