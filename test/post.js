var concat = require('simple-concat')
var get = require('../')
var http = require('http')
var querystring = require('querystring')
var str = require('string-to-stream')
var test = require('tape')

test('post (text body)', function (t) {
  t.plan(5)

  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      url: 'http://localhost:' + port,
      body: 'this is the body'
    }
    get.post(opts, function (err, res) {
      t.error(err)
      t.equal(res.statusCode, 200)
      concat(res, function (err, data) {
        t.error(err)
        t.equal(data.toString(), 'this is the body')
        server.close()
      })
    })
  })
})

test('post (utf-8 text body)', function (t) {
  t.plan(5)

  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      url: 'http://localhost:' + port,
      body: 'jedan dva tri četiri'
    }
    get.post(opts, function (err, res) {
      t.error(err)
      t.equal(res.statusCode, 200)
      concat(res, function (err, data) {
        t.error(err)
        t.equal(data.toString(), 'jedan dva tri četiri')
        server.close()
      })
    })
  })
})

test('post (buffer body)', function (t) {
  t.plan(5)

  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      url: 'http://localhost:' + port,
      body: Buffer.from('this is the body')
    }
    get.post(opts, function (err, res) {
      t.error(err)
      t.equal(res.statusCode, 200)
      concat(res, function (err, data) {
        t.error(err)
        t.equal(data.toString(), 'this is the body')
        server.close()
      })
    })
  })
})

test('post (stream body)', function (t) {
  t.plan(6)

  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST')
    res.statusCode = 200
    t.notOk(req.headers['content-length'])
    req.pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      url: 'http://localhost:' + port,
      body: str('this is the body')
    }
    get.post(opts, function (err, res) {
      t.error(err)
      t.equal(res.statusCode, 200)
      concat(res, function (err, data) {
        t.error(err)
        t.equal(data.toString(), 'this is the body')
        server.close()
      })
    })
  })
})

test('post (json body)', function (t) {
  t.plan(5)

  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST')
    t.equal(req.headers['content-type'], 'application/json')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      method: 'POST',
      url: 'http://localhost:' + port,
      body: {
        message: 'this is the body'
      },
      json: true
    }
    get.concat(opts, function (err, res, data) {
      t.error(err)
      t.equal(res.statusCode, 200)
      t.equal(data.message, 'this is the body')
      server.close()
    })
  })
})

test('post (form, object)', function (t) {
  t.plan(5)

  var formData = Object.create(null)
  formData.foo = 'bar'

  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST')
    t.equal(req.headers['content-type'], 'application/x-www-form-urlencoded')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      method: 'POST',
      url: 'http://localhost:' + port,
      form: formData
    }
    get.concat(opts, function (err, res, data) {
      t.error(err)
      t.equal(res.statusCode, 200)
      t.deepEqual(querystring.parse(data.toString()), formData)
      server.close()
    })
  })
})

test('post (form, querystring)', function (t) {
  t.plan(5)

  var formData = 'foo=bar'

  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST')
    t.equal(req.headers['content-type'], 'application/x-www-form-urlencoded')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      method: 'POST',
      url: 'http://localhost:' + port,
      form: formData
    }
    get.concat(opts, function (err, res, data) {
      t.error(err)
      t.equal(res.statusCode, 200)
      t.equal(data.toString(), formData)
      server.close()
    })
  })
})
