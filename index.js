/*! simple-get. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
module.exports = simpleGet

const concat = require('simple-concat')
const decompressResponse = require('decompress-response') // excluded from browser build
const http = require('http')
const https = require('https')
const once = require('once')
const querystring = require('querystring')

const isStream = o => o !== null && typeof o === 'object' && typeof o.pipe === 'function'

// const StringPrototypeStartsWith = String.prototype.startsWith
// const StringPrototypeSlice = String.prototype.slice

// Should match behaviour in in Node.js internals:
// https://github.com/nodejs/node/blob/30bdee20ee3a24fa12958c7fad51d9b174c765ad/lib/internal/url.js#L1395-L1418
// function setOptionsFromUrl (options, url) {
//   delete options.host
//   delete options.query

//   options.protocol = url.protocol
//   options.hostname = (typeof url.hostname === 'string' && StringPrototypeStartsWith.call(url.hostname, '[')) ? StringPrototypeSlice.call(url.hostname, 1, -1) : url.hostname
//   options.hash = url.hash
//   options.search = url.search
//   options.pathname = url.pathname
//   options.path = `${url.pathname || ''}${url.search || ''}`
//   options.href = url.href

//   if (url.port !== '') {
//     options.port = Number(url.port)
//   } else {
//     delete options.port
//   }

//   if (url.username || url.password) {
//     options.auth = `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`
//   } else {
//     delete options.auth
//   }
// }

function createUrlFromOptions (opts) {
  const url = new URL(opts.url || '', 'http://localhost')

  if (opts.auth) {
    const colon = opts.auth.indexOf(':')

    if (colon === -1) {
      url.username = opts.auth
    } else {
      url.username = opts.auth.slice(0, colon)
      url.password = opts.auth.slice(colon + 1)
    }
  }

  if (opts.hash) {
    url.hash = opts.hash
  }

  if (opts.hostname) {
    url.hostname = opts.hostname
  } else if (opts.host) {
    url.hostname = opts.host
  }

  if (opts.path) {
    const question = opts.path.indexOf('?')

    if (question === -1) {
      url.pathname = opts.path
    } else {
      url.pathname = opts.path.slice(0, question)
      url.search = opts.path.slice(question)
    }
  }

  if (opts.pathname) {
    url.pathname = opts.pathname
  }

  if (opts.port) {
    url.port = opts.port
  }

  if (opts.protocol) {
    url.protocol = opts.protocol
  }

  if (opts.query) {
    if (typeof opts.query === 'object') {
      url.searchParams = new URLSearchParams(opts.query)
    } else {
      url.search = `?${opts.query}`
    }
  }

  if (opts.search) {
    url.search = opts.search
  }

  return url
}

function simpleGet (opts, cb) {
  opts = Object.assign({ maxRedirects: 10 }, typeof opts === 'string' ? { url: opts } : opts)
  cb = once(cb)

  const foo = createUrlFromOptions(opts)
  // setOptionsFromUrl(opts, foo)
  delete opts.auth
  delete opts.hash
  delete opts.host
  delete opts.hostname
  delete opts.href
  delete opts.path
  delete opts.pathname
  delete opts.port
  delete opts.protocol
  delete opts.query
  delete opts.search
  delete opts.url

  const headers = { 'accept-encoding': 'gzip, deflate' }
  if (opts.headers) Object.keys(opts.headers).forEach(k => (headers[k.toLowerCase()] = opts.headers[k]))
  opts.headers = headers

  let body
  if (opts.body) {
    body = opts.json && !isStream(opts.body) ? JSON.stringify(opts.body) : opts.body
  } else if (opts.form) {
    body = typeof opts.form === 'string' ? opts.form : querystring.stringify(opts.form)
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

  const originalHost = foo.hostname // hostname before potential redirect
  const protocol = foo.protocol === 'https:' ? https : http // Support http/https urls
  const req = protocol.request(foo, opts, res => {
    if (opts.followRedirects !== false && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      const target = new URL(res.headers.location, foo) // Follow 3xx redirects
      opts.url = target.href

      // setOptionsFromUrl(opts, target)

      delete opts.headers.host // Discard `host` header on redirect (see #32)
      res.resume() // Discard response

      // If redirected host is different than original host, drop headers to prevent cookie leak (#73)
      if (target.hostname !== originalHost) {
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
    if (typeof opts === 'string') opts = { url: opts }
    return simpleGet(Object.assign({ method: method.toUpperCase() }, opts), cb)
  }
})
