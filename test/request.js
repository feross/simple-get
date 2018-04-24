var get = require('../')
var http = require('http')
var test = require('tape')

test('access `req` object', function (t) {
  t.plan(2)

  var server = http.createServer(function (req, res) {
    res.statusCode = 200
    res.end('response')
  })

  server.listen(0, function () {
    var port = server.address().port
    var req = get('http://localhost:' + port, function (err, res) {
      t.error(err)
      res.resume() // discard data
      server.close()
    })

    req.on('socket', function () {
      t.pass('got `socket` event')
    })
  })
})
