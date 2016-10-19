var path            = require('path')
var fs              = require('fs')
var helpers         = require('./helpers')
var mime            = require('mime')
var prerender       = require('dssrv-prerender')
var pkg             = require('../package.json')

// var connect         = require('connect')
var express         = require('express')
var cbasicAuth      = require('basic-auth');
var send            = require('send')
var utilsPause      = require('pause')
var utilsEscape     = require('escape-html')
var parse           = require('parseurl')
var url             = require('url')


var middleware = {}

  middleware.routerMount = function(mountPoint, root){

    if(!root){
      root = mountPoint
      mountPoint = null
    }else{
      var rx = new RegExp("^" + mountPoint)
    }

    return [
      middleware.headerProcessing,
      middleware.replaceDevHosts,
      function(req, res, next){
        if(rx){
          if(!req.url.match(rx)) return next()
          var originalUrl = req.url
          req.url         = req.url.replace(rx, "/")
        }
        req.projectPath = root
        next()
      },
      middleware.setup,
      middleware.staticExpress,
      middleware.static,
      middleware.poly,
      middleware.process,
      function(){
        if(originalUrl) req.url = originalUrl
        next()
      }
    ]
    
  }

  middleware.headerProcessing = function(req, res, next) {
      
        res.header("X-powered-by", "DIREKTSPEED Server - Blood, sweat, and tears")

            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
            res.header('Access-Control-Allow-Headers', 'Origin, Accept, Authorization, Content-Type, X-Requested-With');

        
        if (req.headers['X-debug']) {
          // d
        } else if (req.headers['X-target']) {
          // d
        } else next()
      }
      
  middleware.replaceDevHosts = function (req, res, next) {
        // replace dev test hosts
        if (req.headers.Host) {
          req.headers.host = req.headers.Host
          delete req.headers.Host
        }
        
        req.originalHost = req.headers.host
        req.headers.host = req.headers.host.toLowerCase()
        req.headers.host = req.headers.host.replace('.new','')
        req.headers['host'] = req.headers.host.replace('.local','')
        req.headers.host = req.headers.host.replace('proxy.','').split(':')[0]
        
        next()
      } 

  middleware.appByVhost = function (req, res, next){

          if (!req.headers.host) return next();
          var host = req.headers.host.split(':')[0]; // I prefer to trim ports aways

          // Implament Routing on URL    
          var debug = require('debug')('vhostrouter:'+process.pid);
          debug('VHOSTS EXEC: ' + JSON.stringify(req.headers))
          // debug('VHOSTS EXEC: ' + JSON.stringify(req.app.locals.hostDictionary))
          // console.log(req.app.locals.hostDictionary)
          if (req.trustProxy && req.headers["x-forwarded-host"]) {
            host = req.headers["x-forwarded-host"].split(':')[0];
          }
          
          if (req.originalUrl.indexOf('/apps') > -1) {
            var server = req.app.locals.hostDictionary['apps.domain.tld']
          }
          
          if (!server) {
           var server = req.app.locals.hostDictionary[host];
          }
          if (!server){
            server = req.app.locals.hostDictionary['*' + host.substr(host.indexOf('.'))];
          }

          if (!server){ 
            server = req.app.locals.hostDictionary['default'];
          }

          // console.log(JSON.stringify(Vhost.hostDictionary))
          // console.log()

          if (!server) return next();
          
          if ('function' == typeof server) return server(req, res, next);
          server.emit('request', req, res);
          // next()
      }




  // TODO: integrate this

    middleware.checkPHP = function (req,res,next) {
    
        res.header("X-powered-by", "DIREKTSPEED Server - Blood, sweat, and tears")
        res.header("Vary", "Accept-Encoding")
    
      if (req.originalUrl.indexOf('.php') > -1 ) {
        // req.target = ''
        require('../proxy')(req,res,next)
      } else next()
    
    }

    middleware.serveSites_handler = function (req, res, next) {
      // var options = options || [ '../sites', false]
      // var single = options[1]
      // var folderpath = options[0]
      if (single) res.staticPath = folderpath
        else res.staticPath = folderpath + '/' + req.headers.host
      
      debug(res.staticPath,req.originalUrl)
      
      // worker.scServer.emit('rand', 555)
      
      try {
          // Query the entry
          stats = fs.lstatSync(res.staticPath + req.originalUrl);

          // Is it a directory?
          if (stats.isFile()) {
          // Apply Security Filters
          /*
          if (req.originalUrl.indexOf('.php') > -1 ) return res.end('404')
          if (req.originalUrl.indexOf('_views') > -1 ) return res.end('404')
          if (req.originalUrl.indexOf('_') == 1 ) return res.end('404')
          if (req.originalUrl.indexOf('.') == 1 ) return res.end('404')
          if (req.originalUrl.indexOf('.pug') > -1 ) return res.end('404')
          if (req.originalUrl.indexOf('.jade') > -1 ) return res.end('404')
          if (req.originalUrl.indexOf('.ejs') > -1 ) return res.end('404')
          */
          var static = express.static(res.staticPath)
          

              
          return static(req, res, next)
          } else next()
      }
      catch (e) {
          // Call next middleware??
          next()
      }
      

    }
    
  middleware.ejs_js = function (req,res,next) {
      if (req.originalUrl.indexOf('.js.') > -1) {
      try {
            // Query the entry
            stats = fs.lstatSync(res.staticPath + req.originalUrl+'.ejs');

            // Is it a directory?
            if (stats.isFile()) {
            // Render ejs as js
              var static = express.static(res.staticPath)
            return static(req, res, next)
            
            } else next()
        }catch (e) {
            // Call next middleware??
            next()
        }
      } else next()
    }
    
    
  middleware.staticExpress = function disabledStaticExpress(req,res,next) {
    // express.static(req.setup.publicPath)(req, res, next)    
    next()
  }
  middleware.mid_dssrv = function (req, res,next) {
      // dssrv.middleware.db        
      // call if res end if not called already should normaly not happen
      if (res.headerSent) return  res.end()
      var mime = require('mime')
      var path = require('path')
      var pathname = req.originalUrl;
      var mimeType = mime.lookup(pathname);
      var extension = path.extname(pathname);
      // set header 
      if (mimeType == 'application/octet-stream') mimeType = mime.lookup('htm')
      res.set('Content-Type', mimeType);
      middleware.routerMount(res.staticPath)(req, res, next)
    }



