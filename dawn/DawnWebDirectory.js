const Fob = Dawn.require("./dawn/Fob.js");
const DawnWebFile = Dawn.require("./dawn/DawnWebFile.js");

function _DawnWebDirectory(name, path_to_directory)
{
  Fob.call(this, name);
  this._type = "DawnWebDirectory";
  var self = this;

  var X = new XMLHttpRequest();
  var url = "/_dir?dir=file:///"+path_to_directory;
  X.open("GET", url , false); // sync
  X.send();
  if (X.status && X.status !== 200)
    throw new Error(X.statusText);
  if (X.responseText == "")
      return;
  var files = JSON.parse(X.responseText);
  for(var file in files)
  {
    /*
    if (file.indexOf(".dawn") !== -1)
    {
      var newFile = new DawnWebFile(file);
      self._add(newFile);
    }
    else
    */
    if (file.indexOf(".js") !== -1)
    {
      var newFile = new DawnWebFile(file);
      self._add(newFile);
    }
    else
    if (typeof(files[file]) == "object")
    {
      var newDirectory = new _DawnWebDirectory(file + ".", path_to_directory + "/" + file);
      self._add(newDirectory);
    }
  };

  this._get_qualified_name = function()
  {
    return path_to_directory;
    //        return "file://" + path_to_directory.replace(/\\/g,"/").replace(":","|"); // correct url
  }
}
module.exports = _DawnWebDirectory;