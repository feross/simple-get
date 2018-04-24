var concat = require('simple-concat')
var get = require('../')
var http = require('http')
var selfSignedHttps = require('self-signed-https')
var test = require('tape')

test('follow redirects (up to 10)', function (t) {
  t.plan(15)

  var num = 0
  var server = http.createServer(function (req, res) {
    t.equal(req.url, '/' + num, 'visited /' + num)

    if (num < 10) {
      num += 1
      res.statusCode = 301
      res.setHeader('Location', '/' + num)
      res.end()
    } else {
      res.statusCode = 200
      res.end('response')
    }
  })

  server.listen(0, function () {
    var port = server.address().port
    get('http://localhost:' + port + '/0', function (err, res) {
      t.error(err)
      t.equal(res.statusCode, 200)
      concat(res, function (err, data) {
        t.error(err)
        t.equal(data.toString(), 'response')
        server.close()
      })
    })
  })
})

test('do not follow redirects', function (t) {
  t.plan(2)

  var server = http.createServer(function (req, res) {
    t.equal(req.url, '/0', 'visited /0')

    res.statusCode = 301
    res.setHeader('Location', '/1')
    res.end()
  })

  server.listen(0, function () {
    var port = server.address().port
    get({
      url: 'http://localhost:' + port + '/0',
      maxRedirects: 0
    }, function (err) {
      t.ok(err instanceof Error, 'got error')
      server.close()
    })
  })
})

test('follow redirects (11 is too many)', function (t) {
  t.plan(12)

  var num = 0
  var server = http.createServer(function (req, res) {
    t.equal(req.url, '/' + num, 'visited /' + num)

    if (num < 11) {
      num += 1
      res.statusCode = 301
      res.setHeader('Location', '/' + num)
      res.end()
    } else {
      t.fail('no request to /11 should be made, should error first')
    }
  })

  server.listen(0, function () {
    var port = server.address().port
    get('http://localhost:' + port + '/0', function (err) {
      t.ok(err instanceof Error, 'got error')
      server.close()
    })
  })
})

test('redirect https to http', function (t) {
  t.plan(6)

  var httpPort = null
  var httpsPort = null

  var httpsServer = selfSignedHttps(function (req, res) {
    t.equal(req.url, '/path1')
    res.statusCode = 301
    res.setHeader('Location', 'http://localhost:' + httpPort + '/path2')
    res.end()
  })

  var httpServer = http.createServer(function (req, res) {
    t.equal(req.url, '/path2')
    res.statusCode = 200
    res.end('response')
  })

  httpsServer.listen(0, function () {
    httpsPort = httpsServer.address().port
    httpServer.listen(0, function () {
      httpPort = httpServer.address().port
      get({
        url: 'https://localhost:' + httpsPort + '/path1',
        rejectUnauthorized: false
      }, function (err, res) {
        t.error(err)
        t.equal(res.statusCode, 200)
        concat(res, function (err, data) {
          t.error(err)
          t.equal(data.toString(), 'response')
          httpsServer.close()
          httpServer.close()
        })
      })
    })
  })
})

test('redirect http to https', function (t) {
  t.plan(6)

  var httpsPort = null
  var httpPort = null

  var httpServer = http.createServer(function (req, res) {
    t.equal(req.url, '/path1')
    res.statusCode = 301
    res.setHeader('Location', 'https://localhost:' + httpsPort + '/path2')
    res.end()
  })

  var httpsServer = selfSignedHttps(function (req, res) {
    t.equal(req.url, '/path2')
    res.statusCode = 200
    res.end('response')
  })

  httpServer.listen(0, function () {
    httpPort = httpServer.address().port
    httpsServer.listen(0, function () {
      httpsPort = httpsServer.address().port
      get({
        url: 'http://localhost:' + httpPort + '/path1',
        rejectUnauthorized: false
      }, function (err, res) {
        t.error(err)
        t.equal(res.statusCode, 200)
        concat(res, function (err, data) {
          t.error(err)
          t.equal(data.toString(), 'response')
          httpsServer.close()
          httpServer.close()
        })
      })
    })
  })
})
