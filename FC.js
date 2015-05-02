//Naming convention:
//Class
//object._privateMember
//object.publicMember

//#region object model

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

function event(obj, name)
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

function delegate(func, context) { return new Delegate(func, context) };

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

//#endregion

var StringUtils = {
	toUpperFirst: function (s)
	{
		return s[0].toUpperCase() + s.slice(1)
	},
	toOtherKeyboard: function (s)
	{
		var n = 'qwertyuiop[]asdfghjkl;\'zxcvbnm,.йцукенгшщзхъфывапролджэячсмитьбю';
		var t = 'йцукенгшщзхъфывапролджэячсмитьбюqwertyuiop[]asdfghjkl;\'zxcvbnm,.';
		return s.split('').map(function (a) { return t[n.indexOf(a)] || a }).join('');
	},
	toTranslit: function translit(s)
	{
		var n = 'qwertyuiopasdfghjklzxcvbnmйцукенгшщзхъфывапролджэячсмитьбю';
		var t = ['к', 'в', 'е', 'р', 'т', 'и', 'у', 'и', 'о', 'п', 'а', 'с', 'д', 'ф', 'г', 'х', 'й', 'к', 'л', 'з', 'кс', 'с', 'в', 'б', 'н', 'м',
		'y', 'ts', 'u', 'k', 'e', 'n', 'g', 'sh', 'sch', 'z', 'h', '', 'f', 'y', 'v', 'a', 'p', 'r', 'o', 'l', 'd', 'zh', 'e', 'ya', 'ch', 's', 'm', 'i', 't', '', 'b', 'yu']
		return s.split('').map(function (a) { return t[n.indexOf(a)] || a }).join('');
	},
	wRegexp: /[^\wйцукенгшщзхъфывапролджэячсмитьбю]/g,
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

//#region Object

Object = cls(Object, function (options)
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

property(Object, 'id', { get: true, set: true });

//#endregion Object

//#region Control

Control = cls(Object, function (options)
{
	Control.base.constructor.apply(this, arguments);
	this._init();
	this.refresh();
});
var controlP = Control.prototype;

property(Control, 'domNode', { value: null, get: true });
property(Control, 'parentNode', { value: null, get: true, set: true });
property(Control, 'isVisible', { value: true, get: true, set: true });
property(Control, 'width', { value: 0, get: true, set: true });
property(Control, 'height', { value: 0, get: true, set: true });

controlP._attachToDomEvent = function (event, handler, node)
{
	var context = this;
	node = node || this._domNode;
	handler[this._id + 'listener'] = function (event)
	{
		handler.call(context, event);
	}

	if (node.addEventListener)
		node.addEventListener(event, handler[this._id + 'listener'], false);
	else
		node["on" + event] = handler[this._id + 'listener'];

};

controlP._detachFromDomEvent = function (event, handler, node)
{
	node = node || this._domNode;
	if (node.removeEventListener)
		node.removeEventListener(event, handler[this._id + 'listener'], false);
	else
		node["on" + event] = null;
	delete handler[this._id + 'listener'];
};

controlP._init = function ()
{
	this._domNode = document.createElement('div');
	this._domNode.className += 'Control';
};

controlP.refresh = function ()
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

controlP = null;

//#endregion Control

//#region Edit

Edit = cls(Control, function ()
{
	event(this, 'valueChanged');
	Edit.base.constructor.apply(this, arguments);
});

var editP = Edit.prototype;

property(Edit, 'isFocused', { get: true });
property(Edit, 'value', { value: '', get: true, set: true });
property(Edit, 'emptyValue', { value: '', get: true, set: true });

editP._init = function ()
{
	this._domNode = document.createElement('input');
	this._domNode.type = 'text';
	this._domNode.className += 'Edit';
	this._attachToDomEvent('focus', this._onFocus);
	this._attachToDomEvent('keyup', this._onKeyUp);
	this._attachToDomEvent('blur', this._onBlur);
};

editP._onFocus = function ()
{
	this._isFocused = true;
	this.refresh();
}

editP._onKeyUp = function (event)
{
	if (this._value !== this._domNode.value)
	{
		this._value = this._domNode.value;
		this.refresh();
		this.valueChanged.invoke(this, { OldValue: this._value, NewValue: this._value })
	}
}

editP._onBlur = function ()
{
	this._isFocused = false;
	this.refresh();
}

editP.refresh = function ()
{
	this._domNode.value = this._value || this._isFocused ? this._value : this._emptyValue;
	this._domNode.setAttribute('empty', !this._value);
	Edit.base.refresh.apply(this, arguments);
};

//#endregion Edit

//#region ListItem

ListItem = cls(Control, function ()
{
	event(this, 'clicked');
	ListItem.base.constructor.apply(this, arguments);
})

var listItemP = ListItem.prototype;

property(ListItem, 'icon', { value: null, get: true, set: true });
property(ListItem, 'value', { value: '', get: true, set: true });
property(ListItem, 'selected', { value: false, get: true, set: true });

listItemP._init = function ()
{
	this._domNode = document.createElement('div');
	this._domNode.appendChild(document.createElement('div')).className += 'Icon';
	this._domNode.appendChild(document.createElement('div')).className += 'Value';
	this._domNode.className += 'ListItem';
	this._attachToDomEvent('click', this._onClick);
}

listItemP._onClick = function (event)
{
	this.clicked.invoke(this, {});
};

listItemP.refresh = function ()
{
	this._domNode.firstChild.width = this._domNode.firstChild.height = this._icon ? this._height + 'px' : 0;
	this._domNode.firstChild.background = this._icon;
	this._domNode.firstChild.nextSibling.innerText = this._value;
	this._domNode.firstChild.nextSibling.style.height = this._domNode.firstChild.nextSibling.style.lineHeight = this._height + 'px';
	this._domNode.setAttribute('selected', this._selected);
	ListItem.base.refresh.apply(this, arguments);
}

listItemP = null;

//#endregion ListItem

//#region List

List = cls(Control, function ()
{
	event(this, 'selectionChanged');
	List.base.constructor.apply(this, arguments);
});

var listP = List.prototype;

property(List, 'items', {
	get: true, set: function (value)
	{
		if (value)
			for (var i = 0; i < value.length; i++)
			{
				if (!(value[i] instanceof ListItem))
					value[i] = new ListItem(value[i]);
				if (this._domNode)
					value[i].setParentNode(this._domNode);
				value[i].clicked.add(delegate(this._onListItemClicked, this));
			}
		this._items = value;
	}
});

property(List, 'emptyItem', {
	get: true, set: function (value)
	{
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

listP._init = function ()
{
	this._domNode = document.createElement('div');
	this._domNode.className += 'List';

	if (this._items)
		for (var i = 0; i < this._items.length; i++)
			this._items[i].setParentNode(this._domNode);
	if (this._emptyItem)
		this._emptyItem.setParentNode(this._domNode);
};

listP._onListItemClicked = function (sender, args)
{
	sender.setSelected(!sender.getSelected());
	this.selectionChanged.invoke(this, { Item: sender, Selected: sender.getSelected() });
	this.refresh();
}

listP.selectAll = function ()
{
	if (this._items)
		for (var i = 0; i < this._items.length; i++)
			this._items[i].setSelected(true);
};

listP.selectItem = function (id)
{
	if (this._items)
		for (var i = 0; i < this._items.length; i++)
			if (this._items[i].getId() === id)
				this._items[i].setSelected(true);
};

listP.deselectItem = function (id)
{
	if (this._items)
		for (var i = 0; i < this._items.length; i++)
			if (this._items[i].getId() === id)
				this._items[i].setSelected(false);
};

listP.deselectAll = function ()
{
	if (this._items)
		for (var i = 0; i < this._items.length; i++)
			this._items[i].setSelected(false);
};

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

listP.refresh = function ()
{
	var hasVisible = false;
	if (this._items)
		for (var i = 0; i < this._items.length; i++)
		{
			hasVisible = hasVisible || this._items[i].getIsVisible();
			this._items[i].setWidth(this._width - 2);//for borders
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

listP = null;

//#endregion List

//#region Combo

Combo = cls(Control, function ()
{
	event(this, 'selectionChanged');
	Combo.base.constructor.apply(this, arguments);
});

var comboP = Combo.prototype;

property(Combo, 'edit');
property(Combo, 'list');
property(Combo, 'url', {
	get: true, set: function (value)
	{
		this._url = value;
		if (this._list)
			this._loadData();
	}
});
property(Combo, 'data', { get: true });
property(Combo, 'emptyText', {
	get: true, set: function (value)
	{
		this._emptyText = value;
		if (this._edit)
			this._edit.setEmptyValue(value);
	}
});
property(Combo, 'emptyListText', {
	get: true, set: function (value)
	{
		this._emptyListText = value;
		if (this._list)
			this._list.getEmptyItem().setValue(value);
	}
});
property(Combo, 'showIcons', {
	value: true, get: true, set: function (value)
	{
		this._showIcons = value;
		if (this._list)
			this._loadData();
	}
});
property(Combo, 'multiselect', { value: false, get: true, set: true });

property(Combo, 'iconHeight', { value: 64 });


comboP._init = function ()
{
	this._domNode = document.createElement('div');
	this._domNode.className += 'Combo';
	this._attachToDomEvent('click', this._onClick);

	this._edit = new Edit({
		parentNode: this._domNode,
		emptyValue: this._emptyText,
		valueChanged: delegate(this._onEditvalueChanged, this)
	});
	this._list = new List({
		emptyItem: { value: this._emptyListText, height: this._showIcons ? this._iconHeight : this._height },
		selectionChanged: delegate(this._onListSelectionChanged, this),
	});
	this._list.getDomNode().style.position = 'absolute';
	this._list.getDomNode().style.zIndex = 1;
	this._loadData();
}

comboP._loadData = function ()
{
	var self = this;
	setTimeout(function ()
	{
		self._onDataLoaded(JSON.stringify([
		{ id: 0, name: 'Name0', surname: 'Surname0' },
		{ id: 1, name: 'Name1', surname: 'Surname1' },
		{ id: 2, name: 'Name2', surname: 'Surname2' },
		{ id: 3, name: 'Name3', surname: 'Surname3' },
		{ id: 4, name: 'Name4', surname: 'Surname4' }]))
	}, 1000)
}

comboP._onDataLoaded = function (response)
{
	this._data = JSON.parse(response);
	var items = [];
	for (var i = 0; i < this._data.length; i++)
		items.push({
			id: this._data[i].id,
			value: this._data[i].name + ' ' + this._data[i].surname,
			icon: this._showIcons ? this._data[i].icon : null,
			height: this._showIcons ? this._iconHeight : this._height
		});
	this._list.setItems(items);
	this._list.getEmptyItem().setHeight(this._showIcons ? this._iconHeight : this._height);
	this._list.refresh();
}

comboP._onDocumentClick = function (event)
{
	var node = event.target;
	while (node)
	{
		if (node === this._domNode || node === this._list.getDomNode())
			return;
		node = node.parentNode;
	}

	this._detachFromDomEvent('click', this._onDocumentClick, window);
	this._list.setParentNode(null);
	this._list.refresh();
	this._attachToDomEvent('click', this._onClick);
};

comboP._onClick = function ()
{
	this._detachFromDomEvent('click', this._onClick);
	this._list.setParentNode(document.body);
	this._list.refresh();
	this._list.getDomNode().style.left = this._domNode.offsetLeft + 'px';
	this._list.getDomNode().style.top = (this._domNode.offsetTop + this._domNode.offsetHeight) + 'px';
	this._attachToDomEvent('click', this._onDocumentClick, window);
};

comboP._filterList = function (ids)
{
	var items = this._list.getItems();
	for (var i = 0; i < items.length; i++)
		items[i].setIsVisible(!ids || ~ids.indexOf(items[i].getId()));
	this._list.refresh();
}

comboP._onEditvalueChanged = function (sender, args)
{
	var regexp = StringUtils.toInvariantRegexp(args.NewValue), ids = null;
	if (regexp)
	{
		ids = [];
		var items = this._list.getItems();
		for (var i = 0; i < items.length; i++)
			if (regexp.test(items[i].getValue()))
				ids.push(items[i].getId());
	}
	this._filterList(ids);
}

comboP._onListSelectionChanged = function (sender, args)
{
	if (!this._multiselect)
	{
		if (args.Selected)
		{
			sender.deselectAll();
			args.Item.setSelected(true);
		}
		else
			args.Item.setSelected(true);
		args.Selected = true;
	}
	for (var i = 0; i < this._data.length; i++)
		if (this._data[i].id === args.Item.getId())
		{
			this.selectionChanged.invoke({ Item: this._data[i], Selected: args.Selected });
			return;
		}
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

comboP = null;

//#endregion Combo