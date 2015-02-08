/*test = 
{
  sels: [[[{t:'.', n:'class'}]]], // ',' ' ' ''
  body:
  [
    {name: 'color', value: '#000'}
    {sels: 
  
  ]
  
}*/

var doc = document;

function create(p, tag, cl, text)
{
  var e = doc.createElement(tag);
  if(cl) e.className = cl;
  if(text) e.textContent = text;
  if(p) p.appendChild(e);
  return e;
}

function Selector(parent, value)
{
  this.p = parent;
  this.val = value;
}

Selector.prototype =
{
  render: function() 
  {
    var r = doc.createElement('span');
    r.innerHTML = this.val;
    r.classList.add('selector');
    r['data-obj'] = this;
    return r;
  },
  copy: function(parent)
  {
    return new Selector(parent, this.val);
  },
  getText: function()
  {
    return this.val;
  },
  cmp: function(o)
  {
    return this.val === o.val;
  }
}

function Item(parent)
{
  this.p = parent;
  this.sel = [];
  this.body = new Body(this);
}

Item.prototype =
{
  pushSelector: function(sel)
  {
    this.sel.push(new Selector(this, sel));
  },
  textSelectors: function()
  {
    var r = []
    for(var x in this.sel) r.push(this.sel[x].getText());
    return r.join(', ');
  },
  cut: function(obj)
  {
    if(obj instanceof Selector)
    {
      var i = this.sel.indexOf(obj);
      this.sel.splice(i, 1);
      if(!this.sel.length)
        this.p.remove(this);
      var res = new Item();
      res.body = this.body.copy(res);
      res.sel.push(obj);
      obj.p = res;
      return res;
    }    
  },
  pushItem: function(item)
  {
    this.body.push(item);
    
  },
  render: function()
  {
    var e = doc.createElement('div');
    if(this.sel)
    {
      var s = doc.createElement('div');
      s.classList.add('selectors');
      for(var x in this.sel)
      {
        if(x > 0) s.appendChild(doc.createTextNode(', '));
        s.appendChild(this.sel[x].render());
      }
      e.appendChild(s);
    }
    if(this.body)
      e.appendChild(this.body.render());
    return e;
  },
  copy: function(parent)
  {
    var res = new Item(parent);
    for(var x in this.sel)
    {
      res.sel.push(this.sel[x].copy(res));
    }
    res.body = this.body.copy(res);
    return res;
  },
  cmp: function(o)
  {
    if(!this.body.cmp(o.body)) return false;
    if(this.sel.length !== o.sel.length) return false;
    for(var x in this.sel)
      if(!this.sel[x].cmp(o.sel[x])) return false;
    return true;
  }
};

function Body(parent)
{
  this.p = parent;
  this.items = [];
}

Body.prototype =
{
  push: function(item)
  {
    this.items.push(item);
  },
  insertBefore: function(obj, before)
  {
    var i = this.items.indexOf(before);
    this.items.splice(i, 0, obj);
    obj.p = this;
  },
  remove: function(obj)
  {
    var i = this.items.indexOf(obj);
    this.items.splice(i, 1);
  },
  cut: function(obj)
  {
    var i = this.items.indexOf(obj);
    this.items.splice(i, 1);
    return obj;
  },
  render: function(dst)
  {
    var body = dst || doc.createElement('div');
    body['data-obj'] = this;
    
    //create(body, 'div', );
    body.appendChild(doc.createTextNode('{'))
    //create(body, 'div', '', '{');
    body.classList.add('body');
    for(var x in this.items)
      body.appendChild(this.items[x].render());
    body.appendChild(doc.createTextNode('}'))
    
    return body;
  },
  copy: function(parent)
  {
    var res = new Body(parent);
    for(var x in this.items)
    {
      res.push(this.items[x].copy(res));
    }
    return res;
  },
  cmp: function(o)
  {
    if(this.items.length !== o.items.length) return false;
    for(var x in this.items)
      if(!this.items[x].cmp(o.items[x])) return false;
    return true;
  }
}

