var EXPORTED_SYMBOLS = [];
Components.utils.import("resource://foxcub/foxcubService.js");

/*
	Licencováno pod MIT Licencí, její celý text je uveden v souboru licence.txt
	Licenced under the MIT Licence, complete text is available in licence.txt file
*/

/**
 * @overview Nastroje pro práci s objekty: kopírování, serializace, porovnání.
 * @version 3.0
 * @author jelc, zara
 */ 


/**
 * @class třída provádí operace s objekty jako je jejich porovnávaní a serializace a deserializace
 * @group jak
 */    
FoxcubService.JAK.ObjLib = FoxcubService.JAK.ClassMaker.makeClass({
	NAME: "ObjLib",
	VERSION: "3.0"
});

/**
 * implicitní konstruktor, 
 * @method 
 */ 
FoxcubService.JAK.ObjLib.prototype.$constructor = function(){
	this._options = {
		functionResistant : false,
		recursionResistant : false,
		depthResistant : false,
		sortedSerialization : false,
		showFlag : false,
		depth :200
	}
};
/**
 * implicitni destruktor, zatím se nepoužívá
 * @method 
 */ 
FoxcubService.JAK.ObjLib.prototype.$destructor = function(){

};
/**
 * Metoda provede merge mezi výchozím nastavením serializace a novým předaným v options
 * vrací nové nastavení, je-li parametr "set" vyhodnocen jako true
 * změní přímo výchozí nastavení
 * @method 
 * @param {object} options objekt popisující chování serializace
 * @param {boolean} options.functionResistant  určuje, jak se zachovat v případě že vlastnost objektu je funkce (vyvolat výjimku nebo místo její hodnoty vypsat zprávu "<strong>function: </strong><em>jmeno vlastnosti</em>]")
 * @param {boolean} options.recursionResistant určuje, jak se zachovat v případě nalezení cyklické reference (vyvolat výjimku nebo místo její hodnoty vypsat zprávu "<strong>circular reference found</strong>")
 * @param {boolean} options.depthResistant určuje, jak se zachovat v případě překročení maximální povolené hloubky zanoření do objektu (buď vyvoláním výjimky nebo na místo překročení vypíše zprávu <strong>max depth overrun</strong>)
 * @param {boolean} options.sortedSerialization určuje, zda vlastnosti objektu budou v serializovaném výstupu seřazeny
 * @param {string} options.showFlag je-li definován a jeho hodnota se vyhodnotí jako "true" upřesňuje vzhled "pretty" výstupu
 * @param {number} options.depth maximální hloubka do jaké objekt zkoumáme
 * @param {boolean} [set] přepínáč způsobu zpracování true||false = pouze vrátit || přepsat 
 * @return {object} nové nastavení po merge
 */ 
FoxcubService.JAK.ObjLib.prototype.reSetOptions = function(newOptions,set){
	if(!newOptions){
		return this._options;
	}
	var out = {};
	for(var i in this._options){
		if(set && newOptions[i]){
			this._options[i] = newOptions[i];
		}
		out[i] = newOptions[i] ? newOptions[i] : this._options[i];
	}
	return out;
}


// prevede serializovany retezec do "lidsky citelne" podoby
/**
* převede řetězec obsahující JSON zápis do čitelnější podoby (přidá zalomení
* na konci řádků a odsazení)
* @method
* @param {string} str převáděný řetězec
* @param {string} [sep] řetězec, který se použije na odsazování řádek
* @returns {string} 
*/
FoxcubService.JAK.ObjLib.prototype.pretty = function(str,sep){
	var arr = str.toString().split("");
	var newline = this._isIE() ? "\n\r" : "\n";
	var tab = sep ? sep : "\t";
	
	var ptr = 0;
	var depth = 0;
	var inSpecial = "";
	
	function countBackslashes() {
		var cnt = 0;
		var ptr2 = ptr-1;
		while (ptr2 >= 0 && arr[ptr2] == "\\") {
			cnt++;
			ptr2--;
		}
		return cnt;
	}
	
	while (ptr < arr.length) {
		var ch = arr[ptr];
		switch (ch) {
			case '"':
				if (inSpecial == "re") { break; }
				var num = countBackslashes();
				if (!(num & 1)) {
					inSpecial = (inSpecial ? "" : "str");
				}
			break;
			
			case '/':
				if (inSpecial == "str") { break; }
				var num = countBackslashes();
				if (!(num & 1)) {
					inSpecial = (inSpecial ? "" : "re");
				}
			break;
			
			case ',':
				if (!inSpecial) {
					arr.splice(++ptr, 0, newline);
					for (var i=0;i<depth;i++) {
						arr.splice(++ptr, 0, tab);
					}
				}
			break;
			
			case '{':
			case '[':
				if (!inSpecial) {
					depth++;
					arr.splice(++ptr, 0, newline);
					for (var i=0;i<depth;i++) {
						arr.splice(++ptr, 0, tab);
					}
				}
			break;
			
			case '}':
			case ']':
				if (!inSpecial) {
					arr.splice(ptr++, 0, newline);
					depth--;
					for (var i=0;i<depth;i++) {
						arr.splice(ptr++, 0, tab);
					}
				}
			break;
		
		}
		ptr++;
	}
	return arr.join("");
}


