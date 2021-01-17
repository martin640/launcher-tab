// after installing this creates a new tab uwu a

// chrome.topSites.get(function(res){
		//getting list top sites visited
// 	console.log(res);
// })
chrome.runtime.onInstalled.addListener(function() {
    chrome.tabs.create({
        active: true
    })
})