function Style(parent, name, value)
{
  this.p = parent;
  this.name = name;
  this.val = value;
}

Style.prototype =
{
  render: function()
  {
    var e = doc.createElement('div');
    var t = '<span class="style"><span class="name">' + this.name + '</span>: ';
    t += '<span class="value">' + this.val + '</span>;</span>';
    e['data-obj'] = this;
    e.innerHTML = t;
    return e;
  },
  copy: function(parent)
  {
    return new Style(parent, this.name, this.val);
  },
  cmp: function(o)
  {
    return this.name === o.name && this.val === o.val;
  }
}

function getPath(obj)
{
  var res = [];
  for(var x = obj; x; x = x.p)
  {
    if(x instanceof Item) res.unshift(x.textSelectors());//= x.val.split(' ').concat(res);
  }
  return res;
}

function parseLess(less)
{
  'use strict';
  
  function isLetter(c)
  {
    if(c === '-' || c === '_') return true;
    if(c >= '0' && c <= '9') return true;
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
  }
  //var item = {sel: [], body: []};
  var item = new Item();
  var body = new Body();
  var result = body; // Полный результат
  var stack = [];
  var state = null;
  var oldx = 0;
  var comm = null;
  function val(x)
  {
    var res = less.substr(oldx, x - oldx).trim();
    oldx = x + 1;
    return res;
  }
  for(var x = 0, len = less.length; x < len; x++)
  {
    var c = less[x];
    if(c === comm) 
    {
      if(comm === '*' && less[x + 1] !== '/') continue;
      comm = null; oldx = x + 1; continue;
    }
    
    if(comm) continue;
    
    switch(c)
    {
      case '/':
        c = less[++x];
        if(c === '/') comm = '\n';
        else if (c === '*') comm = '*';
        break;
      case ',':
        //item.sel.push(val(x));
        item.pushSelector(val(x));
        break;
      case '{':
        //item.sel.push(val(x));
        item.pushSelector(val(x));
        body.push(item);
        
        stack.push(body);
        body = item.body;
        item = new Item(body);//{sel: [], body: []};
        break;
      case '}':
        body = stack.pop();
        item = new Item(body);        
        oldx = x + 1;
        break;
      case ';':
        var v = val(x).split(':');
        
        body.push(new Style(body, v[0].trim(), v[1].trim()));
    } 
  }
  return result;
}


function move(obj, to)
{
  var addr = getPath(obj.p);
  var parent = obj.p;
  var item = parent.cut(obj); // Выкусили Item
  if(obj instanceof Selector) 
  {
    parent = parent.p;
  }
  var toa = getPath(to);
  for(var x = 0, l = addr.length; x < l; x++)
    if(addr[x] !== toa[x]) break;
  var pt = parent;
  while(l - 1 > x)
  {
    do { pt = pt.p;} while(!(pt instanceof Item));
    l--;
  }
  pt.insertBefore(item, to);  
}

function init(gui, less)
{
  mo = null;
  gui.onmousedown = function(evt)
  {
    var t = evt.target;
    while(!t['data-obj'])
    {
      t = t.parentElement;
      if(!t) return;
    }
    mo = t['data-obj'];
  }
  gui.onmouseup = function(evt)
  {
    if(tgt) tgt.classList.remove('insert');
    var t = evt.target;
    while(!t['data-obj'])
    {
      t = t.parentElement;
      if(!t) 
      {
        mo = null;
        return;
      }
    }
    move(mo, t['data-obj']);
    gui.innerHTML = '';
    less.render(gui);
    mo = null;
  }
  tgt = null;
  gui.onmousemove = function(evt)
  {
    if(!mo) return;
    evt.preventDefault();
    var t = evt.target;
    while(!t.classList.contains('prop'))
    {
      t = t.parentElement;
      if(!t) return;
    }
    if(tgt) tgt.classList.remove('insert');
    if(t) t.classList.add('insert');
    tgt = t;
  }
}