/**
 * převádí objekt na řetězec obsahující literalovou formu zapisu objektu (JSON)
 * případně ho převádí do lidsky čitelné podoby (nelze pak unserializovat)
 * @method  
 * @param {object} objToSource objekt, který chceme serializovat
 * @param {object} [options] objekt popisující chování serializace
 * @param {boolean} [options.functionResistant]  určuje, jak se zachovat v případě že vlastnost objektu je funkce (vyvolat výjimku nebo místo její hodnoty vypsat zprávu "<strong>function: </strong><em>jmeno vlastnosti</em>]")
 * @param {boolean} [options.recursionResistant] určuje, jak se zachovat v případě nalezení cyklické reference (vyvolat výjimku nebo místo její hodnoty vypsat zprávu "<strong>circular reference found</strong>")
 * @param {boolean} [options.depthResistant] určuje, jak se zachovat v případě překročení maximální povolené hloubky zanoření do objektu (buď vyvoláním výjimky nebo na místo překročení vypíše zprávu <strong>max depth overrun</strong>)
 * @param {boolean} [options.sortedSerialization] určuje, zda vlastnosti objektu budou v serializovaném výstupu seřazeny
 * @param {string} [options.showFlag] je-li definován a jeho hodnota se vyhodnotí jako "true" upřesňuje vzhled "pretty" výstupu
 * @param {number} [options.depth] maximální hloubka do jaké objekt zkoumáme
 * @returns {string} řetězcová reprezantace objektu  
 * @throws {error}  'Serialize error: property is function' pokud narazí na vlastnost, která je funkcí
 * @throws {error}  'Serialize structure so deep' pokud je structura objektu hlubsei nez DEEP zanoreni
 * @throws {error}  'serialize: Circular reference encountered' pokud je nalezena cyklická reference
 */    
FoxcubService.JAK.ObjLib.prototype.serialize = function(objToSource,options){
	var deepFlag = 0;
	var startString = '{';
	var endString = '}';
	var propertySep = ':';
	var propertyEnd = ',';

	var mySelf = this;
	var output = '';
	var firstStep = true;
	var cache = [];
	
	var mOptions = this.reSetOptions(options);
	
	var mySource = function(obj){
		
		
		if(mOptions.depth && (mOptions.depth < deepFlag)){
			if(!mOptions.depthResistant){
				throw new Error('Serialize: structure is too depth.');
			} else {
				return '"[max depth overrun]"'
			}
		}
		
		
		if(cache.indexOf(obj) != -1){
			if(!mOptions.recursionResistant){
				// volitelne
				throw new Error("serialize: Circular reference encountered");
				return null;
			} else {
				return '"[circular reference found]"';
			}					
		}
		
		if(typeof arguments[1] != 'undefined'){
			var propName = arguments[1];
		} else {
			var propName = false
		}
		
		if(!(obj instanceof Object)){
			switch(typeof obj){
				case 'string':
					return '"' + mySelf._formatString(obj) + '"';
					break;
				case 'undefined':
					return obj;
					break;
				default:
					return obj;
					break;
			}

		} else {
			cache.push(obj);
			var builtIn = mySelf._builtInObjectSerialize(obj,mOptions);
			if(builtIn.isSet){
				return builtIn.output;
			} else {
				if(typeof obj == 'function'){
					if(!mOptions.functionResistant){
					// volitelne
						throw new Error('Serialize: can\'t serialize object with some method - ** ' + (propName ? 'obj' : propName) +' **');
					} else {
						return '"[' + 'function: ' + propName + ']"';
					}
				}
				var output = startString;
				deepFlag++
				
				var klice = [];
				for (var p in obj) { klice.push(p); }
				// volitelne
				if(mOptions.sortedSerialization){
					klice.sort();
				} 
				
				for(var i=0;i<klice.length;i++){
					var klic = klice[i];

					var propName = mySelf._formatString(klic);
					//output += '"' + propName  + '"' + propertySep + (isEmpty ? '{}' : mySource(obj[klic],klic)) + propertyEnd;
					try {
						var value = obj[klic];
					} catch(e){
						var value = "[value inaccessible]"
					}
					output += '"' + propName  + '"' + propertySep + mySource(value,klic) + propertyEnd;
				}
				/* odstranim posledni carku je-li */
				var charNum = (output.lastIndexOf(propertyEnd) >= 0) ? output.lastIndexOf(propertyEnd) : output.length;
				output = output.substring(0,charNum);
				deepFlag--;
				return output +  endString;				
			}

		}
		
	};
	
	
	var source = mySource(objToSource);
	if(mOptions.showFlag){
		return this.pretty(source,mOptions.showFlag)
	} else {
		return source;
	}
};

