# Impersonate (googleapis jtw)

#### changes in version 0.1
* simple promise wrapper allows you to supply the impersonation object directly as `auth` without having to wrap the request inside the promise output of the impersonate function

The Impersonate library promisifies [googleapis](https://www.npmjs.com/package/googleapis) and provides easy access to google service accounts (google apps for business) using the [JWT](http://self-issued.info/docs/draft-ietf-oauth-json-web-token.html) authentication.  Promisification is achived by patching underlying 'request' function inside `googleapis`.  Additionally, the patched request function will attempt to refresh the token automatically if the current token is invalid or expired. Please ensure this library is only used in strict adherence to all applicable laws and regulations, Google API terms and conditions and any compliance rules defined by the applicable organization regarding usage of service accounts. Use at your own risk (See LICENCE.md).

Please note that `impersonate` monkey-patches the `googleapis` object, which might cause conflicts if you are using vanilla `googleapis` (same version) elsewhere in your runtime.  The local `googleapis` instance is available as a property of the `impersonate` function for easy access.

The library should be initialized as:
```
impersonate = require('impersonate')(options)
```

The options should include `SERVICE_ACCOUNT_EMAIL`, (`SERVICE_ACCOUNT_KEY_FILE` or `SERVICE_ACCOUNT_KEY`) and `SERVICE_ACCOUNT_SCOPE`. 

If `cache` object is defined in the options, impersonate will attempt to call `get(email)` upon any initial request for an email token (token should be in `data` property of the result)  and `set(email,{tokendata},{upsert:true})` when a new token has been retrieved.   Both functions should return promises (see [cache-stampede](https://github.com/ZJONSSON/cache-stampede) for a compatible library).  The tokens should be considered to be very sensitive information and should only be cached on a secure database (if caching is applied).

Calling the impersonate function (with an email address as argument) will return a promise to the jwt token for that email.  This token can then be used in any googleapis functions that are allowed by the scope.  
Here is an example of a function that searches emails of a particular user:

```
var impersonate = require('impersonate')({
      SERVICE_ACCOUNT_EMAIL: 'xxx@developer.gserviceaccount.com',
      SERVICE_ACCOUNT_KEY_FILE: 'xxx.pem',
      SERVICE_ACCOUNT_KEY : null,
      SERVICE_ACCOUNT_SCOPE: ['https://www.googleapis.com/auth/gmail.readonly']
      // optional cache -->  cache : require('cache-stampede').mongo(db.collection('jwt_tokens'))
    });

var authClient = impersonate('email@gmail.com')

function searchEmails(email,query) {
  return impersonate.googleapis.gmail('v1')
    .users
    .messages
    .list({
      userId:email,
      q:query,
      auth:authClient
    });
}
```

### Licence
impersonate.js
Copyright (c) 2014, Ziggy Jonsson (ziggy.jonsson.nyc@gmail.com)
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* The name Ziggy Jonsson (Sigurgeir Orn Jonsson) may not be used to endorse or 
  promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL ZIGGY JONSSON BE LIABLE FOR ANY DIRECT,
INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.