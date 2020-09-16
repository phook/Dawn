function _Directory(name, path_to_directory)
{
    var Dawn = require("../Dawn.js");
    var File = require("./File.js");
    var Reference = require("./Reference.js");
    var fs = require('fs');
    var path = require('path');
    if (!Dawn.Fob) // HACK FOR Dawn not initialized when root is passed -> fix will be protocol in root - i.e. not object
        Dawn.Fob = require("./Fob.js");
    Dawn.Fob.call(this,name); 
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
                self._add(new _Directory(file,filepath));
            }
        });
    });

    this.fileToString = function(qualified_filename)
    {
        return fs.readFileSync(qualified_filename, {option:'utf8', function(err, source) {console.log("error reading "+qualified_filename);throw err;}}).toString();
    }

    this.writeFile = function(filename,string,func)
    {
        return fs.writeFile(filename,string,func);
    }

    this.appendFile = function(filename,string,func)
    {
        return fs.appendFile(filename,string,func);
    }

    this._get_qualified_name = function()
    {
        return path_to_directory;
//        return "file://" + path_to_directory.replace(/\\/g,"/").replace(":","|"); // correct url
    }
   
}
module.exports = _Directory;