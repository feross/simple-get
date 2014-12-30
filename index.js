var http = require('http')
var https = require('https')
var once = require('once')
var url = require('url')
var zlib = require('zlib')

module.exports = function simpleGet (opts, cb) {
  if (typeof opts === 'string')
    opts = urlToOpts(opts)
  if (typeof cb !== 'function')
    cb = function () {}
  cb = once(cb)

  // Follow up to 10 redirects by default
  if (opts.maxRedirects === 0)
    return cb(new Error('too many redirects'))
  if (!opts.maxRedirects)
    opts.maxRedirects = 10

  // Support convenience `url` option
  if (opts.url) {
    var loc = urlToOpts(opts.url)
    opts.hostname = loc.hostname
    opts.port = loc.port
    opts.protocol = loc.protocol
    opts.path = loc.path
  }

  // Support http: and https: urls
  var protocol = opts.protocol === 'https:' ? https : http

  // Accept gzip/deflate
  if (!opts.headers) opts.headers = {}
  var customAcceptEncoding = Object.keys(opts.headers).some(function (h) {
    return h.toLowerCase() === 'accept-encoding'
  })
  if (!customAcceptEncoding)
    opts.headers['accept-encoding'] = 'gzip, deflate'

  var req = protocol.get(opts, function (res) {
    // Follow 3xx redirects
    if (res.statusCode >= 300 && res.statusCode < 400 && 'location' in res.headers) {
      var loc = urlToOpts(res.headers.location)

      // Support relative redirects
      if (loc.hostname) opts.hostname = loc.hostname
      if (loc.port) opts.port = loc.port
      if (loc.protocol) opts.protocol = loc.protocol
      opts.path = loc.path

      res.resume() // Discard response

      opts.maxRedirects -= 1
      return simpleGet(opts, cb)
    }

    // Handle gzip/deflate
    if (['gzip', 'deflate'].indexOf(res.headers['content-encoding']) !== -1) {
      // Pipe the response through an unzip stream (gunzip, inflate) and wrap it so it
      // looks like an `http.IncomingMessage`.
      var stream = zlib.createUnzip()
      res.pipe(stream)
      res.on('close', function () { stream.emit('close') })
      stream.httpVersion = res.httpVersion
      stream.headers = res.headers
      stream.trailers = res.trailers
      stream.setTimeout = res.setTimeout.bind(res)
      stream.method = res.method
      stream.url = res.url
      stream.statusCode = res.statusCode
      stream.socket = res.socket
      cb(null, stream)
    } else {
      cb(null, res)
    }
  })

  req.on('error', cb)
}

function urlToOpts (u) {
  var loc = url.parse(u)
  return {
    hostname: loc.hostname,
    port: loc.port,
    protocol: loc.protocol,
    path: loc.path
  }
}
