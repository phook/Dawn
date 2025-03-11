const Resource = Dawn.require("./dawn/Resource.js");


///// Resource can be directory and file at the same time (.js, .dawn)
///// webservice to emulate fs.lstatSync

function DawnServerResource(name, path_to_directory)
{
  Resource.call(this, name);
  this._type = "DawnServerResource";
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
function DawnServerResourceProcessor(resource)
{
	Resource.Processor.call(this,resource); 
	this._in_instanciate = function(flow)
	{
		if (!resource._compiled_object)
			resource._compile();
		let newObject = this._compiled_object._in_instanciate(flow);                
		newObject._children = this._children;
		return newObject;
    }
	return this;

	return this;
}
DawnServerResource.Processor = DawnServerResourceProcessor;

module.exports = DawnServerResource;