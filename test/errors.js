var should      = require("should")
var request     = require('request')
var path        = require("path")
var fs          = require("fs")
var exec        = require("child_process").exec
var steal        = require("../")()

describe("errors", function(){

  describe("err-invalid-config", function(){
    var projectPath = path.join(__dirname, "apps/err-invalid-config")
    var outputPath  = path.join(__dirname, "out/err-invalid-config")
    var port        = 8111

    before(function(done){
      steal.server(projectPath, { port: port }, function(){
        done()
      })
    })

    it("should get error message for invalid steal.json", function(done){
      request('http://localhost:'+ port +'/', function (e, r, b) {
        r.statusCode.should.eql(500)
        b.should.be.an.String().and.not.empty().and.match(new RegExp(steal.pkg.version))
        steal.compile(projectPath, outputPath, function(error){
          should.exist(error)
          error.should.have.property("source")
          error.should.have.property("dest")
          error.should.have.property("filename")
          error.should.have.property("message")
          error.should.have.property("stack")
          error.should.have.property("lineno")
          done()
        })
      })
    })
  })

  describe("err-invalid-data", function(){
    var projectPath = path.join(__dirname, "apps/err-invalid-data")
    var outputPath  = path.join(__dirname, "out/err-invalid-data")
    var port        = 8112

    before(function(done){
      steal.server(projectPath, { port: port }, function(){
        done()
      })
    })

    it("should get error message for invalid _data.json", function(done){
      request('http://localhost:'+ port +'/', function (e, r, b) {
        r.statusCode.should.eql(500)
        b.should.be.an.String().and.not.empty().and.match(new RegExp(steal.pkg.version))
        steal.compile(projectPath, outputPath, function(error){
          should.exist(error)
          error.should.have.property("source")
          error.should.have.property("dest")
          error.should.have.property("filename")
          error.should.have.property("message")
          error.should.have.property("stack")
          error.should.have.property("lineno")
          done()
        })
      })
    })
  })

  describe("err-missing-public", function(){
    var projectPath = path.join(__dirname, "apps/err-missing-public")
    var outputPath  = path.join(__dirname, "out/err-missing-public")
    var port        = 8113

    before(function(done){
      steal.server(projectPath, { port: port }, function(){
        done()
      })
    })

    it("should get error message for invalid _data.json", function(done){
      request('http://localhost:'+ port +'/', function (e, r, b) {
        r.statusCode.should.eql(500)
        b.should.be.an.String().and.not.empty().and.match(new RegExp(steal.pkg.version))
        steal.compile(projectPath, outputPath, function(error){
          should.exist(error)
          error.should.have.property("source")
          error.should.have.property("dest")
          error.should.have.property("filename")
          error.should.have.property("message")
          error.should.have.property("stack")
          error.should.have.property("lineno")
          done()
        })
      })
    })
  })

  describe("err-missing-public", function(){
    var projectPath = path.join(__dirname, "apps/err-missing-404")
    var outputPath  = path.join(__dirname, "out/err-missing-404")
    var port        = 8114

    before(function(done){
      steal.server(projectPath, { port: port }, function(){
        done()
      })
    })

    it("should return proper mime type on 404 page", function(done){
      request('http://localhost:'+ port +'/some/missing/path.css', function (e, r, b) {
        r.statusCode.should.eql(404)
        b.should.be.an.String().and.not.empty().and.match(new RegExp(steal.pkg.version))
        r.headers.should.have.property("content-type", "text/html; charset=UTF-8")
        done()
      })
    })
  })

  after(function(done){
    exec("rm -rf " + path.join(__dirname, "out"), function(){
      done()
    })
  })

})
