var kinInt;
var ecbInt;

function displayStuff() {
  

    var kin = "" +
        "___  ________  ___\n" +
        "| | / /_  _| \ | |\n" +
        "| ' /  | | |  \| |\n" +
        "|  <   | | | . ` |\n" +
        "| . \ _| |_| |\  |\n" +
        "|_|\_\_____|_| \_|\n";
    console.log(kin);
}
function setTitle() {
    var curr = options.currency.get();
    var price = KinPrice.getPrice(curr);
    chrome.browserAction.setTitle({
        'title': '1 Kin = ' + price + " " + curr
    });
};
function setBadgeColor(color) {
    var HexaColor = "#0588c7";
    switch (color) {
        case "blue":
            HexaColor = "#0588c7";
            break;
        case "red":
            HexaColor = "#cc3c3c";
            break;
        case "green":
            HexaColor = "#05c712";
            break;
        case "black":
            HexaColor = "#000000";
            break;
    }
    chrome.browserAction.setBadgeBackgroundColor({
        color: HexaColor
    });
}
function setBadge(multiplicator) {
    var curName = options.currency.get();
    var p = options.precision.get();
    var d = options.divider.get();
    
    var price = KinPrice.getPrice(curName);
    price = price / d;
    price = price.toFixed(p);
    var text = price;
    if(multiplicator!==undefined){
        text = (text*multiplicator).toFixed(p);
    }
    chrome.browserAction.setBadgeText({
        'text': text
    });
}
function prepareBadge() {
    
    setBadgeColor('blue')
    chrome.browserAction.setBadgeText({
        'text': '...'
    });
}
function refreshBadgeAndTitle() {
    KinPrice
        .fetch
        .kinPrice()
        .then(function () {
            var curr = options.currency.get();
            var price = KinPrice.getPrice(curr);
            setPriceInHistory(price);
            setTitle();
            if(shouldMonitorWealth()===true){
                var wealth = KinPrice.getWealth()
                setBadge(wealth);
            }else{
                setBadge();
            }
        })
}
function shouldMonitorWealth(){
    if(store.get('monitorWealth')!==undefined && store.get('monitorWealth')!==null){
        return JSON.parse(store.get('monitorWealth'));
    }
    return false;
}
function setPriceInHistory(newPrice) {
    var history = store.get('history') || "[]";
    history = JSON.parse(history);
    if (newPrice == undefined) {
        return;
    };
    if(!history){
        return;
    }
    history.push(newPrice);
    if (history.length > 15) {
        history = history.slice(history.length - 15, history.length);
    }
    store.set('history', JSON.stringify(history));
    setBadgeColor('blue');
    
    if (store.get('lastMax') === null) {
        store.set('lastMax', newPrice.toFixed(5));
    } else {
        if ((options.notificationMax.get() === true) && newPrice > options.lastMax.get()) {
            notify('New maximum Kin price', 'The highest price is now ' + newPrice);
        }
        if (newPrice > options.lastMax.get()) {
            setBadgeColor('green');
            store.set('lastMax', newPrice.toFixed(5));
            
        }
    }
    if (store.get('lastMin') === null) {
        store.set('lastMin', newPrice.toFixed(5));
    } else {
        if ((options.notificationMin.get() === true) && newPrice < options.lastMin.get()) {
            notify('New minimum Kin price', 'The lowest price is now ' + newPrice);
        }
        if (newPrice < options.lastMin.get()) {
            setBadgeColor('red');
            store.set('lastMin', newPrice.toFixed(5));
        }
    }
    
    // if (store.get('lastMax') && store.get('notification-max') && value > last_max) {
    // if (store.get('notification-max') && value > last_max) {
    //     store.set('last-max', value);
    //     notify('New maximum BTC price', 'The highest price is now ' + value);
    //     $('#last_max').val(value);
    // }
    // if (store.get('notification-min') && value < last_min) {
    //     store.set('last-min', value);
    //     notify('New minimum BTC price', 'The lowest price is now ' + value);
    //     $('#last_min').val(value);
    // }
}
function launchInterval() {
    var period = options.refresh.get();
    period = period * 1000;
    kinInt = setInterval(function () {
        refreshBadgeAndTitle();
    }, period);
    ecbInt = setInterval(function(){
        KinPrice
            .fetch
            .currencyList()
    },4*60*60*1000);//We refresh ECB rates every 6 hours
    
}
var AJAX = {
    get: function (url) {
        return new Promise(function (resolve, reject) {
            const req = new XMLHttpRequest();
            req.open('GET', url);
            req.onload = function () {
                req.status === 200 ? resolve(req.response) : reject(Error(req.statusText))
            };
            req.onerror = function (e) {
                reject(Error("Network Error: "+e+""))
            }
            
            req.send();
        });
    }
}
var KinPrice = {
    //in USD
    currencyExchangesRates: {},
    currentBitcoinRate: {},
    currentKinRate: {},
    priceHistory: [
        {datetime: 1002, price: 0.15},
        {datetime: 1000, price: 0.10},
        {datetime: 1002, price: 0.11},
        {datetime: 1003, price: 0.12}
    ],
    getWealth:function(){
        var value = JSON.parse(store.get('wealth')) || 1;
        return value;
    },
    getPrice: function (currency) {
        var value = JSON.parse(store.get('currentKinRate'))[currency];
        return value;
    },
    getRefreshInterval: function () {
        return 30 * 1000;
    },
    getPriceHistory: function () {
        return this.priceHistory;
    },
    fetch: {
        kinPrice: function () {
            return AJAX
                .get("https://api.coinmarketcap.com/v1/ticker/kin/")
                .then(function (data) {
                    if (data) {
                        data = JSON.parse(data);
                        if (Array.isArray(data))
                            data = data[0];
                        
                        var KinInUSD = data.price_usd;
                        var KinInBTC = data.price_btc;
                        KinPrice.currentKinRate['BTC'] = parseFloat(KinInBTC);
                        var currencyExchange = JSON.parse(store.get('currencyExchangesRates'));
                        
                        for (var cur in currencyExchange) {
                            KinPrice.currentKinRate[cur] = parseFloat(currencyExchange[cur]) * (KinInUSD);
                        }
                        store.set('currentKinRate', JSON.stringify(KinPrice.currentKinRate));
                        
                    }
                })
                .catch(function (err) {
                    console.error(err);
                });
        },
        bitcoinPrice: function () {
            return AJAX
                .get("https://api.coinmarketcap.com/v1/ticker/bitcoin/")
                .then(function (data) {
                    if (data) {
                        data = JSON.parse(data);
                        if (Array.isArray(data))
                            data = data[0];
                        
                        var btcInUSD = data.price_usd;
                        for (var cur in KinPrice.currencyExchangesRates) {
                            KinPrice.currentBitcoinRate[cur] = parseFloat(KinPrice.currencyExchangesRates[cur]) * (btcInUSD);
                        }
                        store.set('currentBitcoinRate', JSON.stringify(KinPrice.currentBitcoinRate));
                        
                    }
                })
                .catch(function (err) {
                    console.error(err);
                })
        },
        currencyList: function () {
            return AJAX
                .get('http://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml')
                .then(function (data) {
                    var parser = new DOMParser();
                    var xml = parser.parseFromString(data, "text/xml");
                    var xmlList = xml.getElementsByTagName('Cube');
                    
                    //First we get the USD pricing (we are from EURO)
                    if (xml.getElementsByTagName('Cube')[2].attributes['currency'].value == "USD") {
                        var valueUSDEUR = xml.getElementsByTagName('Cube')[2].attributes['rate'].value;
                        var valueEURUSD = 1 / valueUSDEUR;
                        KinPrice.currencyExchangesRates['USD'] = 1;
                        KinPrice.currencyExchangesRates['EUR'] = valueEURUSD;
                        for (var i = 3; i < xmlList.length; i++) {
                            var el = (xml.getElementsByTagName('Cube')[i]);
                            var cur = el.attributes['currency'].value;
                            var rat = el.attributes['rate'].value;
                            KinPrice.currencyExchangesRates[cur] = rat * valueEURUSD;
                        }
                        store.set('currencyExchangesRates', JSON.stringify(KinPrice.currencyExchangesRates));
                        
                        return KinPrice.currencyExchangesRates;
                    }
                });
        }
    }
}


