class Widget {
    constructor(context, data) {
        this.__context = context
        this.__state = data
    }

    /**
     * @returns {Object} object containing widget's layout information
     */
    get layout() {
        return {...this.__state.layout}
    }

    /**
     * @returns {Element} reference to DOM element directly attached to the grid. Widget should not manipulate with this element.
     */
    get topContainer() {
        return this.__state.topContainer
    }

    get extra() {
        return this.__state.extra
    }

    /**
     * Widget should call this function whenever its state changes and needs to be updated.
     * API automatically decides whether {@link update} gets called or not.
     */
    invalidate() {
        if (this.__state.attached) {
            this.__context._notifyRender(this)
            this.update(this.__state.nestedContainer, this.__state.extra)
        } else console.warn(`Skipping update of widget because is not attached to the layout`)
    }

    /**
     * This function usually gets called by API when user requests to reload layout.
     */
    reset() {
        if (this.__state.attached) {
            this.unload()
            this.__state.nestedContainer.innerHTML = ''
            this.prepareLayout(this.__state.nestedContainer, this.__state.extra)
            this.update(this.__state.nestedContainer, this.__state.extra)
        }
    }

    changeLayout(data) {
        this.__state.layout.abstract = {...this.__state.layout.abstract, ...data}
        this.measure()
    }

    measure() {
        if (this.__state.attached) {
            const a = this.__state.layout.abstract
            const b = this.__state.layout.measured
            const c = this.__state.topContainer
            const xIsRelative = !a.w && a.rW
            const yIsRelative = !a.h && a.rH

            b.h = yIsRelative ? (this.__context.gridSizeInfo.rows + a.rH + a.pY + 1) : a.h
            b.w = xIsRelative ? (this.__context.gridSizeInfo.columns + a.rW + a.pX + 1) : a.w

            if ((typeof a.pX === 'undefined') || (typeof a.pY === 'undefined')) {
                // todo find position for widget automatically
                b.x = 0
                b.y = 0
            } else {
                b.x = a.pX
                b.y = a.pY
            }

            let gridArea = ''
            gridArea += String(b.y+1)
            gridArea += ' / '
            gridArea += String(b.x+1)
            gridArea += ' / '
            gridArea += yIsRelative ? String(a.rH) : `span ${a.h}`
            gridArea += ' / '
            gridArea += xIsRelative ? String(a.rW) : `span ${a.w}`

            c.style.gridArea = gridArea
        }
    }

    /**
     * Called after constructing widget. Widget should create its layout here.
     * @see update
     */
    prepareLayout(container, extra) {
        throw "Widget.prepareLayout() got called. This error may originate from widget accidentally calling super function or not overriding prepareLayout() at all."
    }

    /**
     * Called when widget is attached to the layout or when is invalidated.
     * @param container nested element inside widgets main container. Widget can freely manipulate with this container.
     * @param extra extra data object originally passed while attaching to the layout
     */
    update(container, extra) {
        throw "Widget.update() got called. This error may originate from widget accidentally calling super function or not overriding update() at all."
    }

    /**
     * Called when widget is being destroyed or reset. Widget should cancel all pending tasks here.
     * Widget should not make any further changes to DOM because API will automatically remove elements.
     */
    unload() { }
}

