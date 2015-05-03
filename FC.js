//Naming conventions:
//Class
//object._privateMember
//object.publicMember
//object._property
//object.getProperty
//object.setProperty
//new Class({property:value[,...]})

//#region polyfill
if (!Array.prototype.map)
	Array.prototype.map = function (f)
	{
		var result = [];
		for (var i = 0; i < this.length; i++)
			result[i] = f(this[i]);
		return result;
	}

if (!Array.prototype.indexOf)
	Array.prototype.indexOf = function (v)
	{
		for (var i = 0; i < this.length; i++)
			if (this[i] === v)
				return i;
		return -1;
	}
//#endregion polyfill

//#region core

var StringUtils = {
	toUpperFirst: function (s)
	{
		return s[0].toUpperCase() + s.slice(1)
	},
	toOtherKeyboard: function (s)
	{
		var n = 'qwertyuiop[]asdfghjkl;\'zxcvbnm,.йцукенгшщзхъфывапролджэячсмитьбю';
		var t = 'йцукенгшщзхъфывапролджэячсмитьбюqwertyuiop[]asdfghjkl;\'zxcvbnm,.';
		return s.toLowerCase().split('').map(function (a) { return t[n.indexOf(a)] || a }).join('');
	},
	toTranslit: function translit(s)
	{
		var n = 'qwertyuiopasdfghjklzxcvbnmйцукенгшщзхъфывапролджэячсмитьбю';
		var t = ['к', 'в', 'е', 'р', 'т', 'и', 'у', 'и', 'о', 'п', 'а', 'с', 'д', 'ф', 'г', 'х', 'й', 'к', 'л', 'з', 'кс', 'с', 'в', 'б', 'н', 'м',
	 'y', 'ts', 'u', 'k', 'e', 'n', 'g', 'sh', 'sch', 'z', 'h', '\'', 'f', 'y', 'v', 'a', 'p', 'r', 'o', 'l', 'd', 'zh', 'e', 'ya', 'ch', 's', 'm', 'i', 't', '\'', 'b', 'yu']
		return s.toLowerCase().split('').map(function (a) { return t[n.indexOf(a)] || a }).join('');
	},
	wRegexp: /[^\wйцукенгшщзхъфывапролджэячсмитьбю ]/gi,
	toInvariantRegexp: function (s)
	{
		if (!s)
			return null;

		return new RegExp(
		 s.replace(this.wRegexp, '\\$1') + '|' +
		 this.toTranslit(s).replace(this.wRegexp, '\\$1') + '|' +
		 this.toOtherKeyboard(s).replace(this.wRegexp, '\\$1') + '|' +
		 this.toTranslit(this.toOtherKeyboard(s)).replace(this.wRegexp, '\\$1'),
		 'i');
	}
};

/// <summary> Class definition. </summary>
/// <param name="base" type="Function"> Base class. </param>
/// <param name="constructor" type="Function"> Constructor. </param>
/// <returns type="Function"> Class. </returns>
function cls(base, constructor)
{
	var f = new Function();
	f.prototype = base.prototype;
	constructor.prototype = new f();
	constructor.prototype.constructor = constructor;
	constructor.base = base.prototype;
	return constructor;
}

function Event()
{
	this._handlers = null;
};
var eventP = Event.prototype;
eventP.add = function (handler)
{
	this._handlers = this._handlers || [];
	this._handlers.push(handler);
};
eventP.remove = function (handler)
{
	if (this._handlers && ~this._handlers.indexOf(handler))
		this._handlers.splice(this._handlers.indexOf(handler), 1);
	if (!this._handlers.length)
		this._handlers = null;
};
eventP.clear = function (handler)
{
	this._handlers = null;
};
eventP.invoke = function (sender, args)
{
	if (this._handlers)
		for (var i = 0; i < this._handlers.length; i++)
			this._handlers[i].handle(sender, args);
};
eventP = null;

