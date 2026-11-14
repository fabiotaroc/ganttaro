import {
  createChange,
  createConnect,
  createInlineEdit,
  createReorder,
  createSpans,
  definePrimitive,
  type ChangeDetails,
  type ConnectDraft,
  type ReorderDraft,
  type Span,
  type SpansDraft,
} from "@ui-sdk/core"

export type GanttItem = Span & {
  name: string
  after: string[]
}

export type GanttOptions = {
  defaultItems?: GanttItem[]
  defaultOrder?: string[]
  days?: number
  onItemsChange?: (value: GanttItem[], details: ChangeDetails<string>) => void
  onOrderChange?: (value: string[], details: ChangeDetails<string>) => void
}

function createsCycle(items: GanttItem[], id: string, after: string): boolean {
  const byId = new Map(items.map((item) => [item.id, item]))
  const stack = [after]
  const seen = new Set<string>()
  while (stack.length) {
    const current = stack.pop()!
    if (current === id) return true
    if (seen.has(current)) continue
    seen.add(current)
    stack.push(...(byId.get(current)?.after ?? []))
  }
  return false
}

export function conflicts(items: GanttItem[]): Set<string> {
  const byId = new Map(items.map((item) => [item.id, item]))
  const out = new Set<string>()
  for (const item of items) {
    for (const dep of item.after) {
      const upstream = byId.get(dep)
      if (upstream && item.start < upstream.end) out.add(item.id)
    }
  }
  return out
}

