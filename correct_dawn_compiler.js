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
	this.insertAndPopMark=function(insertionBefore,insertAfter)
	{
        this.compilation = this.compilation.substring(0, this.rememberPosition.at(-1)) + insertionBefore + this.compilation.substring(this.rememberPosition.at(-1))+insertAfter;		
		this.unmark();
	}
	this.cancelMarkAndRewind=function()
	{
        this.compilation = this.compilation.substring(0, this.rememberPosition.at(-1));		
		this.unmark();
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
		this.tokenizer.mark();
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
		while (this.tokenizer.nextIs(" ") || this.tokenizer.nextIs("\t") || this.tokenizer.nextIs("\r") || this.tokenizer.nextIs("\l"))
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
		if (currentChar != "\r" && currentChar != "\l")
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
	this._flow_list_end = function()
	{
		this.tokenizer.peek();
		this.mark();
		while (this._separator())
		{
			this.compilation+=",";
			if (this._flow())
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

	this._flow_list = function()
	{
		if (!this.tokenizer.nextIs("[")) return false;
		this.mark();
		this.tokenizer.peek();
		this._opt_whitespace();
		if (!this._flow())
		{
			this.cancelMarkAndRewind();
			return this.tokenizer.unPeek(false); // return false and unpeek
		}
		if (!this._flow_list_end())
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
		this.insertAndPopMark("this._lookup(\"List:\")._add(",")");
		return true;
	}

	this._flow_middle = function()
	{
		this.tokenizer.peek();
		this._opt_whitespace();
		if (!this.tokenizer.nextIs(">>")) return this.tokenizer.unPeek(false); // return false;
		this.mark();
		this.compilation+=",";
		this._opt_whitespace(); 
		if (this._uri())  
		{
			this.unmark();
			return this.tokenizer.stopPeek(true); // return true;
		}
		if (this._flow())
		{
			this.unmark();
			return this.tokenizer.stopPeek(true); // return true;
		}
		this.tokenizer.unPeek();
		this.cancelMarkAndRewind();
		return false;
	}

	this._flow_end = function()
	{
		if (!this._flow_middle()) return false;
		while (this._flow_middle())
		{
		}
		return true;
	}


	this._flow_begin = function()
	{
		if (this._uri()) return true;
		if (this._flow_list()) return true;
		return false;
	}

	this._flow = function()
	{
		this.mark();
		if (!this._flow_begin())
		{
			this.cancelMarkAndRewind();
			return false;
		}
		this._flow_end();
		this.insertAndPopMark("this._lookup(\"Flow:\")._add(",")");
		return true;
	}

	///// END OF DAWN SYNTAX DEFINITION

	this.tokenizer = null;

	this.parse = function(source) {
		
		this.tokenizer = new Tokenizer(source);
			
		if (this._flow() && this.tokenizer.position == this.tokenizer.source.length)
			return this.compilation;
		else
			return "ERROR";
		
	}



};
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

console.log(compiler.parse(source));

