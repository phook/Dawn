const path = require('path')
const fs = require('fs')
const bnft = require("./BNFT/BNFT.js");
const UglifyJS = require("uglify-js");

var Dawn = require("./Dawn.js");
Dawn.initialize("./dawn");
basic_flavor_parser = new bnft(Dawn.resourceAsString("dawn/Flavors/basic.bnft"), {alert:reportError, fileToString: Dawn.resourceAsString, path:"dawn/Flavors/"});
dawn_flavor_parser = new bnft(Dawn.resourceAsString("dawn/Flavors/dawn_to_node_module.bnft"), {alert:reportError, fileToString: Dawn.resourceAsString, path:"dawn/Flavors/"});

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
            if (filename.indexOf(".js") == -1)
            if (filename.indexOf(".dawn") !== -1)
            {
               console.log("compiling "+filename);
                var source = Dawn.resourceAsString(filepath);
                if (filename.indexOf(".dawn_") != -1)
                {
                    var flavor = filename.substring(filename.indexOf(".dawn_")+6);
                    if (flavor == "basic")
                    {
                        source = basic_flavor_parser.parse(source,{alert:reportError, fileToString: Dawn.resourceAsString,nonterminal:"TO_DAWN"});
                    }
                    else
                    {
                        console.log("unknown flavor "+ filename);
                        return;
                    }
                    if (source.indexOf("ERROR") == 0)
                    {
                         console.log("compile error for file:"+ filename + " in flavor " + flavor + " compile step");
                         return;
                    }

                }
                source = dawn_flavor_parser.parse(source,{alert:reportError, fileToString: Dawn.resourceAsString,nonterminal:"MODULE"});
                if (source.indexOf("ERROR") == 0)
                {
                    source = UglifyJS.minify(source).code;
                    var jsFilename=filepath+".js";
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
                {
                     console.log("compile error for file:"+ filename + " in dawn compile step");
                     return;
                }
            }
            else
            if (stat && stat.isDirectory()) {                   
                traverse_directory(directory + "/" + filename);
            }
        });
    });
}

traverse_directory(".");