middleware.notMultihostURL = function(req, res, next){
  var host      = req.headers.host
  var hostname  = host.split(':')[0]
  var arr       = hostname.split(".")
  var port      = host.split(':')[1] ? ':' + host.split(':')[1] : ''
  return next()
  if(hostname == "127.0.0.1" || hostname == "localhost"){
    res.statusCode = 307
    res.setHeader('Location', 'http://dssrv.nu' + port)
    res.end("redirecting you to http://dssrv.nu" + port)
  }else if(arr.length == 3){
    arr.pop()
    arr.push('io')
    var link = 'http://' + arr.join('.') + port
    var body = "Local server does not support history. Perhaps you are looking for <href='" + link + "'>" + link + "</a>."
    res.statusCode = 307
    res.end(body)
  }else if(arr.length > 4){
    arr.shift()
    var link = 'http://' + arr.join('.') + port
    res.statusCode = 307
    res.setHeader('Location', link)
    res.end("redirecting you to " + link)
  }else{
    next()
  }
}

var reservedDomains = ["local","dssrv.io", "dssrvdev.io", "dssrvapp.io"]

middleware.index = function(dirPath){
  return function(req, res, next){
    // TODO: Show Index only in Dev Mode With Local Domains
    return next()
    var host      = req.headers.host;
    var hostname  = host.split(':')[0];
    var arr       = hostname.split(".");
    var port      = host.split(':')[1] ? ':' + host.split(':')[1] : '';
    var poly      = prerender.root(__dirname + "/templates");

    if(arr.length == 2){
      fs.readdir(dirPath, function(err, files){
        var projects = [];

        files.forEach(function(file){
          var local = file.split('.');

          var appPart = local.join("_");

          if (local.length > 2) {
            var domain = local.slice(Math.max(local.length - 2, 1)).join(".");
            if (reservedDomains.indexOf(domain) != -1) {
              appPart =  local[0];
            }
          }

          // DOT files are ignored.
          if (file[0] !== ".") {
            projects.push({
              "name"      : file,
              "localUrl"  : 'http://' + appPart + "." + host,
              "localPath" : path.resolve(dirPath, file)
            });
          }
        });

        poly.render("index.jade", { pkg: pkg, projects: projects, layout: "_layout.jade" }, function(error, body){
          res.end(body)
        });
      })
    } else {
      next();
    }
  }
}

