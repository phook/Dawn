const Fob  = Dawn.require("./dawn/Fob.js");
const File = Dawn.require("./dawn/File.js");
const fs   = Dawn.require('fs');
const path = Dawn.require('path');
function _Directory(name, path_to_directory)
{
    Fob.call(this,name); 
    this._type="Directory";
    var self = this;
    fs.readdir(path_to_directory, function (err, files) {
       files.sort().forEach(function (file) {
            filepath = path.resolve(path_to_directory, file); 
            var stat = fs.statSync(filepath);
            if (file.indexOf(".dawn") !== -1)
            {
                var newFile = new File(file);
                self._add(newFile);
            }
            else
            if (file.indexOf(".js") !== -1)
            {
                var newFile = new File(file);
                self._add(newFile);
            }
            else
            if (stat && stat.isDirectory()) {                   
                var newDirectory = new _Directory(file,filepath);
                self._add(newDirectory);
            }
        });
    });

    this._get_qualified_name = function()
    {
        return path_to_directory;
//        return "file://" + path_to_directory.replace(/\\/g,"/").replace(":","|"); // correct url
    }
}
module.exports = _Directory;