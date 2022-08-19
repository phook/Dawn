const Fob = Dawn.require('./dawn/Resource.js');
function http()
{
{let http = Dawn.require('https'); 
 this._in_go = function(scope)
 {
 let self=this;
 let bindee=this.bindee;// it gets lost?!?
 let promise = new Dawn.Promise();
 promise.promise().then(function()
 {
 scope._execute_next_function(scope)
 }
 );
 http.get("https:" + this._url, function(resp)
 {
 let data = '';
 resp.on('data', function(chunk)
 {
 if (!promise.isSettled())
 {
 data += chunk;
 }
 }
 );
 resp.on('end', function()
 {
 if (!promise.isSettled())
 {
 // late binding example - here the received is treated as a string and bound to next during run - mime type should be detected
 let dataAsString = scope._get_owner()._lookup("String:"+encodeURIComponent(data));
 dataAsString._bind(bindee);
 scope._add_next_function(dataAsString,dataAsString._in_go);
 promise.resolve();
 }
 }
 );
 }
 ).on('error', function(e)
 {
 promise.reject();
 console.error(e);
 }
 );
 return promise;
 }
 this._in_instanciate = function(pipe)
 {
 return Object.assign({_url:decodeURIComponent(pipe._value)},this); 
 }}}
module.exports=http;