/**
 * převedení pole na řetězc, který odpovídé literálové formě zápisu pole
 * @method 
 * @private
 * @param {array} fieldToSerialize pole určené k převedení
 * @param {object} [options] objekt popisující chování serializace
 * @param {boolean} [options.functionResistant]  určuje, jak se zachovat v případě že vlastnost objektu je funkce (vyvolat výjimku nebo místo její hodnoty vypsat zprávu "<strong>function: </strong><em>jmeno vlastnosti</em>]")
 * @param {boolean} [options.recursionResistant] určuje, jak se zachovat v případě nalezení cyklické reference (vyvolat výjimku nebo místo její hodnoty vypsat zprávu "<strong>circular reference found</strong>")
 * @param {boolean} [options.depthResistant] určuje, jak se zachovat v případě překročení maximální povolené hloubky zanoření do objektu (buď vyvoláním výjimky nebo na místo překročení vypíše zprávu <strong>max depth overrun</strong>)
 * @param {boolean} [options.sortedSerialization] určuje, zda vlastnosti objektu budou v serializovaném výstupu seřazeny
 * @param {string} [options.showFlag] je-li definován a jeho hodnota se vyhodnotí jako "true" upřesňuje vzhled "pretty" výstupu
 * @param {number} [options.depth] maximální hloubka do jaké objekt zkoumáme 
 * @returns literalový zápis pole
 * @throws {error} 'Serialize: can\'t serialize Function' prvek pole je funkce
 * @throws {error}  'arraySerialize: Attribute is not Array' argument metody není pole
 */   
FoxcubService.JAK.ObjLib.prototype._arraySerialize = function(fieldToSerialize,options){
	var fieldStr = '';
	var mySelf = this;
	var mOptions = options;
	var mySource = function(field){
		if(field instanceof Array){
			for(var i = 0; i < field.length; i++){
				if(typeof field[i] == 'function' && !(field[i] instanceof RegExp)){
					if(!mOptions.functionResistant){
						throw new Error('Serialize: can\'t serialize Function');
					} else {
						fieldStr +=  '\"[' + 'function: ' + i + ']\",';
						continue;
					}
				}
				if((typeof field[i] != 'object') && ((typeof field[i] != 'function'))){
					if(typeof field[i] == 'string'){
						var str = mySelf._formatString(field[i]);
						fieldStr += '\"' + str + '\",';
					} else {
						fieldStr += field[i] + ',';
					}
				} else {
					fieldStr +=  mySelf.serialize(field[i],mOptions) + ',';
				}
			}
			return '[' + fieldStr.substring(0,fieldStr.length - 1) + ']';
		} else {
			throw new Error('arraySerialize: Attribute is not Array');
		}
	}
	var myString = mySource(fieldToSerialize);
	return myString;
};

/**
 * převede řetězec obsahující literálovou formu zápisu pole nebo objektu 
 * na pole nebo objekt 
 * @method 
 * @param {string} serializedString řetězec k převedení
 * @returns {object} vytvořený ze vstupního řetězce 
 */    
FoxcubService.JAK.ObjLib.prototype.unserialize = function(serializedString){
	if(!this.nativeJSON) this.nativeJSON = Components.classes["@mozilla.org/dom/json;1"].createInstance(Components.interfaces.nsIJSON);
	return this.nativeJSON.decode(serializedString);	
}