middleware.hostByDomainProjectFinder = function hostByDomainProjectFinder(dirPath){
  return function(req, res, next){
    var host        = req.headers.host;
    var hostname    = host.split(':')[0];
    var matches     = [];
    req.projectPath = dirPath +'/'+hostname
    console.log(req.projectPath)
    next()
  }
}


middleware.hostProjectFinder = function hostProjectFinder(dirPath){
  return function(req, res, next){
    var host        = req.headers.host;
    var hostname    = host.split(':')[0];
    var matches     = [];
    
    if (typeof req.projectPath == 'string') return next()

    fs.readdir(dirPath, function(err, files){
    
      var appPart = hostname.split(".")[0];
      files.forEach(function(file){
        var fp = file.split('.');
        var filePart;
        // Check against Reserved Domains first.
        if (fp.length > 2) {
          var domain = fp.slice(Math.max(fp.length - 2, 1)).join(".");
          if (reservedDomains.indexOf(domain) != -1) {
            fp = fp.slice(0, Math.max(fp.length - 2))
          }
        }

        filePart = fp.join("_");
        if (appPart == filePart) {
          matches.push(file);
        }
      });

      if(matches.length > 0){
        req.projectPath = path.resolve(dirPath, matches[0]);
        next();
      } else {
        res.end("Cannot find project")
      }

    });
          
  }
}



/**
 * Sets up the poly object
 */

middleware.poly = function(req, res, next){
  // console.log('Poly')
  if(req.hasOwnProperty("poly")) return next()

  try{
    req.poly = prerender.root(req.setup.publicPath, req.setup.config.globals)
    next()
  }catch(error){
    
    if (error.message.split(':')[0] == 'ENOENT') {
      var locals = {
        project: req.headers.host,
        error: error,
        pkg: pkg
      }
      locals.error.name = '404'
      locals.error.message = 'Domain not Configured'
      return prerender.root(__dirname + "/templates").render("error_project_not_found.jade", locals, function(err, body){
        var type    = helpers.mimeType("html")
        var charset = mime.charsets.lookup(type)
        res.setHeader('Content-Type', type + (charset ? '; charset=' + charset : ''));
        res.statusCode = 404
        res.setHeader('Content-Length', Buffer.byteLength(body, charset));
        res.end(body)
      });
    
    } else {

      error.stack = helpers.stacktrace(error.stack, { lineno: error.lineno })
      var locals = {
        project: req.headers.host,
        error: error,
        pkg: pkg
      }

      //  res.end("Cannot find project for: "+)
      
      return prerender.root(__dirname + "/templates").render("error.jade", locals, function(err, body){
        res.statusCode = 500
        res.end(body)
      })
    }
  }
  
}

/*
function(req, res, next){
  skin(req, res, [custom200static, custom200dynamic, notFound], next)
}
*/

