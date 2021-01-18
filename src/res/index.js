const store = chrome.storage.sync
const storage = window.localStorage

const capitalizeFirstLetter = (string) => string.charAt(0).toUpperCase() + string.slice(1)
const getDateDetails = () => {
	const today = new Date();
	const dd = today.getDate();
	const yyyy = today.getFullYear();
	const ye = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(today);
	const mo = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(today);

	return {
		day: capitalizeFirstLetter(ye),
		month: capitalizeFirstLetter(mo),
		date: dd,
		year : yyyy
	}
}

class ClockWidget extends Widget {
	prepareLayout(container, extra) {
		this.checkTime = (i) => ((i < 10) ? "0" + i : i)

		container.style.display = "flex"
		container.style.flexDirection = "column"
		container.style.alignItems = "center"
		container.style.justifyContent = "center"

		this.timeEl = document.createElement('span')
		this.timeEl.style.display = "block"
		this.timeEl.style.textAlign = "center"
		this.timeEl.style.fontSize = "16vh"
		this.timeEl.style.fontWeight = "100"
		this.timeEl.style.textShadow = "0 0 2px gray"
		container.appendChild(this.timeEl)

		this.secondRowEl = document.createElement('span')
		this.secondRowEl.style.display = "block"
		this.secondRowEl.style.textAlign = "center"
		this.secondRowEl.style.fontSize = "4vh"
		this.secondRowEl.style.fontWeight = "200"
		this.secondRowEl.style.textShadow = "0 0 2px gray"
		container.appendChild(this.secondRowEl)

		this.dateEl = document.createElement('span')
		this.secondRowEl.appendChild(this.dateEl)

		this.weatherEl = document.createElement('a')
		this.weatherEl.style.color = "white"
		this.weatherEl.style.textDecoration = "none"
		this.secondRowEl.appendChild(this.weatherEl)

		this.weatherIconEl = document.createElement('img')
		this.weatherIconEl.src = '/res/weather-icons/unknown.png'
		this.weatherIconEl.style.width = "30px"
		this.weatherIconEl.style.height = "30px"
		this.weatherIconEl.style.margin = "0 16px"
		this.weatherEl.appendChild(this.weatherIconEl)

		this.weatherTempEl = document.createElement('span')
		this.weatherEl.appendChild(this.weatherTempEl)

		this.timeUpdateTimer = setInterval(() => this.invalidate(), 1000)
		this.weatherUpdateTimer = setInterval(() => this.fetchWeather(), 900000)
		this.fetchWeather()

		this.timeEl.onmouseenter = () => {
			this.timeHovered = true
			clearInterval(this.timeUpdateTimer)
			this.timeUpdateTimer = setInterval(() => this.invalidate(), 200)
			this.invalidate()
		}
		this.timeEl.onmouseleave = () => {
			this.timeHovered = false
			clearInterval(this.timeUpdateTimer)
			this.timeUpdateTimer = setInterval(() => this.invalidate(), 1000)
			this.invalidate()
		}
	}

	async fetchWeather() {
		// change unit to selected by user in dialog or if location = us (default )
		let city, unit = "metric"
		try {
			const ipApiRes = await fetch(`http://ip-api.com/json/?fields=city`)
			const ipApiJson = await ipApiRes.json()
			city = ipApiJson.city
		} catch (e) {
			return console.warn("Geolocation failed")
		}
		this.weatherEl.href = `https://openweathermap.org/city/${encodeURIComponent(city)}`
		this.weatherEl.title = city

		fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${unit}&appid=422958391a36158a7baf2910a96df05c`)
			.then(res => res.json())
			.then(res => {
				let icon = '', weatherId = res.weather[0].id
				if (weatherId === 800) icon = '/res/weather-icons/021-sun.svg'
				else if (weatherId >= 200 && weatherId < 300) icon = '/res/weather-icons/021-storm.svg'
				else if (weatherId >= 300 && weatherId < 600) icon = '/res/weather-icons/021-rain-2.svg'
				else if (weatherId >= 600 && weatherId < 700) icon = '/res/weather-icons/021-snowing-1.svg'
				else if (weatherId > 800 && weatherId < 810) icon = '/res/weather-icons/021-cloudy-1.svg'

				this.weatherIconEl.src = icon
				this.weatherTempEl.innerHTML = `${Math.round(res.main.temp)} °C`
			})
			.catch(e => console.log(e))
	}

	update(container, extra) {
		const today = new Date(),
			h = this.checkTime(today.getHours()),
			m = this.checkTime(today.getMinutes()),
			s = this.checkTime(today.getSeconds())
		//time = timeTo12HrFormat(time);
		if (this.timeHovered) {
			this.timeEl.innerHTML = `${h}:${m}:${s}`
		} else {
			this.timeEl.innerHTML = `${h}:${m}`
		}
		this.timeEl.id = "clock";

		const d = getDateDetails()
		this.dateEl.innerHTML = `${d.day}, ${d.month} ${d.date}`
	}

	unload() {
		clearInterval(this.timeUpdateTimer)
		clearInterval(this.weatherUpdateTimer)
	}
}

class LinkWidget extends Widget {
	prepareLayout(container, extra) {
		this.innerView = document.createElement('a')
		container.appendChild(this.innerView)

		this.iconEl = document.createElement('img')
		this.innerView.appendChild(this.iconEl)

		this.labelEl = document.createElement('span')
		this.innerView.appendChild(this.labelEl)
	}

	update(container, extra) {
		this.innerView.style.display = "flex"
		this.innerView.style.width = "100%"
		this.innerView.style.height = "100%"
		this.innerView.style.flexDirection = "column"
		this.innerView.style.alignItems = "center"
		this.innerView.style.justifyContent = "center"
		this.innerView.style.cursor = "pointer"
		this.innerView.style.color = "white"
		this.innerView.style.textDecoration = "none"
		this.innerView.href = extra.rel

		this.iconEl.style.display = "block"
		this.iconEl.style.width = "24px"
		this.iconEl.style.height = "24px"
		this.iconEl.style.backgroundColor = extra.color || "#e9e9e9"
		this.iconEl.style.padding = "12px"
		this.iconEl.style.borderRadius =
			storage.getItem('shortcut-circle') === 'true' ? "50%" : "25%"
		this.iconEl.style.marginBottom = "8px"
		this.iconEl.src = `chrome://favicon/${extra.rel}`

		this.labelEl.style.overflow = "hidden"
		this.labelEl.style.textOverflow = "ellipsis"
		this.labelEl.style.textAlign = "center"
		this.labelEl.style.display = "-webkit-box"
		this.labelEl.style.webkitLineClamp = "1"
		this.labelEl.style.webkitBoxOrient = "vertical"
		this.labelEl.innerText = extra.label || extra.rel
	}
}