/**
 * porovnává dva objekty zda jsou datově shodné, porovnavanim jejich serializovanych retezcu
 * <br /><strong>POZOR: V případě, že jsou atributy options parametru příliš benevolntní nemusí být výsledek porovnání relevantní !!</strong> 
 * @method  
 * @param {object} refObj objekt, s kterým porovnáváme
 * @param {object} matchObj objekt, který porovnáváme
 * @param {object} [options] objekt popisující chování serializace
 * @param {boolean} [options.functionResistant]  určuje, jak se zachovat v případě že vlastnost objektu je funkce (vyvolat výjimku nebo místo její hodnoty vypsat zprávu "<strong>function: </strong><em>jmeno vlastnosti</em>]")
 * @param {boolean} [options.recursionResistant] určuje, jak se zachovat v případě nalezení cyklické reference (vyvolat výjimku nebo místo její hodnoty vypsat zprávu "<strong>circular reference found</strong>")
 * @param {boolean} [options.depthResistant] určuje, jak se zachovat v případě překročení maximální povolené hloubky zanoření do objektu (buď vyvoláním výjimky nebo na místo překročení vypíše zprávu <strong>max depth overrun</strong>)
 * @param {boolean} [options.sortedSerialization] určuje, zda vlastnosti objektu budou v serializovaném výstupu seřazeny
 * @param {string} [options.showFlag] je-li definován a jeho hodnota se vyhodnotí jako "true" upřesňuje vzhled "pretty" výstupu
 * @param {number} [options.depth] maximální hloubka do jaké objekt zkoumáme 
 * @returns true = jsou shodné, false = nejsou shodné
 */    
FoxcubService.JAK.ObjLib.prototype.match = function(refObj,matchObj,options){
	var mOptions = {
		functionResistant : false,
		recursionResistant : false,
		depthResistant : false,
		sortedSerialization : true,
		showFlag : false,
		depth :200
	}
	
	if(options){
		for(var i in mOptions){
			mOptions[i] = (typeof options[i] != 'undefined'? options[i] : mOptions[i]);
		}
	}
	
	if(this.serialize(refObj,mOptions) == this.serialize(matchObj,mOptions)){
		return true;
	} else {
		return false;
	}
};

/**
 * převádí na řetězec nativní objekty javascriptu, případně pole
 * @private
 * @method 
 * @param {object} objekt k převedení na řetězec
 * <ul>
 * <li>isSet <em>{bool} určuje zda byl předaný objekt serializován</em></li>
 * <li>output <em>{object}</em> serializovaný argument metody, pokud to bylo možné, jinak null</li>   
 * </ul>
 *
 */     
FoxcubService.JAK.ObjLib.prototype._builtInObjectSerialize = function(testedObj,options){
	var output = null;
	var isSet = false;
	if(testedObj instanceof String){
		//var str = testedObj.replace(/\"/g,'\\"');
		output = 'new String("' + this._formatString(testedObj) + '")';
		isSet = true;
	} else if(testedObj instanceof Number){
		output = 'new Number(' + testedObj + ')';
		isSet = true;
	} else if(testedObj instanceof RegExp){
		output = 'new RegExp(' + testedObj + ')';
		isSet = true;
	} else if(testedObj instanceof Array){
		output = this._arraySerialize(testedObj,options);
		isSet = true;
	} else if(testedObj instanceof Date){
		var tm = testedObj.getTime();
		output = 'new Date(' + tm + ')';
		isSet = true;
	} else if(testedObj instanceof Boolean){
		output = 'new Boolean(' + testedObj + ')';
		isSet = true;
	} else if(testedObj == null){
		isSet = true;
	}
	return {isSet:isSet,output:output};	
};


/**
 * testuje zda je používaný prohlížeč Internet Explorer, pro potřeby lidsky čitelného formátování serializace
 * @private
 * @method 
 * @returns {bool} true = ane, false = ne 
 */  
FoxcubService.JAK.ObjLib.prototype._isIE = function(){
	return false;
};