var options = {
    precision: {
        set: function () {
            var e = document.getElementById("precision");
            store.set("precision", parseInt(e.options[e.selectedIndex].value));
        },
        get: function () {
            var p = store.get('precision');
            if (p === null) {
                return 3;
            }
            p = parseInt(p);
            return p;
        }
    },
    divider: {
        set: function () {
            var e = document.getElementById("divider");
            store.set("divider", parseFloat(e.options[e.selectedIndex].value));
        },
        get: function () {
            var d = store.get('divider');
            if (d === null) {
                return 1;
            }
            d = parseFloat(d);
            return d;
        }
    },
    currency: {
        set: function () {
            var e = document.getElementById("currency");
            store.set("currency", e.options[e.selectedIndex].value);
        },
        get: function () {
            var c = store.get('currency');
            if (c === null) {
                return 'USD';
            }
            c = c.toString();
            return c;
        }
    },
    refresh: {
        set: function () {
            var e = document.getElementById("refresh");
            store.set("refresh", parseInt(e.options[e.selectedIndex].value));
        },
        get: function () {
            var r = store.get('refresh');
            if (r === null) {
                return 60;
            }
            r = parseInt(r);
            return r;
        }
    },
    notificationMax: {
        set: function () {
            var e = document.getElementById('notificationMax');
            store.set('notificationMax', e.checked);
        },
        get: function () {
            var n = JSON.parse(store.get('notificationMax'));
            if (n === null) {
                return false;
            }
            return n;
        }
    },
    notificationMin: {
        set: function () {
            var e = document.getElementById('notificationMin');
            store.set('notificationMin', e.checked);
        },
        get: function () {
            var n = JSON.parse(store.get('notificationMin'));
            if (n === null) {
                return false;
            }
            return n;
        }
    },
    lastMax: {
        set: function () {
            var e = document.getElementById('lastMax');
            if (e.value > 0)
                store.set('lastMax', e.value);
        },
        get: function () {
            var l = 0;
            if (store.get('lastMax') > 0) {
                l = JSON.parse(store.get('lastMax'));
            }
            return l;
            
            
        }
    },
    lastMin: {
        set: function () {
            var e = document.getElementById('lastMin');
            if (e.value > 0)
                store.set('lastMin', e.value);
        },
        get: function () {
            var l = 1000;
            if (store.get('lastMin') > 0) {
                l = JSON.parse(store.get('lastMin'));
            }
            return l;
        }
    },
    monitorWealth: {
        set: function () {
            var e = document.getElementById('monitorWealth');
            store.set('monitorWealth', e.checked);
            if (!options.wealth.get()) {
                options.wealth.set(0);
            }
        },
        get: function () {
            var n = JSON.parse(store.get('monitorWealth'));
            if (n === null) {
                return false;
            }
            return n;
        }
    },
    wealth: {
        set: function (_v) {
            if (_v!==undefined) {
                store.set('wealth', _v.toString());
            } else {
                var e = document.getElementById('wealth');
                e.value=e.value.replace(',','.');
                if (!isNaN(parseFloat(e.value)))
                    store.set('wealth', e.value);
            }
        },
        get: function () {
            var l = 0;
            if (store.get('wealth') > Number.MIN_SAFE_INTEGER) {
                l = JSON.parse(store.get('wealth'));
            }
            return l;
        }
    },
};

