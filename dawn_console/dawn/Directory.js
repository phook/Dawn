function _Directory(name, path_to_directory)
{
    var self = this;
    var Fob = require("./Fob.js");
    var File = require("./File.js");
    var fs = require('fs');
    var path = require('path');
    Fob.call(this,name);
    this._type="Directory";
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
                self._add(new _Directory(file,filepath));
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