middleware.db = [
  middleware.poly,
  function(req, res, next){   
    req.setup.config.globals.title="DAMN!"
    /*
    const sourceFile= {
      "projectPath" : "/path/to/app",
      "publicPath"  : "/path/to/app/public",
      "config"      : { "globals": req.setup.config.globals }
    }
    */
    
    
    
    var sourceFile = 'index.ejs'
    // Will look automaticly for layout of that ejs file :)
    
    var planet = prerender.root(req.projectPath+'/videos', { "title": "Bitchin" })

    planet.render(sourceFile, { "title": "Override the global title" }, function(error, body){
      // console.log(error,body)
      if(error){
        // TODO: make this better
        res.statusCode = 404;
        res.end("There is an error in your " + sourceFile + " file")
      }else{
        if(!body) return next()
        // console.log(JSON.stringify(body))
        // Option for setting headers in data json
        if (req.setup.config.headers) console.log(req.setup.config.headers)
        
        var type    = helpers.mimeType("html")
        var charset = mime.charsets.lookup(type)
        res.setHeader('Content-Type', type + (charset ? '; charset=' + charset : ''));
        res.setHeader('Content-Length', Buffer.byteLength(body, charset));
        res.statusCode = 200;
        res.end(body)
      }

    })
}]



/*
function(req, res, next){
  skin(req, res, [custom404static, custom404dynamic, default404], next)
}
*/

/**
 * Custom 200
 *
 *  1. return static 200.html file
 *  2. compile and return 200.xxx file
 *
 */

middleware.custom200static = function(req, res, next){
  fs.readFile(path.resolve(req.setup.publicPath, "200.html"), function(err, contents){
    if(contents){
      var body    = contents.toString()
      var type    = helpers.mimeType("html")
      var charset = mime.charsets.lookup(type)
      res.setHeader('Content-Type', type + (charset ? '; charset=' + charset : ''))
      res.setHeader('Content-Length', Buffer.byteLength(body, charset));
      res.statusCode = 200
      res.end(body)
    }else{
      next()
    }
  })
}

/**
 * Custom 200 (jade, md, ejs, pug)
 *
 *  1. return static 200.html file
 *  2. compile and return 404.xxx file
 *
 */

middleware.custom200dynamic = [middleware.poly, function(req,res,next){
    var priorityList  = prerender.helpers.buildPriorityList("200.html")
    var sourceFile    = prerender.helpers.findFirstFile(req.setup.publicPath, priorityList)
    if(!sourceFile) return next()

    req.poly.render(sourceFile, function(error, body){
      if(error){
        // TODO: make this better
        res.statusCode = 404;
        res.end("There is an error in your " + sourceFile + " file")
      }else{
        if(!body) return next()
        var type    = helpers.mimeType("html")
        var charset = mime.charsets.lookup(type)
        if (req.setup.config.headers) console.log(req.setup.config.headers)
        res.setHeader('Content-Type', type + (charset ? '; charset=' + charset : ''));
        res.setHeader('Content-Length', Buffer.byteLength(body, charset));
        res.statusCode = 200;
        res.end(body)
      }
    })
  }]



/*
function(req, res, next){
  
  skin(req, res, [poly], function(){
    var priorityList  = prerender.helpers.buildPriorityList("200.html")
    var sourceFile    = prerender.helpers.findFirstFile(req.setup.publicPath, priorityList)
    if(!sourceFile) return next()

    req.poly.render(sourceFile, function(error, body){
      if(error){
        // TODO: make this better
        res.statusCode = 404;
        res.end("There is an error in your " + sourceFile + " file")
      }else{
        if(!body) return next()
        var type    = helpers.mimeType("html")
        var charset = mime.charsets.lookup(type)
        if (req.setup.config.headers) console.log(req.setup.config.headers)
        res.setHeader('Content-Type', type + (charset ? '; charset=' + charset : ''));
        res.setHeader('Content-Length', Buffer.byteLength(body, charset));
        res.statusCode = 200;
        res.end(body)
      }
    })
  })

}
*/


/**
 * Custom 404 (html)
 *
 *  1. return static 404.html file
 *  2. compile and return 404.xxx file
 *
 * TODO: cache readFile IO
 *
 */

