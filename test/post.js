const concat = require('simple-concat')
const get = require('../')
const http = require('http')
const querystring = require('querystring')
const str = require('string-to-stream')
const test = require('tape')

test('post (text body)', function (t) {
  t.plan(5)

  const server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    const port = server.address().port
    const opts = {
      href: 'http://localhost:' + port,
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

  const server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    const port = server.address().port
    const opts = {
      href: 'http://localhost:' + port,
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

  const server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    const port = server.address().port
    const opts = {
      href: 'http://localhost:' + port,
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

  const server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST')
    res.statusCode = 200
    t.notOk(req.headers['content-length'])
    req.pipe(res)
  })

  server.listen(0, function () {
    const port = server.address().port
    const opts = {
      href: 'http://localhost:' + port,
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

  const server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST')
    t.equal(req.headers['content-type'], 'application/json')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    const port = server.address().port
    const opts = {
      method: 'POST',
      href: 'http://localhost:' + port,
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

  const formData = Object.create(null)
  formData.foo = 'bar'

  const server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST')
    t.equal(req.headers['content-type'], 'application/x-www-form-urlencoded')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    const port = server.address().port
    const opts = {
      method: 'POST',
      href: 'http://localhost:' + port,
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

  const formData = 'foo=bar'

  const server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST')
    t.equal(req.headers['content-type'], 'application/x-www-form-urlencoded')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    const port = server.address().port
    const opts = {
      method: 'POST',
      href: 'http://localhost:' + port,
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