class SampleWidget extends Widget {
	prepareLayout(container, extra) { }

	update(container, extra) {
		container.style.backgroundColor = "#1b79ff"
	}
}

class MyCustomWidget extends Widget {
	constructor(context, gridContainer, extra) {
		super(context, gridContainer, extra)
		this.deviceState = {
			connection: null,
			batteryHealth: null
		}
		this.devices = []
		this.loadSensorsData().then(() => this.update())
		this.loadDevicesHistory().then(() => this.update())
	}
	async loadSensorsData() {
		const battery = await navigator.getBattery()
		const connection = navigator.onLine ? '~' + navigator.connection.downlink + ' Mbps ' : 'Offline '
		const batteryHealth = (battery.level * 100).toFixed() + '% ' + (battery.charging ? 'Charging' : 'Battery');

		this.deviceState.connection = connection;
		this.deviceState.batteryHealth = batteryHealth;
	}
	async loadDevicesHistory() {
		return new Promise((resolve) => {
			// noinspection JSUnresolvedVariable
			chrome.sessions.getDevices((res) => {
				this.devices = res || []
				resolve()
			})
		})
	}

	render(container) {
		document.getElementById('battery').innerHTML = `${this.deviceState.connection} - ${this.deviceState.batteryHealth}`
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
}

window.tabContext = new TabContext()
window.tabContext.createWidget(ClockWidget, undefined, 0, 0, 0, 3, -1)
window.tabContext.createWidget(SampleWidget, undefined, 4, 4, 3, 2)

// initialize widgets for top sites
const autoShortcuts = (storage.getItem('auto-shortcuts') === null) || (storage.getItem('auto-shortcuts') === 'true')
if (autoShortcuts) {
	(() => {
		const topSitesWidgets = []
		// load top sites widgets at first with no layout parameters
		chrome.topSites.get(res => {
			for (let i = 0; i < res.length; i++) {
				topSitesWidgets.push(
					window.tabContext.createWidget(LinkWidget,
						{rel: res[i].url, label: res[i].title},
						0, 0, 0, 0)
				)
			}
		})
		// update layout parameters on layout change
		window.tabContext.onLayoutChange = (oldState, newState) => {
			const availableHeight = newState.rows - 3
			for (let i = 0; i < topSitesWidgets.length; i++) {
				topSitesWidgets[i].changeLayout({
					pX: Math.floor(i / availableHeight),
					pY: 3 + Math.floor(i % availableHeight),
					w: 1, h: 1
				})
			}
		}
	})()
}

// configure preferences menu
(() => {
	document.getElementById('options-menu-toggle1').onclick =
		() => document.getElementById('options-menu').classList.add('shown')
	document.getElementById('options-menu-toggle2').onclick =
		() => document.getElementById('options-menu').classList.remove('shown')
	document.getElementById('options-menu-reload').onclick = () => window.tabContext.rebuildLayout()
	document.getElementById('options-menu-edit').onclick = () => window.tabContext.setEditModeActive(!window.tabContext.editMode)

	document.getElementById('options-menu-i1').checked = autoShortcuts
	document.getElementById('options-menu-i1').onchange = (e) => {
		storage.setItem('auto-shortcuts', e.target.checked ? 'true' : 'false')
		document.location.reload()
	}

	document.getElementById('options-menu-i2').checked = window.tabContext.debugEnabled
	document.getElementById('options-menu-i2').onchange = (e) => {
		window.tabContext.debugEnabled = e.target.checked
		storage.setItem('root-debug-enabled', e.target.checked ? 'true' : 'false')
		window.tabContext.updateDebugWidget()
	}

	document.getElementById('options-menu-i3').checked = storage.getItem('shortcut-circle') === 'true'
	document.getElementById('options-menu-i3').onchange = (e) => {
		storage.setItem('shortcut-circle', e.target.checked ? 'true' : 'false')
		window.tabContext.updateAllWidgets()
	}

	document.getElementById('options-menu-i4').value = storage.getItem('bgSource') || "1"
	document.getElementById('options-menu-i4').onchange = (e) => {
		storage.setItem('bgSource', e.target.value)
		window.tabContext.updateBackground()
	}
})()
