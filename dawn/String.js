const Fob = Dawn.require('./dawn/Resource.js');
function String()
{
this._out_string=null;this._in_string_$=function(string_$){self._value = string._value;}this._in_go=function(go){if (this._out_string)
 {
 this._out_string(this);
 }
 if (this._out_resource)
 {
 this._out_resource(this);
 }}this._in_instanciate=function(instanciate){var newObject = this._clone();
 return Object.assign({_value:decodeURIComponent(instanciate._value)},newObject);}}
module.exports=String;