/// <summary> Event definition. Can attach delegates and call them when invoked. Must be defined in constructor and not in prototype. </summary>
/// <param name="object" type="Object"> Instance. </param>
/// <param name="name" type="String"> Event name. </param>
/// <returns type="Event"> Event. </returns>
function evt(obj, name)
{
	obj[name] = new Event()
};

function Delegate(func, context)
{
	this._func = func;
	this._context = context;
}
var delegateP = Delegate.prototype;
delegateP.handle = function (sender, args)
{
	this._func.call(this._context, sender, args);
};
delegateP = null;

/// <summary> Delegate. Used with events, calls function in specified context. </summary>
/// <param name="func" type="Function"> Function. </param>
/// <param name="context" type="Object"> Context. </param>
/// <returns type="Delegate"> Delegate. </returns>
function delegate(func, context) { return new Delegate(func, context) };

/// <summary> Property definition. Creates local private member with same name and getter/setter if necessary. </summary>
/// <param name="cls" type="Function"> Class. </param>
/// <param name="name" type="String"> Name. </param>
/// <param name="description" type="Object">
/// Optional description:
/// {
///	[value:<default_value>,]
///   [get:true|<getter function>]
///	[set:true|<setter function>}
/// }
/// true creates default getter/setter automatically.
/// </param>
function property(cls, name, description)
{
	var prototype = cls.prototype;
	description = description || {};
	prototype['_' + name] = description.value;
	if (description.get === true)
		prototype['get' + StringUtils.toUpperFirst(name)] = function () { return this['_' + name]; };
	else if (description.get)
		prototype['get' + StringUtils.toUpperFirst(name)] = description.get;
	if (description.set === true)
		prototype['set' + StringUtils.toUpperFirst(name)] = function (value) { this['_' + name] = value; };
	else if (description.set)
		prototype['set' + StringUtils.toUpperFirst(name)] = description.set;
}

/// <summary> DOM element creator. </summary>
/// <param name="tag" type="String"> Tag name. </param>
/// <param name="className" type="String"> Optional class name. </param>
/// <param name="parentNode" type="DOMElement"> Optional parent node. </param>
function element(tag, className, parentNode)
{
	var result = document.createElement(tag || 'div');
	if (className)
		result.className = className;
	if (parentNode)
		parentNode.appendChild(result);
	return result;
}

/// <summary> Asynchronous request. </summary>
/// <param name="url" type="String"> URL. </param>
/// <param name="delegate" type="Delegate"> Delegate to call on success. </param>
function ajax(url, delegate)
{
	var self = this;
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.onreadystatechange = function ()
	{
		if (xhr.readyState === 4 && xhr.status === 200)
			delegate.handle(null, { responseText: xhr.responseText });
	}
	xhr.send(null, true);
}

/// <summary> Timeout. </summary>
/// <param name="delegate" type="Delegate"> Delegate to call after timeout. </param>
/// <param name="delay" type="Number"> Delay in ms. </param>
/// <param name="args" type="Object"> Arguments to pass to delegate. </param>
/// <param name="oldId" type="Object"> Optional timeout id to clear. </param>
/// <returns type="Object"> Timeout id. </returns>
function timeout(delegate, delay, args, oldId)
{
	if (oldId)
		clearTimeout(oldId);
	return setTimeout(function () { delegate.handle(null, args) }, delay);
}

/// <summary> Enumeration definition. </summary>
/// <param name="members" type="String[]"> Members. </param>
function enm(members)
{
	var result = {};
	for (var i = 0; i < members.length; i++)
		result[members[i]] = members[i];
	return result;
}

//#endregion

