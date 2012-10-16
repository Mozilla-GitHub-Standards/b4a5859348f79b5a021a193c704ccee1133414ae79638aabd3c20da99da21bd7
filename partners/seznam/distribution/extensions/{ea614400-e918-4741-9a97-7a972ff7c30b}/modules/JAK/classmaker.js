var EXPORTED_SYMBOLS = [];
Components.utils.import("resource://foxcub/foxcubService.js");


/* obal pro listicku - 1. cast */
(function() {
	var JAK = {};
/* konec 1. casti */


JAK.ClassMaker = {};

/** 
 * @field {string} verze třídy 
 */
JAK.ClassMaker.VERSION = "5.2";
/** 
 * @field {string} název třídy 
 */
JAK.ClassMaker.NAME = "FoxcubService.JAK.ClassMaker";

/**
 * @field {object} zasobnik volani pro $super 
 */
JAK.ClassMaker.stack = {
	names: [],
	methods: []
}

/**
 * Vlastní metoda pro vytvoření třídy, v jediném parametru se dozví informace o třídě, kterou má vytvořit.
 * @param {object} params parametry pro tvorbu nové třídy
 * @param {string} params.NAME povinný název třídy
 * @param {string} [params.VERSION="1.0"] verze třídy
 * @param {function} [params.EXTEND=false] reference na rodičovskou třídu
 * @param {function[]} [params.IMPLEMENT=[]] pole referencí na rozhraní, jež tato třída implementuje
 * @param {object[]} [params.DEPEND=[]] pole závislostí
 */
JAK.ClassMaker.makeClass = function(params) {
	var p = this._makeDefaultParams(params);

	var constructor = function() { /* normalni trida */
		if (!this.constructor.FROZEN) { FoxcubService.JAK.ClassMaker.freeze(this.constructor); }
		if (this.$constructor) { this.$constructor.apply(this, arguments); }
	}

	return this._addConstructorProperties(constructor, p);
}

/**
 * Vlastní metoda pro vytvoření Jedináčka (Singleton), odlišnost od tvorby třídy přes makeClass je, 
 * že třídě vytvoří statickou metodu getInstance, která vrací právě jednu instanci a dále, že konstruktor
 * nelze zavolat pomocí new (resp. pokud je alespoň jedna instance vytvořena.) Instance je uschována do 
 * vlastnosti třídy _instance
 * @see FoxcubService.JAK.ClassMaker.makeClass
 */ 
JAK.ClassMaker.makeSingleton = function(params) {
	var p = this._makeDefaultParams(params);

	var constructor = function() { /* singleton, nelze vytvaret instance */
		throw new Error("Cannot instantiate singleton class");
	}

	constructor._instance = null;
	constructor.getInstance = this._getInstance;

	return this._addConstructorProperties(constructor, p);
}

/**
 * Vlastní metoda pro vytvoření "třídy" charakterizující rozhranní
 * @see FoxcubService.JAK.ClassMaker.makeClass
 */
JAK.ClassMaker.makeInterface = function(params) {
	var p = this._makeDefaultParams(params);

	var constructor = function() {
		throw new Error("Cannot instantiate interface");
	}
	return this._addConstructorProperties(constructor, p);	
}

/**
 * Vlastní metoda pro vytvoření statické třídy, tedy jmeného prostoru
 * @param {object} params parametry pro tvorbu nové třídy
 * @param {string} params.NAME povinný název třídy
 * @param {string} params.VERSION verze třídy
 */
JAK.ClassMaker.makeStatic = function(params) {
	var p = this._makeDefaultParams(params);

	var obj = {};
	obj.VERSION = p.VERSION;
	obj.NAME = p.NAME;
	return obj;
}

/**
 * "Zmrazit" tridu znamena pripravit ji pro pouzivani $super:
 * 1) vlastnim metodam nastavit owner, aby "patrily" tride,
 * 2) obalit vlastni metody anonymnim wrapperem, co supluje call stack
 */
JAK.ClassMaker.freeze = function(ctor) {
	ctor.FROZEN = true; /* priznak zmrazeni */

	/* nejprve projit vlastni funkce a vsechny je znasilnit */
	for (var p in ctor.prototype) {
		if (p == "$super") { continue; } /* neobalujeme */
		if (p == "_$super") { continue; } /* neobalujeme */
		if (!ctor.prototype.hasOwnProperty(p)) { continue; } /* jen vlastni */
		var v = ctor.prototype[p];
		if (typeof(v) != "function") { continue; } /* jen funkce */
		if (v.NAME) { continue; } /* ne JAK tridy */

		this._freezeMethod(v, p, ctor);
	}

	/* rekurzivne zavolat na predcich a rozhranich */
	if (ctor.EXTEND && !ctor.EXTEND.FROZEN) { this.freeze(ctor.EXTEND); }
	
	for (var i=0;i<ctor.IMPLEMENT.length;i++) {		
		var iface = ctor.IMPLEMENT[i];		
		if (!iface.FROZEN) { this.freeze(iface); }
	}
}

/**
 * "Zmrazeni" jedne metody. Nastavime ownera a obalime anon. fci, ktera
 * udrzuje vlastni call stack.
 * @param {function} method
 * @param {string} name Jmeno, abychom vedeli, jakou vlastnost prepsat
 * @param {function} ctor Trida, kde magii provadime
 */
JAK.ClassMaker._freezeMethod = function(method, name, ctor) {
	var stack = FoxcubService.JAK.ClassMaker.stack;
	var newMethod = function() {
		stack.names.push(name);
		stack.methods.push(newMethod);
		var result = method.apply(this, arguments);
		stack.names.pop();
		stack.methods.pop();
		return result;
	}
	newMethod.owner = ctor;
	ctor.prototype[name] = newMethod;
}

/**
 * Vytvoření defaultních hodnot objektu params, pokud nejsou zadané autorem
 * @param {object} params parametry pro tvorbu nové třídy 
 */ 
JAK.ClassMaker._makeDefaultParams = function(params) {
	if ("EXTEND" in params) {
		if (!params.EXTEND) {
			throw new Error("Cannot extend non-existent class");
		}
		if (!("NAME" in params.EXTEND)) {
			throw new Error("Cannot extend non-JAK class");
		}
	}

	params.NAME = params.NAME || false;
	params.VERSION = params.VERSION || "1.0";
	params.EXTEND = params.EXTEND || false;
	params.IMPLEMENT = params.IMPLEMENT || [];
	params.DEPEND = params.DEPEND || [];
	params.FROZEN = false; /* zmrazeni se provadi pri prvni instancializaci. pote uz se do tridy/rozhrani nesmi nic pridavat. */

	/* implement muze byt tez jeden prvek */
	if (!("length" in params.IMPLEMENT)) { params.IMPLEMENT = [params.IMPLEMENT]; }

	this._preMakeTests(params);

	return params;
}

/**
 * Otestování parametrů pro tvorbu třídy
 * @param {object} params parametry pro tvorbu nové třídy 
 */ 
JAK.ClassMaker._preMakeTests = function(params) {
    if (!params.NAME) { throw new Error("No NAME passed to FoxcubService.JAK.ClassMaker.makeClass()"); }

	/* test zavislosti */
	var result = false;
	if (result = this._testDepend(params.DEPEND)) { throw new Error("Dependency error in class " + params.NAME + " ("+result+")"); }
}

/**
 * Vytvořenému konstruktoru nové třídy musíme do vínku dát výchozí hodnoty a metody
 */ 
JAK.ClassMaker._addConstructorProperties = function(constructor, params) {
	/* staticke vlastnosti */
	for (var p in params) { constructor[p] = params[p]; }

	/* zdedit */
	this._setInheritance(constructor);

	/* classMaker dava instancim do vinku tyto vlastnosti a metody */
	constructor.prototype.constructor = constructor;
	constructor.prototype.$super = this._$super;

	return constructor;	
}

/**
 * Statická metoda pro všechny singletony
 */
JAK.ClassMaker._getInstance = function() {
	if (!this._instance) { 
		if (!this.FROZEN) { FoxcubService.JAK.ClassMaker.freeze(this); }
		var tmp = function() {};
		tmp.prototype = this.prototype;
		this._instance = new tmp(); 
		if ("$constructor" in this.prototype) { this._instance.$constructor(); }
	}
	return this._instance;
}

/**
 * Volá vlastní kopírování prototypových vlastností jednotlivých rodičů
 * @param {array} extend pole rodicovskych trid
*/
JAK.ClassMaker._setInheritance = function(constructor) {
	if (constructor.EXTEND) { this._makeInheritance(constructor, constructor.EXTEND); }
	for (var i=0; i<constructor.IMPLEMENT.length; i++) {
		this._makeInheritance(constructor, constructor.IMPLEMENT[i], true);
	}
}

/**
 * Provádí vlastní kopírovaní prototypových vlastností z rodiče do potomka.
 * Pokud je prototypová vlastnost typu object zavolá metodu, která se pokusí
 * vytvořit hlubokou kopii teto vlastnosti
 * @param {object} constructor Potomek, jehož nové prototypové vlastnosti nastavujeme
 * @param {object} parent Rodič, z jehož vlastnosti 'protype' budeme kopírovat	  	 
 * @param {bool} noSuper Je-li true, jen kopírujeme vlasnosti (IMPLEMENT)
*/
JAK.ClassMaker._makeInheritance = function(constructor, parent, noSuper){
	if (!noSuper) { /* extend */
		var tmp = function(){}; 
		tmp.prototype = parent.prototype;
		constructor.prototype = new tmp();
		for (var p in parent.prototype) {
			if (typeof parent.prototype[p] != "object") { continue; }
			constructor.prototype[p] = JSON.parse(JSON.stringify(parent.prototype[p]));
		}
		return;
	}
	if(parent){
		for (var p in parent.prototype) { /* implement */
			if (typeof parent.prototype[p] == "object") {
				constructor.prototype[p] = JSON.parse(JSON.stringify(parent.prototype[p]));
			} else {
				constructor.prototype[p] = parent.prototype[p];
			}
		}
	}
}

/**
 * Testuje závislosti vytvářené třídy, pokud jsou nastavené
 * @param {array} depend Pole závislostí, ktere chceme otestovat
 * @returns {bool|string} false = ok, string = error  
 */
JAK.ClassMaker._testDepend = function(depend){
	for(var i = 0; i < depend.length; i++) {
		var item = depend[i];
		if (!item.sClass) { return "Unsatisfied dependency"; }
		if (!item.ver) { return "Version not specified in dependency"; }
		var depMajor = item.sClass.VERSION.split('.')[0];
		var claMajor = item.ver.split('.')[0];
		if (depMajor != claMajor) { return "Version conflict in "+item.sClass.NAME; }
	}
	return false;
}

/**
 * Volá stejně pojmenovanou metodu předka a předá jí veškeré parametry.
 */
JAK.ClassMaker._$super = function() {
	var stack = FoxcubService.JAK.ClassMaker.stack;

	var currentName = stack.names[stack.names.length-1];
	var currentMethod = stack.methods[stack.methods.length-1];
	var currentOwner = currentMethod.owner;

	if (!currentOwner) { throw new Error("Cannot find current method owner"); }
	var parent = currentOwner.EXTEND;

	if (!parent) { throw new Error("No super-class available"); }
	if (!parent.prototype[currentName]) { throw new Error("Super-class doesn't have method '"+currentName+"'"); }

	var func = parent.prototype[currentName];
	return func.apply(this, arguments);
}





/* obal - 2. cast */
FoxcubService.JAK.ClassMaker = JAK.ClassMaker;
})();
/* konec 2. casti */