/**
* pokusí se vytvořit datově identickou kopii objektu který dostane jako vstupní argument
* objekt nesmí obsahovat metody a cyklické reference, vlastní kopírování probíhá tak,
* že se předný objekt serializuje a výsledný string se unserializuje.
* <br /><strong>POZOR: V případě, že jsou atributy options parametru příliš benevolntní nevznikne identická kopie a uživatel se o tom nedoví !!</strong>
* @method
* @param {object} objToCopy kopírovaný objekt
* @param {object} [options] objekt popisující chování serializace
* @param {boolean} [options.functionResistant]  určuje, jak se zachovat v případě že vlastnost objektu je funkce (vyvolat výjimku nebo místo její hodnoty vypsat zprávu "<strong>function: </strong><em>jmeno vlastnosti</em>]")
* @param {boolean} [options.recursionResistant] určuje, jak se zachovat v případě nalezení cyklické reference (vyvolat výjimku nebo místo její hodnoty vypsat zprávu "<strong>circular reference found</strong>")
* @param {boolean} [options.depthResistant] určuje, jak se zachovat v případě překročení maximální povolené hloubky zanoření do objektu (buď vyvoláním výjimky nebo na místo překročení vypíše zprávu <strong>max depth overrun</strong>)
* @param {boolean} [options.sortedSerialization] určuje, zda vlastnosti objektu budou v serializovaném výstupu seřazeny
* @param {string} [options.showFlag] je-li definován a jeho hodnota se vyhodnotí jako "true" upřesňuje vzhled "pretty" výstupu
* @param {number} [options.depth] maximální hloubka do jaké objekt zkoumáme
* @returns {object}
*/
FoxcubService.JAK.ObjLib.prototype.copy = function(objToCopy,options){
	var mOptions = this.reSetOptions(options);
	var str = this.serialize(objToCopy,mOptions);
	return this.unserialize(str);	
};

/**
* ošetří escape sekvence ve zpracovávaných řetězcích, momentálně zpracovává
* tyto znaky: '"','\t','\n','\t' a '\'
* @method
* @private
* @param {string} s ošetřovaný řetězec
* @returns {string} ošetřený řetězec
*/
FoxcubService.JAK.ObjLib.prototype._formatString = function(s) {
	/* add slashes and quotes */
	var re = /["\\']/g;
	
	var re2 = /[\n\r\t]/g;
	var replace = {
		"\n" : "\\n",
		"\t" : "\\t",
		"\r" : "\\r"
	}
	
	return s.replace(re,this._addSlashes).replace(re2,function(ch) {
		return replace[ch];
	});
	
},

/**
* provede vlastní nahrazení v metodě <em>._formatString</em>
* @method
* @private
* @param {string} ch zpracovávaný znak
* @returns {string} ošetřený znak
*/
FoxcubService.JAK.ObjLib.prototype._addSlashes = function(ch) {
	return "\\"+ch;
};

/**
 * kopíruje pole, vytváří datově a typově shodnou kopii pole, které dostane, jako argument
 * @method 
 * @param {array} arrayToCopy pole ke zkopírování
 * @returns {array} kopie pole arrayToCopy
 * @param {object} [options] objekt popisující chování serializace
 * @param {boolean} [options.functionResistant]  určuje, jak se zachovat v případě že vlastnost objektu je funkce (vyvolat výjimku nebo místo její hodnoty vypsat zprávu "<strong>function: </strong><em>jmeno vlastnosti</em>]")
 * @param {boolean} [options.recursionResistant] určuje, jak se zachovat v případě nalezení cyklické reference (vyvolat výjimku nebo místo její hodnoty vypsat zprávu "<strong>circular reference found</strong>")
 * @param {boolean} [options.depthResistant] určuje, jak se zachovat v případě překročení maximální povolené hloubky zanoření do objektu (buď vyvoláním výjimky nebo na místo překročení vypíše zprávu <strong>max depth overrun</strong>)
 * @param {boolean} [options.sortedSerialization] určuje, zda vlastnosti objektu budou v serializovaném výstupu seřazeny
 * @param {string} [options.showFlag] je-li definován a jeho hodnota se vyhodnotí jako "true" upřesňuje vzhled "pretty" výstupu
 * @param {number} [options.depth] maximální hloubka do jaké objekt zkoumáme 
 * @throws {error} 'ObjLib.arrayCopy: Attribute is not Array' pokud argument metody není pole
 */   
FoxcubService.JAK.ObjLib.prototype.arrayCopy = function(arrayToCopy,options){
	if(arrayToCopy instanceof Array){
		var mOptions = this.reSetOptions(options);
		var out =  this.arraySerialize(arrayToCopy,mOptions);
		return this.unserialize(out)
	} else {
		throw new Error('ObjLib.arrayCopy: Attribute is not Array');
	}
};
