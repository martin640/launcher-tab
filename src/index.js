const store = chrome.storage.sync

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

class WidgetBase {
	constructor(gridContainer, extra) {
		this.update.bind(this)
		this.render.bind(this)
		this.unload.bind(this)
		this._container = gridContainer
		this._extra = extra
	}
	get container() {
		return this._container
	}
	get extra() {
		return this._extra
	}
	update() {
		this.render(this._container)
	}
	render(container) {
		container.style.backgroundColor = "#d20000"
		container.style.color = "#fff"
		container.style.padding = "8px"
		container.innerHTML = "<b>Warning: Widget should override render() function without calling super.render()</b>"
	}
	unload() {}
}

class ClockWidget extends WidgetBase {
	constructor(gridContainer, extra) {
		super(gridContainer, extra);
		this.checkTime = (i) => ((i < 10) ? "0" + i : i)

		gridContainer.style.display = "flex"
		gridContainer.style.flexDirection = "column"
		gridContainer.style.alignItems = "center"
		gridContainer.style.justifyContent = "center"

		this.timeEl = document.createElement('span')
		this.timeEl.style.display = "block"
		this.timeEl.style.textAlign = "center"
		this.timeEl.style.fontSize = "20vh"
		this.timeEl.style.fontWeight = "100"
		this.timeEl.style.textShadow = "0 0 2px gray"
		gridContainer.appendChild(this.timeEl)

		this.dateEl = document.createElement('span')
		this.dateEl.style.display = "block"
		this.dateEl.style.textAlign = "center"
		this.dateEl.style.fontSize = "4vh"
		this.dateEl.style.fontWeight = "200"
		this.dateEl.style.textShadow = "0 0 2px gray"
		gridContainer.appendChild(this.dateEl)

		this.timeUpdateTimer = setInterval(() => this.update(), 500)
	}

	render(container) {
		const today = new Date(),
			h = this.checkTime(today.getHours()),
			m = this.checkTime(today.getMinutes()),
			s = this.checkTime(today.getSeconds())
		//time = timeTo12HrFormat(time);
		this.timeEl.innerHTML = `${h}:${m}`

		const d = getDateDetails()
		this.dateEl.innerHTML = `${d.day}, ${d.month} ${d.date}`
	}
	unload() {
		clearInterval(this.timeUpdateTimer)
	}
}

class LinkWidget extends WidgetBase {
	constructor(gridContainer, extra) {
		super(gridContainer, extra)

		gridContainer.style.display = "flex"
		gridContainer.style.flexDirection = "column"
		gridContainer.style.alignItems = "center"
		gridContainer.style.justifyContent = "center"
		gridContainer.style.cursor = "pointer"
		gridContainer.onclick = () => document.location.href = extra.rel

		this.iconEl = document.createElement('img')
		this.iconEl.style.display = "block"
		this.iconEl.style.width = "24px"
		this.iconEl.style.height = "24px"
		this.iconEl.style.backgroundColor = extra.color || "#e9e9e9"
		this.iconEl.style.padding = "12px"
		this.iconEl.style.borderRadius = "50%"
		this.iconEl.style.marginBottom = "8px"
		this.iconEl.src = `chrome://favicon/${extra.rel}`
		gridContainer.appendChild(this.iconEl)

		this.labelEl = document.createElement('span')
		this.labelEl.style.display = "block"
		this.labelEl.innerText = extra.label || extra.rel
		gridContainer.appendChild(this.labelEl)
	}

	render(container) { }
}

class TabContext {
	constructor() {
		this.deviceState = {
			connection: null,
			batteryHealth: null
		}
		this.devices = []
		this.widgets = []
		this.updateBackground()
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

	async updateBackground() {
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

	async updateSensorWidgets() {
		document.getElementById('battery').innerHTML = `${this.deviceState.connection} - ${this.deviceState.batteryHealth}`
	}

	async updateDevicesHistoryWidget() {
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

	/**
	 * Creates a new widget and attaches it to the grid
	 * @param constructor reference to widget class
	 * @param extra extra options to be passed to the widget
	 * @param pX x position of widget (in grid lines)
	 * @param pY y position of widget (in grid lines)
	 * @param w width of widget (in grid lines)
	 * @param h height of widget (in grid lines)
	 * @param w1 end x position of widget (in grid lines) this parameter takes effect only if w is 0
	 * @param h1 end y position of widget (in grid lines) this parameter takes effect only if y is 0
	 * @returns {boolean|WidgetBase} returns constructed widget of false on error
	 */
	createWidget(constructor, extra, pX, pY, w, h, w1 = 0, h1 = 0) {
		const container = document.createElement("div")
		container.style.gridArea = `${pY+1} / ${pX+1} / ${h ? ('span ' + h) : h1} / ${w ? ('span ' + w) : w1}`
		document.getElementById('ref-lay-grid').appendChild(container)
		try {
			const widget = new constructor(container, extra || {})
			if (widget) {
				this.widgets.push(widget)
				widget.update()
				return widget
			} else
				return false
		} catch (e) {
			console.error(`Unhandled error while creating widget: ${e}`)
			return false
		}
	}

	unload() {
		for (let i = 0; i < this.widgets.length; i++) {
			this.widgets[i].unload()
		}
	}
}

window.tabContext = new TabContext()
window.tabContext.createWidget(ClockWidget, undefined, 0, 0, 0, 3, -1)

window.tabContext.createWidget(LinkWidget, {rel: "https://stackoverflow.com", label: "StackOverflow"},
	0, 4, 1, 1)
window.tabContext.createWidget(LinkWidget, {rel: "https://youtube.com", label: "Youtube"},
	0, 5, 1, 1)
window.tabContext.createWidget(LinkWidget, {rel: "https://instagram.com", label: "Instagram"},
	1, 4, 1, 1)
window.tabContext.createWidget(LinkWidget, {rel: "https://facebook.com", label: "Facebook"},
	1, 5, 1, 1)
window.tabContext.createWidget(LinkWidget, {rel: "https://github.com", label: "Github", color: "#303030"},
	5, 5, 1, 1)

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
