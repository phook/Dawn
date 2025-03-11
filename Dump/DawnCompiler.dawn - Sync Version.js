let DawnCompiler = function () {
   let Tokenizer = function (source) {

      this.source = source;
      this.position = 0; // current position (or current peekposition if peeking)
	 
      this.lastPosition = 0;
      this.store_next_error = true;
      this.next_error = "";
      
      this.peekPosition = []; // for storing current position when peeking
      this.indents = []; // for indents - significant whitespace

	  this.rememberPosition=0;
      this.endOfScript = function () {
        return this.position >= source.length;
      };

      // returns next char and advances position
      this.nextChar = function () {
        let result = this.currentChar();
        this.next();
        return result;
      };

      // advances position
      this.next = function () {
        this.position += 1;
        if (this.position > this.lastPosition)
        {
            this.store_next_error = true;
            this.lastPosition = this.position;
        }
      };
      this.error = function(msg)
      {
        if (this.store_next_error)
            this.next_error = msg;
      };

      // returns current char
      this.currentChar = function () {
        if (this.position >= this.source.length) {
          return "\x00";
        }
        return this.source.substring(this.position, this.position + 1);
      };

      // returns if peeking is active
      this.peeking = function () {
        return this.peekPosition.length !== 0;
      };

      // push/start peeking
      this.peek = function () {
        this.peekPosition.push(this.position);
      };

      // pop/stop peeking
      this.unPeek = function (passThrough) {
        if (this.peeking()) {
          this.position = this.peekPosition.pop();
        }
		return passThrough;
      };

      // pop/stop peeking
      this.stopPeek = function (passThrough) {
        if (this.peeking()) {
            this.peekPosition.pop();
        }
		return passThrough;
      };

      // checks for next token to be s and advances position
      this.nextIs = function (s, caseSensitive) {

        caseSensitive = (caseSensitive === undefined) ? true : caseSensitive;

        if (this.peekNextIs(s, caseSensitive)) {
          this.position += s.length;
          return true;
        }
        return false;
      };

      // checks for next token to be s
      this.peekNextIs = function (s, caseSensitive) {

        caseSensitive = (caseSensitive === undefined) ? true : caseSensitive;
 
        if (this.position + s.length > this.source.length) {
          return false;
        }

        let match = this.source.substring(this.position, this.position + s.length);

        if (caseSensitive) {
          return match === s;
        }

        return match.toLowerCase() === s.toLowerCase();
      };

      // inserts a string at mark
      this.insertFrom = function (mark, stringToInsert) {
        this.source = source.substring(0, mark) + stringToInsert + "\n" + source.substring(this.position);
        this.position = mark;
      };
	  
      this.mark=function()
      {
        this.rememberPosition = this.position;
      }

      this.identifier=function()
      {
        return this.source.substring(this.rememberPosition,this.position);
      }
    };
	
	this.compilation="";
	this.rememberPosition=new Array();
	this.mark=function()
	{
		this.rememberPosition.push(this.compilation.length);
	}
	this.unmark=function()
	{
		this.rememberPosition.pop();
	}
	this.insertAndPopMark=function(insertionBefore,insertAfter,removeList,qualifyInput)
	{
		let centerSection = this.compilation.substring(this.rememberPosition.at(-1));
		if (removeList)
		{
			if (centerSection.indexOf("this._lookup(\"List:\")._add(") == 0 && centerSection.lastIndexOf(")") == centerSection.length-1)
			{
				centerSection = centerSection.replace("this._lookup(\"List:\")._add(","").slice(0, -1); ;
			}
		}
		if (qualifyInput)
		{
			centerSection = centerSection.replaceAll("input:","input:"+qualifyInput);
		}
        this.compilation = this.compilation.substring(0, this.rememberPosition.at(-1)) + insertionBefore + centerSection +insertAfter;		
		this.unmark();
	}
	this.cancelMarkAndRewind=function()
	{
        this.compilation = this.compilation.substring(0, this.rememberPosition.at(-1));		
		this.unmark();
	}
	this.numberOfResourcesInFlow=new Array();
	this.incNumberOfResources =function()
		{
			if (this.numberOfResourcesInFlow.length)
				this.numberOfResourcesInFlow[this.numberOfResourcesInFlow.length-1]++;
		}
	this.currentNumberOfResources =function()
		{
			if (this.numberOfResourcesInFlow.length)
				return this.numberOfResourcesInFlow[this.numberOfResourcesInFlow.length-1];
			return 9e9;
		}
	
///// DAWN SYNTAX DEFINITION
///// URI - MOST BASIC PRIMITIVE OF DAWN
	this._alpha = function()
	{
		let currentChar = this.tokenizer.currentChar();
		if (currentChar>="a" && currentChar<="z") 
			this.tokenizer.next(); 
		else
		if (currentChar>="A" && currentChar<="Z") 
			this.tokenizer.next(); 
		else
			return false;
		return true;
	}

	this._digit = function()
	{
		let currentChar = this.tokenizer.currentChar();
		if (currentChar>="0" && currentChar<="9") 
			this.tokenizer.next(); 
		else
			return false;
		return true;
	}

	this._hex = function()
	{
		let currentChar = this.tokenizer.currentChar();
		if (this._digit()) return true;
		if (currentChar>="a" && currentChar<="f") 
			this.tokenizer.next(); 
		else
		if (currentChar>="A" && currentChar<="F") 
			this.tokenizer.next(); 
		else
			return false;
		return true;
	}

	this._safe = function()
	{
		let currentChar = this.tokenizer.currentChar();
		if ("$-_@.&:#=?".indexOf(currentChar) != -1) 
			this.tokenizer.next(); 
		else
			return false;
		return true;
	}

	this._extra = function()
	{
		let currentChar = this.tokenizer.currentChar();
		if ("!*\"'|,()/".indexOf(currentChar) != -1) 
			this.tokenizer.next(); 
		else
			return false;
		return true;
	}

 	this._escape = function()
	{
		this.tokenizer.peek();
		let currentChar = this.tokenizer.currentChar();
		if (currentChar == "%") 
		{
			this.tokenizer.next();
			if (this._hex())
				if (this._hex())
				{
					this.tokenizer.stopPeek();
					return true;
				}
		}
		this.tokenizer.unPeek();
		return false;
	}

 	this._xalpha = function()
	{
		if (this._alpha()) return true;
		if (this._digit())  return true;
		if (this._safe())   return true;
		if (this._extra())  return true;
		if (this._escape()) return true;
		return false;
	}

 	this._uri = function()
	{
		this.tokenizer.mark(); // put mark in tokenizer to be able to retrieve identifiers (uris)
		if (!this._xalpha()) return false;
		while (this._xalpha())
		{
		}
		this.compilation += "this._lookup(\"" + this.tokenizer.identifier() + "\")";
		return true;
	}

	// WHITESPACES, NEWLINES, SEPARATORS

	this._opt_whitespace = function()
	{
		while (this.tokenizer.nextIs(" ") || this.tokenizer.nextIs("\t"))
		{
		}
		return true;
	}

	this._opt_newline = function()
	{
		while (this.tokenizer.nextIs(" ") || this.tokenizer.nextIs("\t") || this.tokenizer.nextIs("\r") || this.tokenizer.nextIs("\n"))
		{
		}
		return true;
	}

	this._whitespace = function()
	{
		let currentChar = this.tokenizer.currentChar();
		if (currentChar != " " && currentChar != "\t")
			return false;
		this._opt_whitespace();
		return true;
	}

	this._newline = function()
	{
		let currentChar = this.tokenizer.currentChar();
		if (currentChar != "\r" && currentChar != "\n")
			return false;
		this._opt_newline();
		return true;
	}

	this._separator = function()
	{
		if (this._whitespace()) return true;
		if (this._newline()) return true;
		return false;
	}

// DAWN SYNTAX
	this._flow_list_end = function(module)
	{
		this.tokenizer.peek();
		this.mark();
		while (this._separator())
		{
			if (this.resourceName == "" &&
				this.inputName    == "" &&
				this.outputName   == "")
				this.compilation+=",";
			if (this._flow(module))
			{
				this.unmark();
				this.tokenizer.stopPeek();
				this.tokenizer.peek();
				this.mark();
			}
		}
		this.cancelMarkAndRewind();
		this.tokenizer.unPeek();
		return true;
	}

	this._flow_list = function(module)
	{
		if (!this.tokenizer.nextIs("[")) return false;
		this.mark();
		this.tokenizer.peek();
		this._opt_whitespace();
		if (!this._flow(module))
		{
			this.cancelMarkAndRewind();
			return this.tokenizer.unPeek(false); // return false and unpeek
		}
		if (!this._flow_list_end(module))
		{
			this.cancelMarkAndRewind();
			return this.tokenizer.unPeek(false);
		}
		this._opt_whitespace();
		if (!this.tokenizer.nextIs("]"))
		{
			this.cancelMarkAndRewind();
			return this.tokenizer.unPeek(false);
		}
		this.tokenizer.stopPeek();
		if (this.resourceName     != "" ||
			this.inputName        != "" ||
			this.nativeJavascript != "" ||
			this.outputName       != "")
			this.unmark();
		else
			this.insertAndPopMark("this._lookup(\"List:\")._add(",")");
		return true;
	}

	this._flow_middle = function(module)
	{
		this.tokenizer.peek();
		this._opt_whitespace();
		if (!this.tokenizer.nextIs(">>")) return this.tokenizer.unPeek(false); // return false;
		this.mark();
		if (this.resourceName == "" &&
			this.inputName    == "" &&
			this.outputName   == "")
			this.compilation+=",";
		this._opt_whitespace();		
		if (this._uri())  
		{
			let identifier = this.tokenizer.identifier();
			if (module && identifier.indexOf("NewResource:") == 0)
			{
				this.cancelMarkAndRewind();
				this.resourceName = identifier.replace("NewResource:","");
			}
			else
			if (module && identifier.indexOf("NewInput:") == 0)
			{
				this.cancelMarkAndRewind();
				this.inputName = identifier.replace("NewInput:","");
			}
			else
			if (module && identifier.indexOf("NewOutput:") == 0)
			{
				this.cancelMarkAndRewind();
				this.outputName = identifier.replace("NewOutput:","");
			}
			/*else
			if (module && identifier.indexOf("Native.Javascript:") == 0)
			{
				this.cancelMarkAndRewind();
				this.nativeJavascript = decodeURIComponent(identifier.replace("Native.Javascript:",""));
			}*/
			else
				this.unmark();
			return this.tokenizer.stopPeek(true); // return true;
		}
		if (this._flow_list(module))
		{
			this.unmark();
			return this.tokenizer.stopPeek(true); // return true;
		}
		if (this._flow(module))
		{
			this.unmark();
			return this.tokenizer.stopPeek(true); // return true;
		}
		this.tokenizer.unPeek();
		this.cancelMarkAndRewind();
		return false;
	}

	this._flow_end = function(module)
	{
		if (!this._flow_middle(module)) return false;
		this.incNumberOfResources();
		while (this._flow_middle(module))
		{
			this.incNumberOfResources();
		}
		return true;
	}


	this._flow_begin = function(module)
	{
		this.mark();
		if (this._uri())
		{
			let identifier = this.tokenizer.identifier();
			if (module && identifier.indexOf("NewOutput:") == 0)
			{
				this.cancelMarkAndRewind();
				this.outputName = identifier.replace("NewOutput:","");
			}
			else
			if (module && identifier.indexOf("Native.Javascript:") == 0)
			{
				this.cancelMarkAndRewind();
				this.nativeJavascript = decodeURIComponent(identifier.replace("Native.Javascript:",""));
			}
			else
				this.unmark();
			return true;
		}
		this.cancelMarkAndRewind();
		if (this._flow_list(module)) return true;
		return false;
	}

	this._flow = function(module)
	{
		this.resourceName="";
		this.inputName="";
		this.outputName="";
		this.nativeJavascript="";
		this.mark();
		if (!this._flow_begin(module))
		{
			this.cancelMarkAndRewind();
			return false;
		}
		this.numberOfResourcesInFlow.push(1);
		this._flow_end(module);
		if (this.resourceName!="")
			this.insertAndPopMark("function "+this.resourceName+"()\n{\nResource.call(this,\""+this.resourceName+"\");\nthis.Processor="+this.resourceName+"Processor;\nreturn this;\n}\nfunction "+this.resourceName+"Processor(resource)\n{\nResource.Processor.call(this,resource);\n",
		                          "}\n"+this.resourceName+".Processor="+this.resourceName+"Processor;\nmodule.exports="+this.resourceName+";");
		else
		if (this.inputName!="" && this.nativeJavascript!="")
			this.insertAndPopMark("this._in_"+this.inputName+"=function(input_"+this.inputName.replace("_$","")+")\n{\n",
		                          "\n}\n");
		else
		if (this.inputName!="")
			this.insertAndPopMark("this._in_"+this.inputName+"=function(input_"+this.inputName+")\n{\nthis.__in_"+this.inputName+"_value = input_"+this.inputName+"._instanciate_processor();\nthis._in_"+this.inputName+"_lines = [",
		                          "];\nthis._in_"+this.inputName+" = function(input_"+this.inputName+")\n{\nthis.__input_"+this.inputName+"_value = input_"+this.inputName+"._instanciate_processor();\nthis._execute(this,this._in_"+this.inputName+"_lines);\n}\nthis._execute(this,this._in_"+this.inputName+"_lines);\n}\n",true,this.inputName);
		else
		if (this.outputName!="")
			this.insertAndPopMark("this._out_"+this.outputName+"=null;\n",
		                          "");
		else
		if (this.nativeJavascript!="")
			this.insertAndPopMark("",
		                          this.nativeJavascript);
		else
		if (this.currentNumberOfResources()>1) 
			this.insertAndPopMark("this._lookup(\"Flow:\")._add(",
		                          ")");
		else
			this.unmark();
		this.numberOfResourcesInFlow.pop();
		return true;
	}

	this._module = function()
	{
		if (!this._flow(true))
			return false;
		this._opt_newline();
		return true;
	}
	
	this._program = function(module)
	{
		if (!this.tokenizer.nextIs("[")) return false;
		this.mark();
		this.tokenizer.peek();
		this._opt_whitespace();
		if (!this._flow(module))
		{
			this.cancelMarkAndRewind();
			return this.tokenizer.unPeek(false); // return false and unpeek
		}
		if (!this._flow_list_end(module))
		{
			this.cancelMarkAndRewind();
			return this.tokenizer.unPeek(false);
		}
		this._opt_newline();
		if (!this.tokenizer.nextIs("]"))
		{
			this.cancelMarkAndRewind();
			return this.tokenizer.unPeek(false);
		}
		this.tokenizer.stopPeek();
		this.insertAndPopMark("this._lookup(\"List:\")._add(",")");
		this._opt_newline();
		return true;
	}

	///// END OF DAWN SYNTAX DEFINITION

	this.tokenizer = null;

	this.parse = function(source) {
		
		this.tokenizer = new Tokenizer("["+source+"]");
			
		if (this._program() && this.tokenizer.position == this.tokenizer.source.length)
			return this.compilation;
		else
			return "ERROR";
		
	}

	this.parseToModule = function(source) {
		
		this.tokenizer = new Tokenizer(source);
	
		this.compilation += "const Resource = Dawn.require('./dawn/Resource.js');\n";
		
		if (this._module() && this.tokenizer.position == this.tokenizer.source.length)
		{
			this.compilation += "";
			return this.compilation;
		}
		else
			return "ERROR";
		
	}

};

/*
let arguments = process.argv.slice(2)

if (arguments.length != 1)
{
    console.log("USAGE: dawn.bat <filename>");
    process.exit();
}

let Dawn = require("./Dawn.js");
let BNFT = require("./BNFT/BNFT.js");
Dawn.initialize(".",null,false);
Dawn.print = console.log;
 
let compiler = new DawnCompiler();

let fileName = arguments[0]; 
let source = Dawn.resourceAsString(fileName);

console.log(compiler.parseToModule(source));
*/
module.exports=DawnCompiler;
