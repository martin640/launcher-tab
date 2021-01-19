const store = chrome.storage.sync
const storage = window.localStorage
let widgetIdPool = 0

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
    const layoutStateSaved = storage.getItem('layoutState')
    if (!layoutStateSaved || !(layoutState = JSON.parse(layoutStateSaved))) {
        layoutState = [
            {type: "ClockWidget", id: ++widgetIdPool, layout: {pX: 0, pY: 0, w: 0, h: 3, rW: -1}}
        ]
        for (let i = 0; i < 10; i++) {
            layoutState.push({
                type: "LinkWidget",
                id: ++widgetIdPool,
                extra: {topSiteNum: i},
                layout: {pX: undefined, pY: undefined, w: 1, h: 1}
            })
        }
        storage.setItem('layoutState', JSON.stringify(layoutState))
    }

    // attach saved widgets
    for (let i = 0; i < layoutState.length; i++) {
        const row = layoutState[i]
        const targetClass = widgetClasses[row.type]
        if (!targetClass) {
            console.warn(`Failed to inflate saved widget: Widget type ${row.type} not found`)
            continue
        }

        const w = window.tabContext.createWidget(targetClass, row.extra,
            row.layout.pX, row.layout.pY, row.layout.w, row.layout.h, row.layout.rW, row.layout.rH)
        if (row.id) w.id = row.id
    }

    // load top sites into placeholder widgets
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

    window.tabContext.saveLayout = (widgets) => {
        layoutState = []
        for (let i = 0; i < widgets.length; i++) {
            const w = widgets[i]
            if (w.id) {
                layoutState.push({
                    type: w.__proto__.constructor.name,
                    id: w.id,
                    extra: w.extra,
                    layout: w.layout.abstract
                })
            }
        }
        storage.setItem('layoutState', JSON.stringify(layoutState))
    }

    const loadOptionMenuItems = () => {
        document.getElementById('lt-preference-HcX4j').checked = false
        document.getElementById('lt-preference-HcX4j').onchange = (e) => {
            storage.setItem('auto-shortcuts', e.target.checked ? 'true' : 'false')
            document.location.reload()
        }

        document.getElementById('lt-preference-v3i7X').checked = window.tabContext.debugEnabled
        document.getElementById('lt-preference-v3i7X').onchange = (e) => {
            window.tabContext.debugEnabled = e.target.checked
            storage.setItem('root-debug-enabled', e.target.checked ? 'true' : 'false')
            window.tabContext.updateDebugWidget()
        }

        document.getElementById('lt-preference-ssm2P').checked = storage.getItem('shortcut-circle') === 'true'
        document.getElementById('lt-preference-ssm2P').onchange = (e) => {
            storage.setItem('shortcut-circle', e.target.checked ? 'true' : 'false')
            window.tabContext.updateAllWidgets()
        }

        document.getElementById('lt-preference-wPBCA').value = storage.getItem('bgSource') || "1"
        document.getElementById('lt-preference-wPBCA').onchange = (e) => {
            storage.setItem('bgSource', e.target.value)
            window.tabContext.updateBackground()

            if (e.target.value === '3') {
                const input = document.createElement('input')
                input.type = 'file'
                input.onchange = e => {
                    const file = e.target.files[0];
                    const reader = new FileReader();
                    reader.readAsDataURL(file)

                    reader.onload = readerEvent => {
                        const content = readerEvent.target.result
                        console.log(content)
                        window.localStorage.setItem("bgUrl", content)
                        window.tabContext.updateBackground()
                    }

                }
                input.click()
            }
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
    /*document.getElementById('options-menu-edit').onclick = () => {
        // todo: use this to toggle resize mode
        window.tabContext.setEditModeActive(!window.tabContext.editMode)
        document.getElementById('options-menu-edit').classList.toggle("active", window.tabContext.editMode)
    }*/
})()
