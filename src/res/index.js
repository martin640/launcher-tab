const store = chrome.storage.sync
const storage = window.localStorage

function download(data, filename, type) {
    const file = new Blob([data], {type: type})
    if (window.navigator.msSaveOrOpenBlob)
        window.navigator.msSaveOrOpenBlob(file, filename)
    else {
        const a = document.createElement("a"),
            url = URL.createObjectURL(file)
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        setTimeout(() => {
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
        }, 0);
    }
}
function requestFileOpen() {
    return new Promise(resolve => {
        const input = document.createElement('input')
        input.type = 'file'

        input.onchange = e => {
            const file = e.target.files[0]
            const reader = new FileReader()
            reader.readAsText(file,'UTF-8')
            reader.onload = readerEvent => {
                const content = readerEvent.target.result
                resolve(content)
            }

        }
        input.click()
    })
}
const capitalizeFirstLetter = (string) => string.charAt(0).toUpperCase() + string.slice(1)
const getDateDetails = () => {
    const today = new Date();
    const dd = today.getDate();
    const yyyy = today.getFullYear();
    const ye = new Intl.DateTimeFormat(undefined, {weekday: 'long'}).format(today);
    const mo = new Intl.DateTimeFormat(undefined, {month: 'short'}).format(today);

    return {
        day: capitalizeFirstLetter(ye),
        month: capitalizeFirstLetter(mo),
        date: dd,
        year: yyyy
    }
}
JSON.parseFailSafe = (input, fallback) => {
    try {
        return JSON.parse(input) || fallback
    } catch (e) { return fallback }
}
const storageGetBoolean = (key, fallback = false) => {
    const v = storage.getItem(key)
    return v === null ? fallback : v === 'true'
}
const storageSetBoolean = (key, value) => storage.setItem(key, value ? 'true' : 'false')

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
        this.timeEl.style.fontSize = "6rem"
        this.timeEl.style.fontWeight = "100"
        this.timeEl.style.textShadow = "0 0 2px gray"
        container.appendChild(this.timeEl)

        this.secondRowEl = document.createElement('span')
        this.secondRowEl.style.display = "flex"
        this.secondRowEl.style.alignItems = "center"
        this.secondRowEl.style.fontSize = "2rem"
        this.secondRowEl.style.fontWeight = "200"
        this.secondRowEl.style.textShadow = "0 0 2px gray"
        this.secondRowEl.style.alignItems = "center"
        container.appendChild(this.secondRowEl)

        this.dateEl = document.createElement('span')
        this.secondRowEl.appendChild(this.dateEl)

        this.weatherEl = document.createElement('a')
        this.weatherEl.style.display = "inline-flex"
        this.weatherEl.style.alignItems = "center"
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

        this.weatherCache = JSON.parseFailSafe(storage.getItem('lt-weather-cache'), {})
        const updateWeather = () => {
            this.weatherUpdateTimer = setInterval(() => this.fetchWeather(), 900000)
            this.fetchWeather()
        }
        if (this.weatherCache.data) {
            const nextTimerTrigger = (this.weatherCache.lastUpdate + 900000)

            if (nextTimerTrigger <= Date.now()) {
                this.weatherUpdateTimer = setTimeout(updateWeather, nextTimerTrigger - Date.now())
            } else {
                console.log(`Next weather update: ${new Date(nextTimerTrigger)}`)
            }
        } else {
            updateWeather()
        }

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
            const ipApiRes = await fetch(`http://ip-api.com/json/?fields=countryCode,city`)
            const ipApiJson = await ipApiRes.json()
            this.weatherCache.city = city = `${ipApiJson.city}, ${ipApiJson.countryCode}`
        } catch (e) {
            return console.warn("Geolocation failed")
        }

        fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${unit}&appid=422958391a36158a7baf2910a96df05c`)
            .then(res => res.json())
            .then(res => {
                this.weatherCache.data = res // todo save
                this.weatherCache.lastUpdate = Date.now()
                storage.setItem('lt-weather-cache', JSON.stringify(this.weatherCache))
            })
            .catch(e => console.log(e))
    }

    update(container, extra) {
        const today = new Date(),
            h = this.checkTime(today.getHours()),
            m = this.checkTime(today.getMinutes()),
            s = this.checkTime(today.getSeconds())
        // time = timeTo12HrFormat(time)   todo: support 12h format
        this.timeEl.innerHTML = this.timeHovered ? `${h}:${m}:${s}` : `${h}:${m}`;
        this.timeEl.id = "clock";
        const d = getDateDetails()
        this.dateEl.innerHTML = `${d.day}, ${d.month} ${d.date}`

        const res = this.weatherCache.data
        if (res) {
            let icon = '', weatherId = res.weather[0].id
            if (weatherId === 800)                        icon = '/res/weather-icons/021-sun.svg'
            else if (weatherId >= 200 && weatherId < 300) icon = '/res/weather-icons/021-storm.svg'
            else if (weatherId >= 300 && weatherId < 600) icon = '/res/weather-icons/021-rain-2.svg'
            else if (weatherId >= 600 && weatherId < 700) icon = '/res/weather-icons/021-snowing-1.svg'
            else if (weatherId > 800 && weatherId < 810)  icon = '/res/weather-icons/021-cloudy-1.svg'

            this.weatherEl.title = this.weatherCache.city
            this.weatherEl.href = `https://openweathermap.org/city/${res.id}`
            this.weatherIconEl.src = icon
            this.weatherTempEl.innerHTML = `${Math.round(res.main.temp)} °C`
        }
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

        this.iconWrapper = document.createElement('div')
        this.innerView.appendChild(this.iconWrapper)
		this.iconEl = document.createElement('img')
		this.iconWrapper.appendChild(this.iconEl)

		this.labelEl = document.createElement('span')
		this.innerView.appendChild(this.labelEl)
	}

	update(container, extra) {
        const labelValue = extra.label || extra.rel

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

        this.iconWrapper.style.display = labelValue ? "flex" : "none"
        this.iconWrapper.style.width = "50px"
        this.iconWrapper.style.height = "50px"
        this.iconWrapper.style.backgroundColor = extra.rel ? (extra.color || "#e9e9e9") : "#ffffff11";
        this.iconWrapper.style.alignItems = "center"
        this.iconWrapper.style.justifyContent = "center"
        this.iconWrapper.style.borderRadius = storageGetBoolean('lt-shortcut-circle') ? "50%" : "25%"
        this.iconWrapper.style.marginBottom = "8px"

        this.iconEl.style.width = "24px"
        this.iconEl.style.height = "24px"
		this.iconEl.style.display = "block"
        this.iconEl.onerror = () => {
            this.iconEl.src = `chrome://favicon/${extra.rel}`
        }
        this.iconEl.src = `chrome://favicon/size/32@1x/${extra.rel}`

		this.labelEl.style.overflow = "hidden"
		this.labelEl.style.textOverflow = "ellipsis"
		this.labelEl.style.textAlign = "center"
		this.labelEl.style.display = "-webkit-box"
		this.labelEl.style.webkitLineClamp = "1"
		this.labelEl.style.webkitBoxOrient = "vertical"
        this.labelEl.style.opacity = labelValue ? "" : "0.5"
		this.labelEl.innerText = labelValue || "<N/A>"
	}
}

