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

class WidgetBase {
	constructor(context, gridContainer, extra) {
		this.update.bind(this)
		this.render.bind(this)
		this.unload.bind(this)
		this._context = context
		this._container = gridContainer
		this._extra = extra
	}
	get container() {
		return this._container
	}
	get extra() {
		return this._extra
	}
	_changeLayout(config) {
		const {pX, pY, w, h, w1 = 0, h1 = 0} = config
		this._container.style.gridArea =
			`${pY >= 0 ? (pY+1) : pY} / ${pX >= 0 ? (pX+1) : pX} / ${h ? ('span ' + h) : h1} / ${w ? ('span ' + w) : w1}`
	}
	update() {
		this._context._notifyRender(this)
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
	constructor(context, gridContainer, extra) {
		super(context, gridContainer, extra);
		this.checkTime = (i) => ((i < 10) ? "0" + i : i)

		gridContainer.style.display = "flex"
		gridContainer.style.flexDirection = "column"
		gridContainer.style.alignItems = "center"
		gridContainer.style.justifyContent = "center"

		this.timeEl = document.createElement('span')
		this.timeEl.style.display = "block"
		this.timeEl.style.textAlign = "center"
		this.timeEl.style.fontSize = "16vh"
		this.timeEl.style.fontWeight = "100"
		this.timeEl.style.textShadow = "0 0 2px gray"
		gridContainer.appendChild(this.timeEl)

		this.secondRowEl = document.createElement('span')
		this.secondRowEl.style.display = "block"
		this.secondRowEl.style.textAlign = "center"
		this.secondRowEl.style.fontSize = "4vh"
		this.secondRowEl.style.fontWeight = "200"
		this.secondRowEl.style.textShadow = "0 0 2px gray"
		gridContainer.appendChild(this.secondRowEl)

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

		this.timeUpdateTimer = setInterval(() => this.update(), 1000)
		this.weatherUpdateTimer = setInterval(() => this.fetchWeather(), 900000)
		this.fetchWeather()

		this.timeEl.onmouseenter = () => {
			this.timeHovered = true
			clearInterval(this.timeUpdateTimer)
			this.timeUpdateTimer = setInterval(() => this.update(), 200)
			this.update()
		}
		this.timeEl.onmouseleave = () => {
			this.timeHovered = false
			clearInterval(this.timeUpdateTimer)
			this.timeUpdateTimer = setInterval(() => this.update(), 1000)
			this.update()
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

	render(container) {
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

class LinkWidget extends WidgetBase {
	constructor(context, gridContainer, extra) {
		super(context, gridContainer, extra)

		this.innerView = document.createElement('a')
		gridContainer.appendChild(this.innerView)

		this.iconEl = document.createElement('img')
		this.innerView.appendChild(this.iconEl)

		this.labelEl = document.createElement('span')
		this.innerView.appendChild(this.labelEl)
	}

	render(container) {
		const extra = this.extra

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

class MyCustomWidget extends WidgetBase {
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

class TabContext {
	constructor() {
		this.gridSizeInfo = {
			width: -1, height: -1,
			columns: -1, rows: -1
		}
		this.widgets = []
		this.renderStats = {
			counter: 0, counterSnapshot: 0,
			start: Date.now()
		}
		this.debugEnabled = storage.getItem('root-debug-enabled') === 'true'
		this.debugAlt = false
		this.updateBackground()
		this.onLayoutChange = () => {}
		const reloadLayout = () => this.probeLayoutInfo().then(() => this.updateDebugWidget())
		document.onload = window.onresize = reloadLayout
		setTimeout(reloadLayout, 500)
		setInterval(() => {
			this.renderStats.counterSnapshot = this.renderStats.counter
			this.renderStats.counter = 0
			this.updateDebugWidget()
		}, 1000)

		const debugEl = document.getElementById('status-debug')
		debugEl.onmouseenter = () => {
			this.debugAlt = true
			for (let i = 0; i < this.widgets.length; i++) {
				const w = this.widgets[i]
				w.container.style.outline = "2px dashed #00FF91"
				w.container.style.backgroundColor = "#00FF9133"
			}
		}
		debugEl.onmouseleave = () => {
			this.debugAlt = false
			for (let i = 0; i < this.widgets.length; i++) {
				const w = this.widgets[i]
				w.container.style.outline = "unset"
				w.container.style.backgroundColor = "unset"
			}
		}
	}

	_notifyRender(src) {
		this.renderStats.counter++
		if (this.debugAlt) {
			if (src.__tmp_timer_id) clearTimeout(src.__tmp_timer_id)
			src.container.style.outline = "2px dashed #FF00D5"
			src.__tmp_timer_id = setTimeout(() => {
				src.__tmp_timer_id = undefined
				if (this.debugAlt) {
					src.container.style.outline = "2px dashed #00FF91"
				} else {
					src.container.style.outline = "unset"
					src.container.style.backgroundColor = "unset"
				}
			}, 150)
		}
		this.updateDebugWidget()
	}

	updateBackground() {
		const dom = document.getElementById("bgimg")
		const attribute = document.getElementById("status-info")
		const storage = window.localStorage
		let a

		if ((a = storage.getItem("bgUrl"))) {
			return dom.style.backgroundImage = `url(${a})`
		} else if ((a = storage.getItem("bgNum"))) {
			return dom.style.backgroundImage = `url(res/bg/${a}.jpg)`
		} else {
			const error = (e) => {
				const bgnum = (Math.floor(Math.random() * 6) + 1)
				console.log(`Error: ${e}, using built-in wallpapers num ${bgnum}`)
				dom.style.backgroundImage = `url(res/bg/${bgnum}.jpg)`
			}

			fetch('https://picsum.photos/1900/900')
				.then(res => {
					const selectedImage = res.url
					if (!selectedImage || selectedImage.includes("404") || selectedImage.includes("error")) {
						return error()
					}
					dom.style.backgroundImage = `url(${selectedImage})`

					const imgId = /id\/(.+?)\//g.exec(selectedImage)[1]
					fetch(`https://picsum.photos/id/${imgId}/info`)
						.then(res => res.json())
						.then(res => {
							attribute.innerHTML = `Photo by <a href="${res.url}">${res.author}</a> on Unsplash`
						})
						.catch(console.log)
				})
				.catch(error)
		}
	}

	async probeLayoutInfo() {
		const element = document.getElementById('ref-lay-grid')
		const computedStyle = window.getComputedStyle(element)
		const old = {...this.gridSizeInfo}
		this.gridSizeInfo.width = element.clientWidth
		this.gridSizeInfo.height = element.clientHeight
		this.gridSizeInfo.columns = computedStyle.gridTemplateColumns.split(" ").length
		this.gridSizeInfo.rows = computedStyle.gridTemplateRows.split(" ").length

		this.onLayoutChange(old, {...this.gridSizeInfo})
	}

	updateDebugWidget() {
		let data = "debugging enabled"
		data += `, layout size: [${this.gridSizeInfo.width} × ${this.gridSizeInfo.height}] (${this.gridSizeInfo.columns} × ${this.gridSizeInfo.rows})`
		data += `, widgets attached: ${this.widgets.length}`
		data += `, updates/sec: ${this.renderStats.counterSnapshot}`

		const debugEl = document.getElementById('status-debug')
		debugEl.style.display = this.debugEnabled ? "block" : "none"
		debugEl.innerHTML = data
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
		document.getElementById('ref-lay-grid').appendChild(container)
		try {
			const widget = new constructor(this, container, extra || {})
			if (widget) {
				this.widgets.push(widget)
				widget._changeLayout({pX, pY, w, h, w1, h1})
				widget.update()
				this.updateDebugWidget()
				return widget
			} else
				return false
		} catch (e) {
			console.error(`Unhandled error while creating widget: ${e}`)
			return false
		}
	}

	/**
	 * Calls update on all widgets effectively updating entire grid
	 */
	updateAllWidgets() {
		for (let i = 0; i < this.widgets.length; i++) {
			this.widgets[i].update()
		}
	}

	/**
	 * Destroys all widgets and recreates them with same parameters as they were created
	 */
	rebuildLayout() {
		for (let i = 0; i < this.widgets.length; i++) {
			const og = this.widgets[i]
			const constructor = og.__proto__.constructor
			og.unload() // unload original widget to cancel all pending tasks that could modify new widget
			// todo, create new container instead
			og.container.innerHTML = '' // reset container contents
			const copy = new constructor(this, og.container, og.extra || {}) // construct new widget
			this.widgets[i] = copy // replace widget in array
			copy.update()
			this.updateDebugWidget()
		}
	}

	/**
	 * Unloads all widgets
	 */
	destroy() {
		for (let i = 0; i < this.widgets.length; i++) {
			this.widgets[i].unload()
		}
		this.widgets.length = 0
	}
}

window.tabContext = new TabContext()
window.tabContext.createWidget(ClockWidget, undefined, 0, 0, 0, 3, -1);

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
				topSitesWidgets[i]._changeLayout({
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
})()