var store = {
    validateIntegrity: function () {
        function defaultKey(_k) {
            console.log('Issue on', _k);
            switch (_k) {
                case "currency":
                    localStorage.setItem(_k, "USD");
                    break;
                case "currencyExchangesRates":
                    localStorage.setItem(_k, "{}");
                    break;
                case "currentKinRate":
                    localStorage.setItem(_k, "{}");
                    break;
                case "divider":
                    localStorage.setItem(_k, "1");
                    break;
                case "history":
                    //Doit pas contenir null => clear
                    localStorage.setItem(_k, "[0]");
                    
                    break;
                case "lastMax":
                    localStorage.setItem(_k, "0");
                    break;
                case "lastMin":
                    localStorage.setItem(_k, "100000");
                    break;
                case "notificationMax":
                    localStorage.setItem(_k, "false");
                    break;
                case "notificationMin":
                    localStorage.setItem(_k, "false");
                    break;
                case "precision":
                    localStorage.setItem(_k, "2");
                    break;
                case "refresh":
                    localStorage.setItem(_k, "60");
                    break;
                case "wealth":
                    localStorage.setItem(_k,"1");
                    break;
                case "monitorWealth":
                    localStorage.setItem(_k,"false");
                    break;
            }
        }
        
        function validateKey(_k, _v) {
            var isValid = true;
            switch (_k) {
                case "currency":
                    try {
                        var l = _v.length;
                        if (l !== 3) {
                            isValid = false;
                            defaultKey(_k);
                        }
                    } catch (e) {
                        isValid = false;
                        defaultKey(_k);
                    }
                    break;
                case "currencyExchangesRates":
                    try {
                        var j = JSON.parse(_v);
                    } catch (e) {
                        isValid = false;
                        defaultKey(_k);
                    }
                    break;
                case "currentKinRate":
                    try {
                        var j = JSON.parse(_v);
                    } catch (e) {
                        isValid = false;
                        defaultKey(_k);
                    }
                    break;
                case "divider":
                    try {
                        var f = parseFloat(_v);
                        if (isNaN(f) || !(f > 0.00001 && f < 100000)) {
                            isValid = false;
                            defaultKey(_k);
                        }
                    } catch (e) {
                        
                        isValid = false;
                        defaultKey(_k);
                    }
                    break;
                case "history":
                    try {
                        var h = JSON.parse(_v);
                        if(h==null){
                            isValid = false;
                            defaultKey(_k);
                        }else{
                            for (var _i in h) {
                                if (h[_i] == null) {
                                    isValid = false;
                                    defaultKey(_k);
                                }
                            }
                        }
                    } catch (e) {
                        isValid = false;
                        defaultKey(_k);
                    }
                    //Doit pas contenir null => clear
                    break;
                case "lastMax":
                    try {
                        var n = parseInt(_v);
                        if (isNaN(n) || !(n > -1 && n < 1000000)) {
                            isValid = false;
                            defaultKey(_k);
                        }
                    } catch (e) {
                        isValid = false;
                        defaultKey(_k);
                    }
                    break;
                case "lastMin":
                    try {
                        var n = parseInt(_v);
                        if (isNaN(n) || !(n > -1 && n < 1000000)) {
                            isValid = false;
                            defaultKey(_k);
                        }
                    } catch (e) {
                        isValid = false;
                        defaultKey(_k);
                    }
                    break;
                case "notificationMax":
                    try {
                        var n = (_v);
                        if (!(n == "false" || n == "true")) {
                            isValid = false;
                            defaultKey(_k);
                        }
                    } catch (e) {
                        isValid = false;
                        defaultKey(_k);
                    }
                    break;
                case "notificationMin":
                    try {
                        var n = (_v);
                        if (!(n == "false" || n == "true")) {
                            isValid = false;
                            defaultKey(_k);
                        }
                    } catch (e) {
                        isValid = false;
                        defaultKey(_k);
                    }
                    break;
                case "precision":
                    try {
                        var n = parseInt(_v);
                        if (isNaN(n) || !(n > -1 && n < 10)) {
                            isValid = false;
                            defaultKey(_k);
                        }
                    } catch (e) {
                        isValid = false;
                        defaultKey(_k);
                    }
                    break;
                case "refresh":
                    try {
                        var n = parseInt(_v);
                        if (isNaN(n) || !(n > 1 && n < 20000)) {
                            isValid = false;
                            defaultKey(_k);
                        }
                    } catch (e) {
                        isValid = false;
                        defaultKey(_k);
                    }
                    break;
                case "monitorWealth":
                    try {
                        var n = (_v);
                        if (!(n == "false" || n == "true")) {
                            isValid = false;
                            defaultKey(_k);
                        }
                    } catch (e) {
                        isValid = false;
                        defaultKey(_k);
                    }
                    break;
                case "wealth":
                    try {
                        var f = parseFloat(_v);
                        if (isNaN(f) || !(f > Number.MIN_SAFE_INTEGER && f < Number.MAX_SAFE_INTEGER)) {
                            isValid = false;
                            defaultKey(_k);
                        }
                    } catch (e) {
        
                        isValid = false;
                        defaultKey(_k);
                    }
                    break;
                    break;
            }
            return isValid;
        }
        
        var valid = true;
        var keysList = ['currency', 'currencyExchangesRates', 'currentKinRate', 'divider', 'history', 'lastMax', 'lastMin', 'notificationMax', 'notificationMin', 'precision', 'refresh', "monitorWealth",'wealth'];
        for (var index in keysList) {
            var key = keysList[index];
            if (localStorage.hasOwnProperty(key)) {
                var val = localStorage[key];
                if (!validateKey(key, val)) {
                    console.log("Not valid", key);
                    valid = false;
                }
            } else {
                defaultKey(key);
            }
        }
        return valid;
    },
    set: function (key, val) {
        localStorage.setItem(key, val);
    },
    get: function (key) {
        return localStorage.getItem(key);
    }
}
notify = function (title, msg) {
    var date = new Date(),
        hour = date.getHours(),
        minute = date.getMinutes(),
        day = date.getDate(),
        month = date.getMonth() + 1,
        year = date.getFullYear();
    if (minute < 10) {
        minute = '0' + minute;
    }
    if (hour < 10) {
        hour = '0' + hour;
    }
    if (day < 10) {
        day = '0' + day;
    }
    if (month < 10) {
        month = '0' + month;
    }
    var date_str = hour + ':' + minute + ' ' + day + '.' + month + '.' + year;
    return chrome.notifications.create('', {
        type: "basic",
        title: title,
        message: msg,
        contextMessage: date_str,
        iconUrl: "icon.png"
    }, function (notifid) {
    });
};