middleware.custom404static = function(req, res, next){
  fs.readFile(path.resolve(req.setup.publicPath, "404.html"), function(err, contents){
    if(contents){
      var body    = contents.toString()
      var type    = helpers.mimeType("html")
      var charset = mime.charsets.lookup(type)
      res.setHeader('Content-Type', type + (charset ? '; charset=' + charset : ''))
      res.setHeader('Content-Length', Buffer.byteLength(body, charset));
      res.statusCode = 404
      res.end(body)
    }else{
      next()
    }
  })
}


/**
 * Custom 404 (pug,jade, md, ejs)
 *
 *  1. return static 404.html file
 *  2. compile and return 404.xxx file
 *
 */

middleware.custom404dynamic = [middleware.poly, function(req,res,next){
    var priorityList  = prerender.helpers.buildPriorityList("404.html")
    var sourceFile    = prerender.helpers.findFirstFile(req.setup.publicPath, priorityList)
    if(!sourceFile) return next()

    req.poly.render(sourceFile, function(error, body){
      if(error){
        // TODO: make this better
        res.statusCode = 404;
        res.end("There is an error in your " + sourceFile + " file")
      }else{
        if(!body) return next()
        var type    = helpers.mimeType("html")
        var charset = mime.charsets.lookup(type)
        res.setHeader('Content-Type', type + (charset ? '; charset=' + charset : ''));
        res.setHeader('Content-Length', Buffer.byteLength(body, charset));
        res.statusCode = 404;
        res.end(body)
      }
    })
  }]
/*
function(req, res, next){
  skin(req, res, [poly], function(){
    var priorityList  = prerender.helpers.buildPriorityList("404.html")
    var sourceFile    = prerender.helpers.findFirstFile(req.setup.publicPath, priorityList)
    if(!sourceFile) return next()

    req.poly.render(sourceFile, function(error, body){
      if(error){
        // TODO: make this better
        res.statusCode = 404;
        res.end("There is an error in your " + sourceFile + " file")
      }else{
        if(!body) return next()
        var type    = helpers.mimeType("html")
        var charset = mime.charsets.lookup(type)
        res.setHeader('Content-Type', type + (charset ? '; charset=' + charset : ''));
        res.setHeader('Content-Length', Buffer.byteLength(body, charset));
        res.statusCode = 404;
        res.end(body)
      }
    })
  })
}
*/

/**
 * Default 404
 *
 * No 200 nor 404 files were found.
 *
 */

middleware.default404 = function(req, res, next){
  var locals = {
    project: req.headers.host,
    name: "Page Not Found",
    pkg: pkg
  }
  prerender.root(__dirname + "/templates").render("404.jade", locals, function(err, body){
    var type    = helpers.mimeType("html")
    var charset = mime.charsets.lookup(type)
    console.log(res.header())
    res.set('Content-Type', type + (charset ? '; charset=' + charset : ''));
    res.statusCode = 404
    res.set('Content-Length', Buffer.byteLength(body, charset));
    res.end(body)
  })
}


/**
 * Underscore
 *
 * Returns 404 if path contains beginning underscore or other ignored files
 *
 */
middleware.underscore = function(req, res, next){
  if(prerender.helpers.shouldIgnore(req.url)){
    console.log('FIRE NOT FOUND')
    notFound(req, res, next)
  }else{
    next()
  }
}



/*
  SetHeaders


*/
middleware.setConfigHeaders = function() {
  if (req.setup.config.headers) console.log(req.setup.config.headers)
  // res.setHeader('Content-Type', mimeType + (charset ? '; charset=' + charset : ''))
  // res.setHeader('Content-Length', Buffer.byteLength(body, charset));
  // res.
}



/**
 * Static
 *
 * Serves up static page (if it exists).
 *
 */