class TabContext {
    constructor() {
        this.storage = window.localStorage

        this.gridSizeInfo = {
            width: -1, height: -1,
            columns: Number(this.storage.getItem('cache-grid-x') || -1),
            rows: Number(this.storage.getItem('cache-grid-y') || -1)
        }
        this.widgets = []
        this.renderStats = {
            counter: 0, counterSnapshot: 0,
            start: Date.now()
        }
        this.debugEnabled = this.storage.getItem('root-debug-enabled') === 'true'
        this.debugAlt = false
        this.mainGrid = document.getElementById('ref-lay-grid')
        this.sampleGrid = document.getElementById('ref-lay-grid-copy')
        this.updateBackground()
        this.onLayoutParamsChange = () => {}
        this.saveLayout = () => {}

        const reloadLayout = () => this.probeLayoutInfo().then(() => this.updateDebugWidget())
        document.onload = window.onresize = reloadLayout
        setTimeout(reloadLayout, 100)

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
                w.topContainer.style.outline = "2px dashed #00FF91"
                w.topContainer.style.backgroundColor = "#00FF9133"
            }
        }
        debugEl.onmouseleave = () => {
            this.debugAlt = false
            for (let i = 0; i < this.widgets.length; i++) {
                const w = this.widgets[i]
                w.topContainer.style.outline = ""
                w.topContainer.style.backgroundColor = ""
            }
        }
    }

    _notifyRender(src) {
        this.renderStats.counter++
        if (this.debugAlt) {
            if (src.__tmp_timer_id) clearTimeout(src.__tmp_timer_id)
            src.topContainer.style.outline = "2px dashed #FF00D5"
            src.__tmp_timer_id = setTimeout(() => {
                src.__tmp_timer_id = undefined
                if (this.debugAlt) {
                    src.topContainer.style.outline = "2px dashed #00FF91"
                } else {
                    src.topContainer.style.outline = ""
                    src.topContainer.style.backgroundColor = ""
                }
            }, 150)
        }
        this.updateDebugWidget()
    }

    updateBackground() {
        const dom = document.getElementById("bgimg")
        const attribute = document.getElementById("status-info")
        const storage = this.storage
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
            const fetchFromPicsum = async () => {
                const res = await fetch('https://picsum.photos/1900/900')

                const selectedImage = res.url
                if (!selectedImage || selectedImage.includes("404") || selectedImage.includes("error")) {
                    return error()
                }
                const imgId = /id\/(.+?)\//g.exec(selectedImage)[1]
                const info = await (await fetch(`https://picsum.photos/id/${imgId}/info`)).json()

                return {src: selectedImage, attribution: `<a href="${info.url}">Photo by ${info.author} on Unsplash</a>`}
            }
            const fetchFromGEarth = async () => {
                const idsList = (await (await fetch(`/res/gearthids.json`)).json()).ids
                if (!Array.isArray(idsList)) return error()
                const randomId = idsList[Math.floor(Math.random() * idsList.length)]

                return {
                    src: `https://www.gstatic.com/prettyearth/assets/full/${randomId}.jpg`,
                    attribution: `<a href="https://earth.google.com/web/">Photo from Google Earth</a>`
                }
            }

            const preferredSource = storage.getItem("bgSource")
            let bgPromise
            if (!preferredSource || preferredSource === '1')
                bgPromise = fetchFromGEarth()
            if (preferredSource === '2')
                bgPromise = fetchFromPicsum()

            bgPromise.then(res => {
                dom.style.backgroundImage = `url(${res.src})`
                attribute.innerHTML = res.attribution
            }).catch(error)
        }
    }

    async probeLayoutInfo() {
        const computedStyle = window.getComputedStyle(this.mainGrid)
        const old = {...this.gridSizeInfo}
        this.gridSizeInfo.width = this.mainGrid.clientWidth
        this.gridSizeInfo.height = this.mainGrid.clientHeight
        this.gridSizeInfo.columns = computedStyle.gridTemplateColumns.split(" ").length
        this.gridSizeInfo.rows = computedStyle.gridTemplateRows.split(" ").length
        // cache grid size for faster loading
        this.storage.setItem("cache-grid-x", String(this.gridSizeInfo.columns))
        this.storage.setItem("cache-grid-y", String(this.gridSizeInfo.rows))

        for (let i = 0; i < this.widgets.length; i++) {
            this.widgets[i].measure()
        }

        this.sampleGrid.innerHTML = ''
        for (let a = 0; a < this.gridSizeInfo.columns; a++) {
            for (let b = 0; b < this.gridSizeInfo.rows; b++) {
                const sampleItem = document.createElement("div")
                sampleItem.style.gridArea = `${b+1} / ${a+1} / span 1 / span 1`
                sampleItem.style.border = "1px dashed #ffffff55"
                this.sampleGrid.appendChild(sampleItem)
            }
        }

        this.onLayoutParamsChange(old, {...this.gridSizeInfo})
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
     * @returns {boolean|Widget} returns constructed widget of false on error
     */
    createWidget(constructor, extra, pX, pY, w, h, w1 = 0, h1 = 0) {
        try {
            const topContainer = document.createElement("div")
            const nestedContainer = document.createElement("div")
            const widgetData = {
                layout: {
                    abstract: {pX, pY, w, h, rW: w1, rH: h1},
                    measured: {w: 0, h: 0}
                },
                topContainer: topContainer,
                nestedContainer: nestedContainer,
                attached: true,
                extra: extra || {}
            }

            const widget = new constructor(this, widgetData)
            if (widget) {
                this.widgets.push(widget)

                widget.measure()
                nestedContainer.style.width = "100%"
                nestedContainer.style.height = "100%"

                topContainer.appendChild(nestedContainer)
                this.mainGrid.appendChild(topContainer)

                widget.prepareLayout(nestedContainer, widgetData.extra)
                widget.update(nestedContainer, widgetData.extra)

                this.updateDebugWidget()
                return widget

            } else return false
        } catch (e) {
            console.error(`Unhandled error while creating widget: ${e}`)
            return false
        }
    }

    setEditModeActive(b) {
        this.editMode = b

        if (this.editMode) {
            for (let i = 0; i < this.widgets.length; i++) {
                const w = this.widgets[i]
                this._registerContainerAsDragView(w)
            }
        } else {
            for (let i = 0; i < this.widgets.length; i++) {
                const c = this.widgets[i].topContainer
                c.onmousedown = undefined
                c.style.border = ""
            }
        }
    }

    _getNewLayoutParams(top, left) {
        const pxPerColumn = this.gridSizeInfo.width / this.gridSizeInfo.columns
        const pxPerRow = this.gridSizeInfo.height / this.gridSizeInfo.rows
        const newPosX = Math.floor((left / pxPerColumn) + 0.5)
        const newPosY = Math.floor((top / pxPerRow) + 0.5)
        return {
            pX: Math.max(Math.min(newPosX, this.gridSizeInfo.width), 0),
            pY: Math.max(Math.min(newPosY, this.gridSizeInfo.height), 0),
        }
    }

    _registerContainerAsDragView(widget) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0
        let posX = 0, posY = 0, gridPosition = "", newParams
        const el = widget.topContainer

        const closeDragElement = () => {
            document.onmouseup = null
            document.onmousemove = null

            el.style.width = ""
            el.style.height = ""
            el.style.border = "2px dashed #C8C8C8"
            el.style.backgroundColor = ""
            el.style.position = ""
            el.style.top = ""
            el.style.left = ""
            if (newParams) {
                widget.changeLayout(newParams)
                this.saveLayout(this.widgets)
            }
            else el.style.gridArea = gridPosition
            this.sampleGrid.style.display = "none"
        }
        const elementDrag = (e) => {
            e.preventDefault()
            pos1 = e.clientX - pos3
            pos2 = e.clientY - pos4
            const a1 = posY + pos2
            const a2 = posX + pos1
            el.style.top = a1 + "px"
            el.style.left = a2 + "px"

            // todo highlight rows and columns where widget will be placed
            newParams = this._getNewLayoutParams(a1, a2)
        }

        el.style.border = "2px dashed #C8C8C8"
        el.onmousedown = (e) => {
            e.preventDefault()
            pos3 = e.clientX
            pos4 = e.clientY
            posX = el.offsetLeft
            posY = el.offsetTop

            el.style.width = el.clientWidth + "px"
            el.style.height = el.clientHeight + "px"
            el.style.border = "2px solid #FF0000"
            el.style.backgroundColor = "#FF000022"
            el.style.position = "absolute"
            // reset position within grid to place widget on top left corner of grid
            gridPosition = el.style.gridArea
            el.style.gridArea = ""

            this.sampleGrid.style.display = "grid"
            document.onmouseup = closeDragElement
            document.onmousemove = elementDrag
            elementDrag(e)
        }
    }

    /**
     * Calls update on all widgets effectively updating entire grid
     */
    updateAllWidgets() {
        for (let i = 0; i < this.widgets.length; i++) {
            this.widgets[i].invalidate()
        }
    }

    /**
     * Destroys all widgets and recreates them with same parameters as they were created
     */
    rebuildLayout() {
        for (let i = 0; i < this.widgets.length; i++) {
            const og = this.widgets[i]
            const constructor = og.__proto__.constructor
            og.reset()
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