class SampleWidget extends Widget {
    prepareLayout(container, extra) {
    }

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

(() => {
    const widgetClasses = {
        ClockWidget, LinkWidget, SampleWidget, MyCustomWidget
    }

    window.tabContext = new TabContext()

    // parse saved layout state
    let layoutState
    const layoutStateSaved = storage.getItem('lt-layoutState')
    if (!layoutStateSaved || !(layoutState = JSON.parse(layoutStateSaved))) {
        layoutState = [
            {type: "ClockWidget", layout: {pX: 0, pY: 0, w: 6, h: 2}}
        ]
        for (let i = 0; i < 10; i++) {
            layoutState.push({
                type: "LinkWidget",
                extra: {topSiteNum: i},
                layout: {pX: undefined, pY: undefined, w: 1, h: 1}
            })
        }
        storage.setItem('lt-layoutState', JSON.stringify(layoutState))
    }

    // attach saved widgets
    for (let i = 0; i < layoutState.length; i++) {
        const row = layoutState[i]
        const targetClass = widgetClasses[row.type]
        if (!targetClass) {
            console.warn(`Failed to inflate saved widget: Widget type ${row.type} not found`)
            continue
        }

        window.tabContext.createWidget(targetClass, row.extra,
            row.layout.pX, row.layout.pY, row.layout.w, row.layout.h, row.layout.rW, row.layout.rH)
    }

    // load top sites into placeholder widgets
    if (!storage.getItem('lt-no-top-sites')) {
        // noinspection JSUnresolvedVariable
        chrome.topSites.get(res => {
            for (let i = 0; i < res.length; i++) {
                const r = res[i]
                for (let a = 0; a < window.tabContext.widgets.length; a++) {
                    const w = window.tabContext.widgets[a]
                    if (w.extra.topSiteNum === i) {
                        w.extra.rel = r.url
                        w.extra.label = r.title
                        w.invalidate()
                    }
                }
            }
        })
    }

    window.tabContext.onSaveLayout = (widgets) => {
        layoutState = []
        for (let i = 0; i < widgets.length; i++) {
            const w = widgets[i]
            layoutState.push({
                type: w.__proto__.constructor.name,
                extra: w.extra,
                layout: w.layout.abstract
            })
        }
        storage.setItem('lt-layoutState', JSON.stringify(layoutState))
    }

    const loadOptionMenuItems = () => {
        document.getElementById('lt-preference-HcX4j').checked = storageGetBoolean('lt-no-top-sites')
        document.getElementById('lt-preference-HcX4j').onchange = (e) => {
            storageSetBoolean('lt-no-top-sites', e.target.checked)
        }

        document.getElementById('lt-preference-v3i7X').checked = window.tabContext.debugEnabled
        document.getElementById('lt-preference-v3i7X').onchange = (e) => {
            storageSetBoolean('lt-root-debug-enabled', e.target.checked)
            window.tabContext.debugEnabled = e.target.checked
            window.tabContext.updateDebugWidget()
        }

        document.getElementById('lt-preference-ssm2P').checked = storageGetBoolean('lt-shortcut-circle')
        document.getElementById('lt-preference-ssm2P').onchange = (e) => {
            storageSetBoolean('lt-shortcut-circle', e.target.checked)
            window.tabContext.updateAllWidgets()
        }

        document.getElementById('lt-preference-wPBCA').value = storage.getItem('lt-bgSource') || "1"
        document.getElementById('lt-preference-wPBCA').onchange = (e) => {
            if (e.target.value === '3') {
                const url = prompt("Image address")
                if (url != null) {
                    window.localStorage.setItem("lt-bgUrl", url)
                } else return e.target.value = storage.getItem('lt-bgSource') || "1"
            }
            storage.setItem('lt-bgSource', e.target.value)
            window.tabContext.updateBackground()
        }

        document.getElementById('lt-preference-emvci').value = window.tabContext.getBackgroundOpacity() * 100
        const handleBackgroundOpacityChange = (val) => window.tabContext.setBackgroundOpacity(val / 100)
        document.getElementById('lt-preference-emvci').onchange = (e) => handleBackgroundOpacityChange(e.target.value)
        document.getElementById('lt-preference-emvci').oninput = (e) => handleBackgroundOpacityChange(e.target.value)

        document.getElementById('lt-preference-8QFSB').onclick = () => {
            const exportData = { }
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i)
                exportData[key] = storage.getItem(key)
            }
            download(JSON.stringify(exportData), "launcher-tab_export.json", "application/json")
        }
        document.getElementById('lt-preference-lEZUZ').onclick = () => {
            requestFileOpen().then(data => {
                let importObject
                try {
                    importObject = JSON.parse(data)
                } catch (e) {
                    console.warn(`Failed to import settings from selected file: ${e}`)
                }
                for (const key in importObject) {
                    if (!importObject.hasOwnProperty(key)) continue

                    storage.setItem(key, importObject[key])
                }
                document.location.reload()
            })
        }
    }

    // configure preferences menu
    document.getElementById('lt-control-option-pref-open').onclick = () => {
        document.getElementById('lt-preferences').classList.add('open')
        loadOptionMenuItems()
    }
    document.getElementById('lt-control-option-pref-close').onclick =
        () => document.getElementById('lt-preferences').classList.remove('open')
    document.getElementById('lt-control-option-reload').onclick = () => window.tabContext.rebuildLayout()
    document.getElementById('lt-control-option-add-widget').onclick = () => {
        const url = prompt("Enter link address")
        if (url === null) return
        const label = prompt("Enter label")
        if (label === null) return

        window.tabContext.createWidget(LinkWidget, {label: label, rel: url},
            undefined, undefined, 1, 1)
        window.tabContext.saveLayout()
    }
    console.log(`[launcher-tab] Page has been loaded in ${Math.round(performance.now())} ms`)
})()