middleware.static = function(req, res, next) {

  console.log('Static')
  var options  = {}
  var redirect = true

  if ('GET' != req.method && 'HEAD' != req.method) return next()
  
  // Fixes JS Delivery
  // if (['js'].indexOf(path.extname(req.url).replace(/^\./, '')) !== -1) return next()
  
  var pathn = parse(req).pathname;
  var pause = utilsPause(req);
  
  function resume() {
    next();
    pause.resume();
  }

  function directory() {
    if (!redirect) return resume();
    var pathname = url.parse(req.originalUrl).pathname;
    res.statusCode = 301;
    res.setHeader('Location', pathname + '/');
    res.end('Redirecting to ' + utilsEscape(pathname) + '/');
  }

  function error(err) {
    if (404 == err.status){
      // look for implicit `*.html` if we get a 404
      return path.extname(err.path) === ''
        ? serve(pathn + ".html")
        : resume()
    }
    next(err);
  }

  var serve = function(pathn){
    
    send(req, pathn, {
        maxage: options.maxAge || 0,
        root: req.setup.publicPath,
        hidden: options.hidden
      })
      .on('directory', directory)
      .on('error', error)
      .pipe(res)
  }
  
  // return express.static(req.setup.publicPath)(req, res, next)
    serve(pathn)
}

/**
 * Opens the (optional) dssrv.json file and sets the config settings.
 */

middleware.setup = function(req, res, next){
  if(req.hasOwnProperty('setup')) return next()

  try{
    req.setup = helpers.setup(req.projectPath)
    if (req.setup.config.headers) {
      //res.header("X-powered-by", "Blood, sweat, and tears")
      //res.header(req.setup.config.headers[0][0], req.setup.config.headers[0][1])
    }
    
  }catch(error){
    error.stack = helpers.stacktrace(error.stack, { lineno: error.lineno })

    var locals = {
      project: req.headers.host,
      error: error,
      pkg: pkg
    }

    return prerender.root(__dirname + "/templates").render("error.jade", locals, function(err, body){
      res.statusCode = 500
      res.end(body)
    })
  }

  next()
}

/**
 * Basic Auth
 */

middleware.basicAuth = function(req, res, next){

  function unauthorized(res) {
    res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
    
    return res.sendStatus(401);
  };

  // default empty
  var creds = []

  
  if(req.setup.config.hasOwnProperty("basicAuth") && req.setup.config["basicAuth"] instanceof Array) {
    // allow array
    creds = req.setup.config["basicAuth"]
  } else if(req.setup.config.hasOwnProperty("basicAuth") && typeof req.setup.config["basicAuth"] === 'string') {
    // allow string
    creds.push(req.setup.config["basicAuth"])
  }

  // move on if no creds
  if(creds.length === 0) return next();
  else {
      // return next()
      var user = cbasicAuth(req);

      if (!user || !user.name || !user.pass) {
        console.log(creds.length);
        // process.exit(creds)
        return unauthorized(res);
      };

      
      for (var i=0; i < creds.length; i++ ) {
        if (user.name === 'foo' && user.pass === 'bar') {
          return next();
        } else if (i == creds.length-1) return unauthorized(res);
      }
      //console.log(creds);process.exit(creds)

  }

  /* use auth lib iterate over all creds provided
  cbasicAuth(function(user, pass){
    return creds.some(function(cred){
      return cred === user + ":" + pass
    })
  })(req, res, next)
  */
}



/**
 * Asset Pipeline
 */