const gantt = definePrimitive({
  name: "gantt",
  options: {
    defaultItems: "value",
    defaultOrder: "list",
    days: "number",
    onItemsChange: "callback",
    onOrderChange: "callback",
  },
  state: (options: GanttOptions) => ({
    items: options.defaultItems ?? [],
    order: options.defaultOrder ?? (options.defaultItems ?? []).map((item) => item.id),
    days: options.days ?? 40,
    draft: null as SpansDraft<GanttItem> | null,
    moving: null as ReorderDraft | null,
    connecting: null as ConnectDraft | null,
    editing: null as string | null,
  }),
  api: (context) => {
    const change = createChange(context)
    const items = () => context.store.get().items
    const find = (ref: string) =>
      items().find((item) => item.id === ref) ??
      items().find((item) => item.name.toLowerCase() === ref.toLowerCase())
    const setItems = (next: GanttItem[], reason: string, event?: Event) =>
      change("items", next, { reason, event })
    const patch = (id: string, fields: Partial<GanttItem>, reason: string) =>
      setItems(
        items().map((item) => (item.id === id ? { ...item, ...fields } : item)),
        reason,
      )

    const spans = createSpans<ReturnType<typeof context.store.get>, GanttItem>(context, {
      key: "items",
      draft: "draft",
      axis: "x",
      min: () => 0,
      max: () => context.store.get().days,
      step: () => 1,
      minSize: () => 1,
      label: (item) => item.name,
      set: (value, details) =>
        change(
          "items",
          value.map((item) => (item.track === item.id ? item : { ...item, track: item.id })),
          details,
        ),
    })

    const reorder = createReorder(context, {
      slot: "label",
      key: "order",
      draft: "moving",
      orientation: () => "vertical",
      label: (id) => find(id)?.name,
      set: (value, details) => change("order", value, details),
    })

    const addDependency = (itemRef: string, afterRef: string) => {
      const item = find(itemRef)
      const upstream = find(afterRef)
      if (!item || !upstream) throw new Error(`Unknown item: ${!item ? itemRef : afterRef}`)
      if (item.id === upstream.id) throw new Error("An item can't depend on itself")
      if (item.after.includes(upstream.id)) return false
      if (createsCycle(items(), item.id, upstream.id))
        throw new Error(`${item.name} after ${upstream.name} would create a loop`)
      return patch(item.id, { after: [...item.after, upstream.id] }, "connect")
    }

    const connect = createConnect(context, {
      slot: "port",
      draft: "connecting",
      canConnect: (from, to) => {
        if (!from.endsWith(":out") || !to.endsWith(":in")) return false
        const upstream = from.slice(0, -4)
        const downstream = to.slice(0, -3)
        return upstream !== downstream && !createsCycle(items(), downstream, upstream)
      },
      point: (x, y) => {
        const grid = context.element("grid")
        const rect = grid?.getBoundingClientRect()
        return rect ? { x: x - rect.left, y: y - rect.top } : { x, y }
      },
      label: (port) => `${find(port.split(":")[0])?.name ?? port} ${port.endsWith(":out") ? "end" : "start"}`,
      connect: (from, to) => addDependency(to.slice(0, -3), from.slice(0, -4)),
    })

    const edit = createInlineEdit(context, {
      key: "editing",
      value: (id) => find(id)?.name ?? "",
      commit: (id, text) => (text.trim() ? patch(id, { name: text.trim() }, "rename") : false),
    })

    return {
      spans,
      reorder,
      connect,
      edit,
      setDates(itemRef: string, start: number, end: number) {
        const item = find(itemRef)
        if (!item) throw new Error(`Unknown item: ${itemRef}`)
        if (end <= start) throw new Error("The end must be after the start")
        return spans.update(item.id, { start, end })
      },
      rename(itemRef: string, name: string) {
        const item = find(itemRef)
        if (!item) throw new Error(`Unknown item: ${itemRef}`)
        return patch(item.id, { name }, "rename")
      },
      remove(itemRef: string) {
        const item = find(itemRef)
        if (!item) throw new Error(`Unknown item: ${itemRef}`)
        return setItems(
          items()
            .filter((other) => other.id !== item.id)
            .map((other) => ({ ...other, after: other.after.filter((dep) => dep !== item.id) })),
          "remove-press",
        )
      },
      addDependency,
      removeDependency(itemRef: string, afterRef: string) {
        const item = find(itemRef)
        const upstream = find(afterRef)
        if (!item || !upstream) throw new Error(`Unknown item: ${!item ? itemRef : afterRef}`)
        return patch(item.id, { after: item.after.filter((dep) => dep !== upstream.id) }, "disconnect")
      },
      allItems: () =>
        items().map((item) => ({
          value: item.id,
          label: item.name,
          start: item.start,
          end: item.end,
          after: item.after,
        })),
    }
  },
  slots: (slot) => ({
    root: slot({
      attrs: () => ({ role: "group" }),
      state: (state) => ({
        items: state.draft?.spans ?? state.items,
        order: state.moving?.order ?? state.order,
        editing: state.editing,
        connecting: state.connecting,
      }),
    }),
    grid: slot({ attrs: () => ({}) }),
    label: slot<{ value: string }>({
      props: { value: "string" },
      attrs: (state, part) => ({
        role: "button",
        tabindex: "0",
        "data-moving": part.api.reorder.moving(state, part.key) ? "" : undefined,
      }),
      on: {
        keydown: (event, { api, key }) => {
          api.reorder.keydown(event, key) || api.edit.keydown(event, key)
        },
        pointerdown: (event, { api, key }) => api.reorder.pointerdown(event, key),
        dblclick: (event, { api, key }) => api.edit.dblclick(event, key),
      },
      bind: (el, part) => part.api.reorder.bind(el, part),
    }),
    input: slot({
      on: {
        keydown: (event, { api }) => api.edit.inputKeydown(event),
        focusout: (event, { api }) => api.edit.end("focus-out", event),
      },
      bind: (el, { api }) => api.edit.bindInput(el as HTMLInputElement),
    }),
    track: slot<{ value: string }>({
      props: { value: "string" },
      bind: (el, { api, key }) => api.spans.bindTrack(el, key),
    }),
    bar: slot<{ value: string }>({
      props: { value: "string" },
      attrs: (state, part) => ({
        tabindex: "0",
        ...part.api.spans.spanAttrs(state, part.key),
        "data-conflict": conflicts(state.items).has(part.key) ? "" : undefined,
      }),
      on: {
        pointerdown: (event, { api, key }) => {
          if ((event.target as HTMLElement).closest("[data-slot='gantt-port']")) return
          api.spans.spanPointerdown(event, key)
        },
        keydown: (event, { api, key }) => api.spans.keydown(event, key),
      },
      bind: (el, { api, key }) => api.spans.bindSpan(el, key),
    }),
    port: slot<{ value: string }>({
      props: { value: "string" },
      attrs: (state, part) => ({
        "aria-hidden": "true",
        "data-connect": part.api.connect.role(state, part.key),
      }),
      on: {
        pointerdown: (event, { el, api, key }) => {
          event.stopPropagation()
          if (el) api.connect.pointerdown(event, key, el)
        },
      },
    }),
  }),
  agent: {
    actions: ["setDates", "rename", "remove", "addDependency", "removeDependency"],
    items: (api) => api.allItems(),
  },
})

export { gantt }
