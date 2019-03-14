window.addEventListener("load", loadBackground());
var fetchInterval;
function loadBackground() {
    var valid = store.validateIntegrity();
    if(valid){
        prepareBadge();
        prepareListener();
    
    
        KinPrice
            .fetch
            .currencyList()
            .then(function () {
                KinPrice
                    .fetch
                    .kinPrice()
                    .then(function () {
                        setTitle();
                        if(shouldMonitorWealth()===true){
                            var wealth = KinPrice.getWealth()
                            setBadge(wealth);
                        }else{
                            setBadge();
                        }
                        launchInterval();
                    })
            })
    }else{
        loadBackground();
    }
}

function fetchKinPrice(cb) {
    KinPrice
        .fetch
        .kinPrice()
        .then(function () {
            setTitle();
            setBadge();
        })
}


function prepareListener() {
    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            
            if (sender.tab) {
                //RECEIVED FROM A CONTENT SCRIPT : Options ?
            } else {
                //RECEIVED FROM THE EXTENSION (POPUP)
                if (request && request.hasOwnProperty('type')) {
                    switch (request.type) {
                        case "priceHistory":
                            sendResponse(KinPrice.getPriceHistory());
                            break;
                    }
                }
                
            }
        }
    )
}