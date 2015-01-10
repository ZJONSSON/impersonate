var Promise = require('bluebird'),
    googleapis = require('googleapis'),
    request = require('request');

module.exports = function(options) {
  var tokens = {},
      limitSecond,
      limitCount = 0;

  options = options || {};

  function limit() {
    var time = (new Date()).valueOf(),
        second = Math.floor(time/1000);
    
    if (second !== limitSecond) {
      limitSecond = second;
      limitCount = 0;
    }
    limitCount += 1;
    return (limitCount > (options.rateLimit || 20))
      ? Promise.delay(time-second*1000).then(limit) 
      : Promise.fulfilled();
  }


  function getToken(email) {
    if (!tokens[email]) {

      if (!options.SERVICE_ACCOUNT_EMAIL || (!options.SERVICE_ACCOUNT_KEY_FILE && !options.SERVICE_ACCOUNT_KEY) || !options.SERVICE_ACCOUNT_SCOPE)
        return Promise.rejected('required SERVICE_ACCOUNT variables not set');
      
      var jwt = new googleapis.auth.JWT(
          options.SERVICE_ACCOUNT_EMAIL,
          options.SERVICE_ACCOUNT_KEY_FILE,
          options.SERVICE_ACCOUNT_KEY,
          options.SERVICE_ACCOUNT_SCOPE,
          email
        );

      tokens[email] =  new Promise(function(resolve,reject) {
        // Todo redis cache
        jwt.refreshToken_ = function(err,callback) {
          function cb(d) { callback(null,(d && d.data) || {});}
          // Try fetching from cache - otherwise return blank
          (options.cache && typeof(options.cache.get) == 'function' ? options.cache.get(email) : Promise.fulfilled())
            .then(cb,cb);
        };

        jwt.refresh = function() {
          if (!options.silent) console.log('refreshing credentials for',email);
          return new Promise(function(resolve,reject) {
            googleapis.auth.JWT.prototype.refreshToken_.call(jwt,null,function(err,d) {
              if (err) return reject(err);
              d.refresh_token = 'jwt-placeholder';
              jwt.credentials = d;
              // Try setting the cache - otherwise continue
              (options.cache && typeof(options.cache.set) == 'function' ? options.cache.set(email,d,{upsert:true}) : Promise.fulfilled())
                .catch(function(e) {
                  console.log('impersonate warning',e);
                })
                .then(function() {
                  resolve(jwt);
                });
            });
          });
        };

        jwt.request = function(options,callback,retry) {
          options.headers = options.headers || {};
          options.headers.Authorization = [jwt.credentials.token_type,jwt.credentials.access_token].join(' ');
          if (options.gzip === undefined) options.gzip = true;
  
          return limit()
            .then(function() {
              return new Promise(function(resolve,reject) {
                request(options,function(err,res,d) {
                  if (err) return reject(err);
                  if (d.error) return reject(d.error);
                  else resolve(d);
                });
              })
              .catch(function(e) {
                if (retry || e.message !== 'Invalid Credentials') throw e;
                var token = jwt.credentials.access_token;
                tokens[email] = getToken(email)
                  .then(function(jwt) {
                    if (jwt.credentials.access_token !== token) return jwt;
                    return jwt.refresh();
                  });
                return tokens[email]
                  .then(function() {
                    return jwt.request(options,null,true);
                  });
              });
            });
        };

        jwt.authorize(function(err) {
          if (err) return reject(err);
          resolve(jwt);
        });
      });
    }
    return tokens[email];
  }
  getToken.googleapis = googleapis;
  return getToken;
};

// Provide access to googleapis
module.exports.googleapis = googleapis;