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
      opts.path = loc.path

      res.resume() // Discard response

      opts.maxRedirects -= 1
      return simpleGet(opts, cb)
    }

    // Handle gzip/deflate
    var encoding = res.headers['content-encoding']
    if (encoding === 'gzip')
      cb(null, pipeAndWrap(res, zlib.Gunzip()))
    else if (encoding === 'deflate')
      cb(null, pipeAndWrap(res, zlib.createInflate()))
    else
      cb(null, res)
  })

  req.on('error', cb)
}

function urlToOpts (u) {
  var loc = url.parse(u)
  return {
    hostname: loc.hostname,
    port: loc.port,
    path: loc.path,
    protocol: loc.protocol
  }
}

/**
 * Pipe the response through a transform stream (gunzip, inflate) and wrap it so it
 * looks like an `http.IncomingMessage`
 */
function pipeAndWrap (res, stream) {
  res.on('close', function () { stream.emit('close') })
  stream.httpVersion = res.httpVersion
  stream.headers = res.headers
  stream.trailers = res.trailers
  stream.setTimeout = res.setTimeout.bind(res)
  stream.method = res.method
  stream.url = res.url
  stream.statusCode = res.statusCode
  stream.socket = res.socket
  return res.pipe(stream)
}
