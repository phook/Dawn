const path = require('path')
const fs = require('fs')
const bnft = require("./BNFT/BNFT.js");
const UglifyJS = require("uglify-js");

var Dawn = require("./Dawn.js");
Dawn.initialize("./dawn");
basic_flavor_parser = new bnft(Dawn.resourceAsString("dawn/Flavors/basic.bnft"), {alert:reportError, fileToString: Dawn.resourceAsString, path:"dawn/Flavors/"});
dawn_flavor_parser = new bnft(Dawn.resourceAsString("dawn/Flavors/dawn.bnft"), {alert:reportError, fileToString: Dawn.resourceAsString, path:"dawn/Flavors/"});

function reportError(err)
{
    console.log(err);
    Dawn.debugInfo(err);
}


function traverse_directory(directory)
{
    fs.readdir(directory, function (err, files) {
       files.sort().forEach(function (filename) {
            filepath = path.resolve(directory, filename); 
            var stat = fs.statSync(filepath);
            if (filename.indexOf(".dawn") !== -1)
            {
               console.log("compiling "+filename);
                var source = Dawn.resourceAsString(filepath);
                if (filename.indexOf(".dawn_") != -1)
                {
                    var flavor = filename.substring(filename.indexOf(".dawn_")+6);
                    if (flavor == "basic")
                    {
                        source = basic_flavor_parser.parse(source,{alert:reportError, fileToString: Dawn.resourceAsString,nonterminal:"TO_DAWN_BASE"});
                    }
                    else
                    {
                        console.log("unknown flavor "+ filename);
                        return;
                    }
                    if (source == "ERROR")
                    {
                         console.log("compile error "+ filename);
                         return;
                    }

                }
                source = dawn_flavor_parser.parse(source,{alert:reportError, fileToString: Dawn.resourceAsString,nonterminal:"PROGRAM"}) +"\n";
                source = UglifyJS.minify(source).code;
                var jsFilename=filepath.substr(0,filepath.indexOf(".dawn"))+".js";
                console.log("saving "+ jsFilename);
                Dawn.saveStringResource(jsFilename,source,true);

                // test for js version
                // stat for timestamps
                // if different or missing
                //    test for flavored - if do flavor compile
                //    compile to js
                //    save and match time
            }
            else
            if (stat && stat.isDirectory()) {                   
                traverse_directory(directory + "/" + filename);
            }
        });
    });
}

traverse_directory(".");