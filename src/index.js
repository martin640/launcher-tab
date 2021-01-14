const store = chrome.storage.sync

const fetchImage = () => {
	const dom = document.getElementById("bgimg")
	dom.style.backgroundColor = '#333333'

	// setup functions first
	
	const error = () => {
		const bgnum = (Math.floor(Math.random() * 6) + 1);
        	console.log(bgnum);
        	let dom = document.getElementById("bgimg");
        	dom.style.backgroundImage =  `url(bg/${bgnum}.jpg)`;
	}

	fetch('https://source.unsplash.com/1600x900/?winter,wallpaper,nature,abstract,arquitecture,city')
		.then(resp => resp)
		.then((imagelists) => {
			const selectedImage = imagelists.url
			const dom = document.getElementById("bgimg")
			dom.style.backgroundImage = `url(${selectedImage})`
		})
		.catch(error)
}

const startTime = () => {
	const checkTime = (i) => ((i < 10) ? "0" + i : i)

	const timeEl = document.getElementById('time') // don't search DOM on each update
	const update = () => {
		const today = new Date(),
			h = checkTime(today.getHours()),
			m = checkTime(today.getMinutes()),
			s = checkTime(today.getSeconds())
		//time = timeTo12HrFormat(time);
		timeEl.innerHTML = `${h}:${m}`
	}

	return setInterval(update, 500)
}

class Init {
	constructor() {
		this.batteryconnectionDetails = null
		this.deviceDetails = null
		this.dateDetails = null
	}
}

class TabAction extends Init {
	constructor(props) {
	  super(props)
	}
	getAllDeviceDetails(callback) {
		chrome.sessions.getDevices((res) => {
			this.deviceDetails = res
			callback(res)
		})
	}
	getBatteryConnectionDetails() {
		let promise = insertconnectionDetails()
		promise.then((res) => {
			this.batteryconnectionDetails = res
		})
	}
	setDateDetails() {
		this.dateDetails = getdateDetails()
	}
}

const tab = new TabAction
tab.getBatteryConnectionDetails()
tab.getAllDeviceDetails((devices) => {
	insertDevicesinDom(devices)
})
tab.setDateDetails()
insertinDom()
function insertinDom() {
	document.getElementById('date').innerHTML = `${tab.dateDetails.day}, ${tab.dateDetails.month} ${tab.dateDetails.date}`;
}
function insertDevicesinDom(devices){
	let format = "<span style='font-size: 2vh;padding: 8px;;text-shadow: 0 0 2px gray;'><strong style='font-size: 2vh;text-shadow: 0 0 2px gray;'>DEVICE</strong> > LINK<span>";
	for(let i= 0; i < devices.length; i++){
		let lastSession = devices[i].sessions;
		if(lastSession.length > 0){

			lastSession = lastSession[0];
			let orgLink = lastSession.window['tabs'][0]['url'];
			let sessionLink= orgLink.substring(0, 20);

			sessionLink = `<a href="${orgLink}" target='_blank' rel='noopenner' style='color:white;text-decoration: none;'>${sessionLink}</a>`;

			let domContent = format.replace("DEVICE",devices[i].deviceName);
			domContent = domContent.replace("LINK",sessionLink);
			document.getElementById('device').innerHTML += domContent;
		}
	}
}

async function insertconnectionDetails(){

 	const date = new Date()
   const battery = await navigator.getBattery()
   const connection = navigator.onLine ? '~' + navigator.connection.downlink + ' Mbps ' : 'Offline '
   const batteryHealth = (battery.level * 100).toFixed() + '% ' + (battery.charging ? 'Charging' : 'Battery');
   document.getElementById('battery').innerHTML = `${connection} - ${batteryHealth}`;
    return {connection:connection,battery:batteryHealth};
}
function getdateDetails(){

	var today = new Date();
	var day = today.getDay();
	var dd = today.getDate();
	var mm = today.getMonth();
	var yyyy = today.getFullYear();
	var dL = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
	var mL = ['january', 'february', 'march', 'april', 'may', 'June', 'july', 'august', 'september', 'october', 'november', 'december'];
	return {
		day: dL[day],
		month:  mL[mm],
		date: dd,
		year : yyyy
	}

}

function timeTo12HrFormat(time)
{

    let time_part_array = time.split(":");
    let ampm = 'AM';
    if (time_part_array[0] >= 12) {
        ampm = 'PM';
    }
    if (time_part_array[0] > 12) {
        time_part_array[0] = time_part_array[0] - 12;
    }
    let formatted_time = `${time_part_array[0]}:${time_part_array[1]} <span class="am_pm">${ampm}<span>`;
    return formatted_time;
}

// initialize document
fetchImage()
startTime()



if (connection == "Offline") {
	document.getElementById("info").innerHTML = "Using local backgrounds until you connect to a ntwork again";
	error();
}