(function ()
{
	//#region Object

	/// <summary> Basic object. </summary>
	var MObject = cls(Object, function (options)
	{
		this._id = ('Object' + (Object.id = (Object.id || 0) + 1));
		if (options)
			for (var i in options)
			{
				var ui = StringUtils.toUpperFirst(i);
				if (this['set' + ui])
					this['set' + ui](options[i]);
				else if ((this[i] instanceof Event) && options[i] instanceof Delegate)
					this[i].add(options[i])
				else throw Error('Unknown member ' + i);
			}
	});

	/// <property name="id" type="String"> Object's id. </property>
	property(MObject, 'id', { get: true, set: true });

	//#endregion Object

	//#region Control

	/// <summary> Abstract control class. </summary>
	var Control = cls(MObject, function (options)
	{
		Control.base.constructor.apply(this, arguments);
		this._init();
		this.refresh();
	});
	var controlP = Control.prototype;
	/// <property name="domNode" type="DOMElement"> Main DOM node. </property>
	property(Control, 'domNode', { value: null, get: true });
	/// <property name="parentNode" type="DOMElement"> Parent node. </property>
	property(Control, 'parentNode', { value: null, get: true, set: true });
	/// <property name="isVisible" type="Boolean"> Visibility. </property>
	property(Control, 'isVisible', { value: true, get: true, set: true });
	/// <property name="width" type="Number"> Width in pixels. </property>
	property(Control, 'width', { value: 0, get: true, set: true });
	/// <property name="height" type="Number"> Height in pixels. </property>
	property(Control, 'height', { value: 0, get: true, set: true });
	/// <property name="isInit" type="Boolean"> All content is ready. </property>
	property(Control, 'isInit', { value: false });

	/// <summary> Attach handler to DOM event. </summary>
	/// <param name="event" type="String"> Event name. </param>
	/// <param name="handle" type="Function"> Handler. Runs in current component context. </param>
	/// <param name="node" type="DOMElement"> Element to attach. If not specified main DOM node is used. </param>
	controlP._attachToDomEvent = function (event, handler, node)
	{
		if (node = node || this._domNode)
		{
			var context = this, listenerId = this._id + 'listener';
			var listener = handler[listenerId] = function (event)
			{
				event = event || window.event;
				handler.call(context, event);
			}
			if (node.addEventListener)
				node.addEventListener(event, listener, false);
			else
				node["on" + event] = listener;
		}
	};

	/// <summary> Detach handler from DOM event. </summary>
	/// <param name="event" type="String"> Event name. </param>
	/// <param name="handle" type="Function"> Handler. </param>
	/// <param name="node" type="DOMElement"> Element to detach. If not specified main DOM node is used. </param>
	controlP._detachFromDomEvent = function (event, handler, node)
	{
		if (node = node || this._domNode)
		{
			var listenerId = this._id + 'listener'
			if (node.removeEventListener)
				node.removeEventListener(event, handler[listenerId], false);
			else
				node["on" + event] = null;
			delete handler[listenerId];
		}
	};

	/// <summary> Disable selection on main DOM node. </summary>
	controlP._disableSelect = function ()
	{
		if (this._domNode)
		{
			this._domNode.className += ' NoSelect';
			this._attachToDomEvent('selectstart', function () { return false });
		}
	}

	/// <summary> Initizlization: creating DOM, inner components etc. </summary>
	controlP._init = function ()
	{
		if (this._domNode)
			this._domNode.className += ' Control';
		this._isInit = true;
	};

	/// <summary> Applying properties to DOM. Must be called after any property change. </summary>
	controlP.refresh = function ()
	{
		if (this._domNode)
		{
			if (this._parentNode !== this._domNode.parentNode)
			{
				if (this._domNode.parentNode)
					this._domNode.parentNode.removeChild(this._domNode);
				if (this._parentNode)
					this._parentNode.appendChild(this._domNode);
			}
			this._domNode.style.display = this._isVisible ? '' : 'none';
			this._domNode.style.width = this._width + 'px';
			this._domNode.style.height = this._height + 'px';
		}
	}

	/// <summary> Destroy control: remove DOM, handlers etc. </summary>
	controlP.destroy = function ()
	{
		if (this._domNode && this._domNode.parentNode)
			this._domNode.parentNode.removeChild(this._domNode);
	};

	controlP = null;

	//#endregion Control

	//#region Edit

	/// <summary> Text edit control. </summary>
	/// <event name="textChanged"> Event after user input. args = { text:<new_text> }. </event>
	var Edit = cls(Control, function ()
	{
		evt(this, 'textChanged');
		Edit.base.constructor.apply(this, arguments);
	});
	var editP = Edit.prototype;

	/// <property name="text" type="String"> Text. </property>
	property(Edit, 'text', { value: '', get: true, set: true });
	/// <property name="emptyText" type="String"> Text to show when edit is empty and not focused. </property>
	property(Edit, 'emptyText', { value: '', get: true, set: true });
	/// <property name="isFocused" type="Boolean"> Is control focused. </property>
	property(Edit, 'isFocused', { get: true });

	editP._init = function ()
	{
		this._domNode = element('input', 'Edit');
		this._domNode.type = 'text';
		this._attachToDomEvent('focus', this._onFocus);
		this._attachToDomEvent('keyup', this._onKeyUp);
		this._attachToDomEvent('blur', this._onBlur);
		Edit.base._init.apply(this, arguments);
	};

	editP._onFocus = function ()
	{
		this._isFocused = true;
		this.refresh();
	}

	editP._onKeyUp = function (event)
	{
		if (this._text !== this._domNode.value || event.keyCode === 13)
		{
			this._text = this._domNode.value;
			this.textChanged.invoke(this, { text: this._text })
			this.refresh();
		}
	}

	editP._onBlur = function ()
	{
		this._isFocused = false;
		this.refresh();
	}

	editP.refresh = function ()
	{
		this._domNode.value = this._text || this._isFocused ? this._text : this._emptyText;
		this._domNode.setAttribute('empty', !this._text);
		Edit.base.refresh.apply(this, arguments);
	};

	//#endregion Edit

	//#region ListItem

	/// <summary> List item control. </summary>
	/// <event name="mouseDown"> Event on mouse down. args = {}. </event>
	var ListItem = cls(Control, function ()
	{
		evt(this, 'mouseDown');
		ListItem.base.constructor.apply(this, arguments);
	})

	var listItemP = ListItem.prototype;

	/// <property name="icon" type="String"> Icon URL. </property>
	property(ListItem, 'icon', { value: null, get: true, set: true });
	/// <property name="text" type="String"> Text. </property>
	property(ListItem, 'text', { value: '', get: true, set: true });
	/// <property name="selected" type="Boolean"> Is item selected. </property>
	property(ListItem, 'selected', { value: false, get: true, set: true });

	property(ListItem, 'imgNode', { value: null });
	property(ListItem, 'textNode', { value: null });

	listItemP._init = function ()
	{
		this._domNode = element('div', 'ListItem');
		this._imgNode = element('img', 'Icon', this._domNode);
		this._textNode = element('div', 'Text', this._domNode);
		this._disableSelect();
		this._attachToDomEvent('mousedown', this._onMouseDown);
		ListItem.base._init.apply(this, arguments);
	}

	listItemP._onMouseDown = function (event)
	{
		this.mouseDown.invoke(this, {});
	};

	listItemP.refresh = function ()
	{
		var is = this._imgNode.style
		is.width = is.height = (this._height - 16) + 'px';
		is.padding = '8px';
		is.paddingBottom = '0px';
		this._imgNode.src = this._icon || '';
		is.display = this._icon ? '' : 'none';
		this._textNode.innerText = this._text;
		this._textNode.style.height = this._textNode.style.lineHeight = this._height + 'px';
		this._textNode.style.paddingLeft = this._icon ? '0px' : '8px';
		this._domNode.setAttribute('selected', this._selected);
		ListItem.base.refresh.apply(this, arguments);
	}

	listItemP = null;

	//#endregion ListItem

	//#region List

	/// <summary> List control. </summary>
	/// <event name="selectionChanged"> Event on selection change by user. args = { item: <item>, selected: <new_item_selected_value> }. </event>
	var List = cls(Control, function ()
	{
		evt(this, 'selectionChanged');
		List.base.constructor.apply(this, arguments);
	});

	var listP = List.prototype;

	/// <property name="items" type="ListItem[]"> Items. </property>
	property(List, 'items', {
		get: true, set: function (value)
		{
			if (this._items)
				for (var i = 0; i < this._items.length; i++)
					this._items[i].destroy();
			if (value)
				for (var i = 0; i < value.length; i++)
				{
					if (!(value[i] instanceof ListItem))
						value[i] = new ListItem(value[i]);
					if (this._domNode)
						value[i].setParentNode(this._domNode);
					value[i].mouseDown.add(delegate(this._onListItemClicked, this));
				}
			this._items = value;
		}
	});

	/// <property name="emptyItem" type="ListItem"> Item to show when no other items visible. </property>
	property(List, 'emptyItem', {
		get: true, set: function (value)
		{
			if (this._emptyItem)
				this._emptyItem.destroy();
			if (value)
			{
				if (!(value instanceof ListItem))
					value = new ListItem(value);
				if (this._domNode)
					value.setParentNode(this._domNode);
			}
			this._emptyItem = value;
		}
	});

	/// <property name="selectedItems" type="ListItem[]"> Items with selected=true. </property>
	property(List, 'selectedItems', {
		get: function ()
		{
			var result = [];
			if (this._items)
				for (var i = 0; i < this._items.length; i++)
					if (this._items[i].getSelected())
						result.push(this._items[i]);
			return result;
		}
	});

	listP._init = function ()
	{
		this._domNode = element('div', 'List');

		if (this._items)
			for (var i = 0; i < this._items.length; i++)
				this._items[i].setParentNode(this._domNode);
		if (this._emptyItem)
			this._emptyItem.setParentNode(this._domNode);

		List.base._init.apply(this, arguments);
	};

	listP._onListItemClicked = function (sender, args)
	{
		sender.setSelected(!sender.getSelected());
		this.selectionChanged.invoke(this, { item: sender, selected: sender.getSelected() });
		this.refresh();
	}

	/// <summary> Select all items. </summary>
	listP.selectAll = function ()
	{
		if (this._items)
			for (var i = 0; i < this._items.length; i++)
				this._items[i].setSelected(true);
	};

	/// <summary> Select item by id. </summary>
	/// <param name="id" type="String"> Item id. </param>
	listP.selectItem = function (id)
	{
		if (this._items)
			for (var i = 0; i < this._items.length; i++)
				if (this._items[i].getId() === id)
					this._items[i].setSelected(true);
	};

	/// <summary> Deselect item by id. </summary>
	/// <param name="id" type="String"> Item id. </param>
	listP.deselectItem = function (id)
	{
		if (this._items)
			for (var i = 0; i < this._items.length; i++)
				if (this._items[i].getId() === id)
					this._items[i].setSelected(false);
	};

	/// <summary> Deselect all items. </summary>
	listP.deselectAll = function ()
	{
		if (this._items)
			for (var i = 0; i < this._items.length; i++)
				this._items[i].setSelected(false);
	};

	listP.refresh = function ()
	{
		var hasVisible = false;
		if (this._items)
			for (var i = 0; i < this._items.length; i++)
			{
				hasVisible = hasVisible || this._items[i].getIsVisible();
				this._items[i].setWidth(this._width);
				this._items[i].refresh();
			}
		if (this._emptyItem)
		{
			this._emptyItem.setWidth(this._width);
			this._emptyItem.setIsVisible(!hasVisible);
			this._emptyItem.refresh();
		}
		List.base.refresh.apply(this, arguments);
		this._domNode.style.height = '';
	};

	listP.destroy = function ()
	{
		this.setItems(null);
		this.setEmptyItem(null);
		List.base.destroy.apply(this, arguments);
	}

	listP = null;

	//#endregion List

	//#region Combo
	/// <summary> Dropdown combo control. </summary>
	/// <event name="selectionChanged"> Event on selection change by user. args = { [id: <item_id>, selected: <new_selected_value>][, reset:<other_items_selection_set_to_false>] }. </event>
	var Combo = cls(Control, function ()
	{
		evt(this, 'selectionChanged');
		Combo.base.constructor.apply(this, arguments);
	});
	/// <summary> Search type enum.
	/// local - local search by full name
	/// server - server search by every field separately
	/// both - local and server search
	/// </summary>
	Combo.searchType = enm(['local', 'server', 'both']);

	var comboP = Combo.prototype;

	/// <property name="url" type="String"> URL to data/search server. </property>
	property(Combo, 'url', {
		value: '', get: true,
		set: function (value)
		{
			this._url = value;
			if (this._isInit)
				this._loadData();
		}
	});
	/// <property name="emptyText" type="String"> Text to show when edit is empty and not focused. </property>
	property(Combo, 'emptyText', {
		get: true,
		set: function (value)
		{
			this._emptyText = value;
			if (this._isInit)
				this._edit.setEmptyText(value);
		}
	});
	/// <property name="emptyListText" type="String"> Text to show in list when no items found. </property>
	property(Combo, 'emptyListText', {
		get: true,
		set: function (value)
		{
			this._emptyListText = value;
			if (this._isInit)
				this._list.getEmptyItem().setText(value);
		}
	});
	/// <summary> Show photos. </summary>
	/// <property name="showPhotos" type="Boolean"> Show photos. </property>
	property(Combo, 'showPhotos', {
		value: true, get: true,
		set: function (value)
		{
			this._showPhotos = value;
			if (this._isInit)
				this._loadData();
		}
	});
	/// <property name="multiselect" type="Boolean"> Enable multiselect. </property>
	property(Combo, 'multiselect', {
		value: false, get: true,
		set: function (value)
		{
			this._multiselect = value;
			if (this._isInit && !value)
			{
				this._list.deselectAll();
				this.selectionChanged.invoke(this, { reset: true });
			}
		}
	});
	/// <summary> Search type. </summary>
	/// <property name="search" type="Combo.searchType"> Search type. </property>
	property(Combo, 'search', { value: Combo.searchType.local, get: true, set: true });

	/// <property name="localSearchTimeout" type="Number"> Time between last user input and local search start in ms. </property>
	property(Combo, 'localSearchTimeout', { value: 100, get: true, set: true });
	/// <property name="serverSearchTimeout" type="Number"> Time between last user input and server search start in ms. </property>
	property(Combo, 'serverSearchTimeout', { value: 1000, get: true, set: true });

	property(Combo, 'edit');
	property(Combo, 'list');
	property(Combo, 'itemWithPictureHeight', { value: 50 });
	property(Combo, 'localSearchTimeoutId');
	property(Combo, 'serverSearchTimeoutId');
	property(Combo, 'filteredIds');

	comboP._init = function ()
	{
		this._domNode = element('div', 'Combo');

		this._attachToDomEvent('mousedown', this._onMouseDown);

		this._edit = new Edit({
			parentNode: this._domNode,
			emptyText: this._emptyText,
			textChanged: delegate(this._onEditTextChanged, this)
		});
		this._list = new List({
			emptyItem: { text: this._emptyListText, height: this._showPhotos ? this._itemWithPictureHeight : this._height },
			selectionChanged: delegate(this._onListSelectionChanged, this),
		});
		this._list.getDomNode().style.position = 'absolute';
		this._list.getDomNode().style.zIndex = 1;
		this._loadData();
		Combo.base._init.apply(this, arguments);
	}

	/// <summary> Load list data from server. </summary>
	comboP._loadData = function ()
	{
		ajax(this._url + '/getUsers?first_name&last_name' + (this._showPhotos ? '&photo_50' : ''), delegate(this._onDataLoaded, this));
	};

	comboP._onDataLoaded = function (sender, args)
	{
		var data = JSON.parse(args.responseText);
		var items = [];
		for (var i = 0; i < data.length; i++)
			items.push({
				id: data[i].id,
				text: data[i].first_name + ' ' + data[i].last_name,
				icon: this._showPhotos ? data[i].photo_50 : null,
				height: this._showPhotos ? this._itemWithPictureHeight : this._height
			});
		this._list.setItems(items);
		this._list.getEmptyItem().setHeight(this._showPhotos ? this._itemWithPictureHeight : this._height);
		this._list.refresh();

		if (this._edit.getText())
			this._onEditTextChanged(this._edit, { text: this._edit.getText() });
	}

	comboP._onDocumentMouseDown = function (event)
	{
		var node = event.target || event.srcElement;
		while (node)
		{
			if (node === this._domNode || node === this._list.getDomNode())
				return;
			node = node.parentNode;
		}

		this._detachFromDomEvent('mousedown', this._onDocumentMouseDown, document);
		this._list.setParentNode(null);
		this._list.refresh();
		this._attachToDomEvent('mousedown', this._onMouseDown);
	};

	comboP._onMouseDown = function ()
	{
		this._detachFromDomEvent('mousedown', this._onMouseDown);
		this._list.setParentNode(document.body);
		this._list.refresh();
		var ls = this._list.getDomNode().style;
		ls.left = this._domNode.offsetLeft + 'px';
		ls.top = (this._domNode.offsetTop + this._domNode.offsetHeight) + 'px';
		this._attachToDomEvent('mousedown', this._onDocumentMouseDown, document);
	};

	/// <summary> Filter list items by ids. </summary>
	/// <param name="ids" type="String[]"> Ids to show. If null all items are shown. </param>
	comboP._filterList = function (ids)
	{
		var items = this._list.getItems();
		for (var i = 0; i < items.length; i++)
			items[i].setIsVisible(!ids || ~ids.indexOf(items[i].getId()));
		this._list.refresh();
		this._filteredIds = ids;
	}

	comboP._onEditTextChanged = function (sender, args)
	{
		this._filteredIds = null;
		if (args.text)
		{
			if (this._search === Combo.searchType.local || this._search === Combo.searchType.both)
				this._localSearchTimeoutId = timeout(delegate(this._onLocalSearchTimeout, this), this._localSearchTimeout, args, this._localSearchTimeoutId);
			if (this._search === Combo.searchType.server || this._search === Combo.searchType.both)
				this._serverSearchTimeoutId = timeout(delegate(this._onServerSearchTimeout, this), this._serverSearchTimeout, args, this._serverSearchTimeoutId);
		}
		else
			this._filterList(null);
	}

	comboP._onLocalSearchTimeout = function (sender, args)
	{
		this._localSearchTimeoutId = null;
		var regexp = StringUtils.toInvariantRegexp(args.text), ids = null;
		if (regexp)
		{
			ids = this._filteredIds || [];
			var items = this._list.getItems();
			for (var i = 0; i < items.length; i++)
				if (regexp.test(items[i].getText()))
					ids.push(items[i].getId());
		}
		this._filterList(ids);
	}

	comboP._onServerSearchTimeout = function (sender, args)
	{
		this._serverSearchTimeoutId = null;
		ajax(this._url + '/getUsers?filter=' + escape(args.text), delegate(this._onServerSearchLoaded, this));
	}

	comboP._onServerSearchLoaded = function (sender, args)
	{
		var data = JSON.parse(args.responseText), ids = this._filteredIds || [];
		for (var i = 0; i < data.length; i++)
			if (!~ids.indexOf(data[i].id))
				ids.push(data[i].id);
		this._filterList(ids);
	};

	comboP._onListSelectionChanged = function (sender, args)
	{
		if (!this._multiselect)
		{
			if (args.selected)
			{
				sender.deselectAll();
				args.item.setSelected(true);
			}
			else
				args.item.setSelected(true);
			args.selected = true;
		}
		this.selectionChanged.invoke({ id: args.item.getId(), selected: args.selected, reset: !this._multiselect });
	}

	comboP.refresh = function ()
	{
		this._edit.setWidth(this._width);
		this._edit.setHeight(this._height);
		this._edit.refresh();
		this._list.setWidth(this._width);
		this._list.refresh();
		Combo.base.refresh.apply(this, arguments);
	};

	comboP.destroy = function ()
	{
		if (this._edit)
			this._edit.destroy();
		if (this._list)
			this._list.destroy();
		Combo.base.destroy.apply(this, arguments);
	}

	comboP = null;

	//#endregion Combo

	window.Combo = Combo;
})()