middleware.process = function(req, res, next){
  var normalizedPath  = helpers.normalizeUrl(req.url)
  var priorityList    = prerender.helpers.buildPriorityList(normalizedPath)
  var sourceFile      = prerender.helpers.findFirstFile(req.setup.publicPath, priorityList)


  /**
   * We GTFO if we don't have a source file.
   */

  if(!sourceFile){
    if (path.basename(normalizedPath) === "index.html") {
      var pathAr = normalizedPath.split(path.sep); pathAr.pop() // Pop index.html off the list
      var prospectCleanPath       = pathAr.join("/")
      var prospectNormalizedPath  = helpers.normalizeUrl(prospectCleanPath)
      var prospectPriorityList    = prerender.helpers.buildPriorityList(prospectNormalizedPath)
      prospectPriorityList.push(path.basename(prospectNormalizedPath + ".html"))

      sourceFile = prerender.helpers.findFirstFile(req.setup.publicPath, prospectPriorityList)

      if (!sourceFile) {
        return next()
      } else {
        // 301 redirect
        res.statusCode = 301
        res.setHeader('Location', prospectCleanPath)
        res.end('Redirecting to ' + utilsEscape(prospectCleanPath))
      }

    } else {
      return next()
    }
  } else {

    /**
     * Now we let prerender handle the asset pipeline.
     */

    req.poly.render(sourceFile, function(error, body){
      if(error){
        error.stack = helpers.stacktrace(error.stack, { lineno: error.lineno })

        var locals = {
          project: req.headers.host,
          error: error,
          pkg: pkg
        }
        if(prerender.helpers.outputType(sourceFile) == 'css'){
          var outputType = prerender.helpers.outputType(sourceFile)
          var mimeType   = helpers.mimeType(outputType)
          var charset    = mime.charsets.lookup(mimeType)
          var body       = helpers.cssError(locals)
          res.statusCode = 200
          // SetHeaders
          res.setHeader('Content-Type', mimeType + (charset ? '; charset=' + charset : ''))
          res.setHeader('Content-Length', Buffer.byteLength(body, charset));
          res.end(body)
        }else{

          // Make the paths relative but keep the root dir.
          // TODO: move to helper.
          //
          // var loc = req.projectPath.split(path.sep); loc.pop()
          // var loc = loc.join(path.sep) + path.sep
          // if(error.filename) error.filename = error.filename.replace(loc, "")

          prerender.root(__dirname + "/templates").render("error.jade", locals, function(err, body){
            var mimeType   = helpers.mimeType('html')
            var charset    = mime.charsets.lookup(mimeType)
            res.statusCode = 500
            res.setHeader('Content-Type', mimeType + (charset ? '; charset=' + charset : ''))
            res.setHeader('Content-Length', Buffer.byteLength(body, charset));
            res.end(body)
          })
        }
      }else{
        // 404
        if(!body) return next()

        var outputType = prerender.helpers.outputType(sourceFile)
        var mimeType   = helpers.mimeType(outputType)
        var charset    = mime.charsets.lookup(mimeType)
        res.statusCode = 200
        res.setHeader('Content-Type', mimeType + (charset ? '; charset=' + charset : ''))
        res.setHeader('Content-Length', Buffer.byteLength(body, charset));
        res.end(body);
      }
    })
  }

}



/**
 * Fallbacks
 *
 * This is the logic behind rendering fallback files.
 *
 *  1. return static 200.html file
 *  2. compile and return 200.xxx
 *  3. return static 404.html file
 *  4. compile and return 404.xxx file
 *  5. default 404
 *
 * It is broken into two public functions `fallback`, and `notFound`
 *
 */
middleware.notFound = [middleware.custom404static, middleware.custom404dynamic, middleware.default404]
middleware.fallback = [ middleware.custom200static, middleware.custom200dynamic, middleware.notFound ]
/**
 * Modern Web Language
 *
 * Returns 404 if file is a precompiled
 *
 */
middleware.mwl = function(req, res, next){
  var ext = path.extname(req.url).replace(/^\./, '')
  req.originalExt = ext

  // This prevents the source files from being served, but also
  // has to factor in that in this brave new world, sometimes
  // `.html` (Handlebars, others), `.css` (PostCSS), and
  // `.js` (Browserify) are actually being used to specify
  // source files

//  if (['js'].indexOf(ext) === -1) {
    if (prerender.helpers.processors["html"].indexOf(ext) !== -1 || prerender.helpers.processors["css"].indexOf(ext) !== -1 || prerender.helpers.processors["js"].indexOf(ext) !== -1) {
      var router = require('express').Router()
      router.use(middleware.notFound)
      return router(req,res,next)
    } else {
      next()
    }
//  } else {
//    next()
//  }
}

middleware.endMid = [
      middleware.setup,
      middleware.basicAuth,
      middleware.underscore,
      middleware.mwl,
      middleware.staticExpress,
      middleware.static,
      middleware.poly,
      middleware.process,
      middleware.fallback
    ]






module.exports = middleware