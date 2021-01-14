const store = chrome.storage.sync

const getDateDetails = () => {
	const today = new Date();
	const day = today.getDay();
	const dd = today.getDate();
	const mm = today.getMonth();
	const yyyy = today.getFullYear();
	const dL = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
	const mL = ['january', 'february', 'march', 'april', 'may', 'June', 'july', 'august', 'september', 'october', 'november', 'december'];
	return {
		day: dL[day],
		month: mL[mm],
		date: dd,
		year : yyyy
	}
}

class TabContext {
	constructor() {
		this.deviceState = {
			connection: null,
			batteryHealth: null
		}
		this.devices = []
		this.updateBackground()
		this.prepareTimeWidget()
		this.loadSensorsData().then(() => this.updateSensorWidgets())
		this.loadDevicesHistory().then(() => this.updateDevicesHistoryWidget())
	}

	async loadSensorsData() {
		const battery = await navigator.getBattery()
		const connection = navigator.onLine ? '~' + navigator.connection.downlink + ' Mbps ' : 'Offline '
		const batteryHealth = (battery.level * 100).toFixed() + '% ' + (battery.charging ? 'Charging' : 'Battery');

		this.deviceState.connection = connection;
		this.deviceState.batteryHealth = batteryHealth;
	}

	loadDevicesHistory() {
		return new Promise((resolve) => {
			// noinspection JSUnresolvedVariable
			chrome.sessions.getDevices((res) => {
				this.devices = res || []
				resolve()
			})
		})
	}

	prepareTimeWidget() {
		const checkTime = (i) => ((i < 10) ? "0" + i : i)
		const timeEl = document.getElementById('time')
		const update = () => {
			const today = new Date(),
				h = checkTime(today.getHours()),
				m = checkTime(today.getMinutes()),
				s = checkTime(today.getSeconds())
			//time = timeTo12HrFormat(time);
			timeEl.innerHTML = `${h}:${m}`

			const d = getDateDetails()
			document.getElementById('date').innerHTML = `${d.day}, ${d.month} ${d.date}`
		}

		this.timeUpdateTimer = setInterval(update, 500)
	}

	updateBackground() {
		const dom = document.getElementById("bgimg")
		dom.style.backgroundColor = '#333333'

		const error = () => {
			const bgnum = (Math.floor(Math.random() * 6) + 1)
			console.log(bgnum)
			dom.style.backgroundImage =  `url(bg/${bgnum}.jpg)`
		}

		fetch('https://source.unsplash.com/1600x900/?winter,wallpaper,nature,arquitecture,city')
			.then(imagelists => {
				const selectedImage = imagelists.url
				console.log(selectedImage)
				if (selectedImage.startsWith("https://images.unsplash.com/source-404")) {
					return error()
				}
				dom.style.backgroundImage = `url(${selectedImage})`
			})
			.catch(error)
	}

	updateSensorWidgets() {
		document.getElementById('battery').innerHTML = `${this.deviceState.connection} - ${this.deviceState.batteryHealth}`
	}

	updateDevicesHistoryWidget() {
		const devices = this.devices
		let format = "<span style='font-size: 2vh;padding: 8px;;text-shadow: 0 0 2px gray;'><strong style='font-size: 2vh;text-shadow: 0 0 2px gray;'>DEVICE</strong> > LINK<span>";
		for (let i = 0; i < devices.length; i++) {
			let lastSession = devices[i].sessions;
			if (lastSession.length > 0) {

				lastSession = lastSession[0];
				let orgLink = lastSession.window['tabs'][0]['url'];
				let sessionLink = orgLink.substring(0, 20);

				sessionLink = `<a href="${orgLink}" target='_blank' rel='noopenner' style='color:white;text-decoration: none;'>${sessionLink}</a>`;

				let domContent = format.replace("DEVICE", devices[i].deviceName);
				domContent = domContent.replace("LINK", sessionLink);
				document.getElementById('device').innerHTML += domContent;
			}
		}
	}

	unload() {
		clearInterval(this.timeUpdateTimer)
	}
}

window.tabContext = new TabContext()

/*const timeTo12HrFormat = (time) => {
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
}*/
