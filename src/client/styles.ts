const STYLE_ID = '@nirvana-jie/dsh-session-tree'

const CSS = `
.dst-view,
.dst-view * {
  box-sizing: border-box;
}

.dst-view {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
  font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
}

.dst-toolbar {
  display: flex;
  min-height: 64px;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
}

.dst-heading {
  min-width: 0;
}

.dst-heading h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

.dst-heading p {
  max-width: 660px;
  margin: 1px 0 0;
  overflow: hidden;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dst-summary {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 7px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
}

.dst-workspace {
  display: grid;
  flex: 1 1 0;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
  min-height: 0;
  overflow: hidden;
}

.dst-tree-panel,
.dst-detail {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
}

.dst-tree-panel {
  border-right: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-base);
}

.dst-detail {
  background: var(--dsw-alias-bg-base);
}

.dst-pane-header {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 12px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}

.dst-pane-header h2 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-s-strong-14);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dst-pane-header span {
  overflow: hidden;
  color: var(--dsw-alias-label-caption);
  font-size: 11px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dst-pane-scroll,
.dst-detail-scroll {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding-bottom: calc(var(--dsh-composer-height, 152px) + 16px);
}

.dst-pane-scroll {
  padding-top: 8px;
  padding-right: 12px;
  padding-left: 12px;
}

.dst-tree,
.dst-tree ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.dst-tree ul {
  position: relative;
  margin-left: 14px;
  padding-left: 24px;
}

.dst-tree ul::before {
  position: absolute;
  top: 0;
  bottom: 26px;
  left: 0;
  width: 1px;
  background: var(--dsw-alias-border-l2);
  content: "";
}

.dst-tree li {
  position: relative;
  padding: 2px 0;
}

.dst-tree ul > li::before {
  position: absolute;
  top: 27px;
  left: -24px;
  width: 24px;
  height: 1px;
  background: var(--dsw-alias-border-l2);
  content: "";
}

.dst-node {
  position: relative;
  display: grid;
  width: 100%;
  min-height: 50px;
  grid-template-columns: 14px 28px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 5px 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: inherit;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.dst-node-disclosure {
  display: inline-flex;
  width: 14px;
  height: 14px;
  align-items: center;
  justify-content: center;
  color: var(--dsw-alias-label-tertiary);
  transition: transform 120ms ease;
}

.dst-node-disclosure[data-tree-toggle] {
  cursor: pointer;
}

.dst-node-disclosure[data-expanded="true"] {
  transform: rotate(90deg);
}

.dst-node:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.dst-node:active,
.dst-node[data-selected="true"] {
  background: var(--dsw-alias-interactive-bg-active);
}

.dst-node:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: -2px;
}

.dst-node[data-current="true"]::before {
  position: absolute;
  top: 9px;
  bottom: 9px;
  left: -1px;
  width: 2px;
  border-radius: 2px;
  background: var(--dsw-alias-state-business-primary);
  content: "";
}

.dst-node-icon {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-2);
}

.dst-node[data-relation="fork"] .dst-node-icon {
  color: var(--dsw-alias-state-business-primary);
}

.dst-node[data-relation="subagent"] .dst-node-icon {
  color: var(--dsw-alias-state-success-primary);
}

.dst-node-copy {
  min-width: 0;
}

.dst-node-title-line {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 6px;
}

.dst-node-title {
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dst-node-qualifier {
  flex: none;
  color: var(--dsw-alias-label-caption);
  font: 10px/16px var(--ds-font-family-code);
}

.dst-node-meta {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  color: var(--dsw-alias-label-caption);
  font-size: 11px;
  line-height: 16px;
}

.dst-detail-scroll {
  padding: 12px 16px calc(var(--dsh-composer-height, 152px) + 16px);
}

.dst-detail-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.dst-status-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
}

.dst-facts {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 6px 10px;
  margin: 12px 0 0;
  padding-top: 12px;
  border-top: 1px solid var(--dsw-alias-border-l2);
}

.dst-fact {
  display: contents;
}

.dst-fact dt {
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
  line-height: 17px;
}

.dst-fact dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxs-12);
  line-height: 17px;
}

.dst-fact code {
  color: inherit;
  font: 11px/17px var(--ds-font-family-code);
}

.dst-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.dst-feedback {
  margin: 8px 0 0;
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
}

.dst-state {
  display: grid;
  min-height: 240px;
  place-items: center;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}

@media (max-width: 820px) {
  .dst-toolbar {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .dst-heading p {
    white-space: normal;
  }

  .dst-workspace {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(320px, 1fr) auto;
    overflow: auto;
  }

  .dst-tree-panel {
    min-height: 320px;
    border-right: 0;
    border-bottom: 1px solid var(--dsw-alias-border-l2);
  }

  .dst-detail {
    min-height: 360px;
  }
}

@media (max-width: 520px) {
  .dst-toolbar {
    padding: 10px 14px;
  }

  .dst-summary {
    gap: 5px;
    white-space: normal;
  }

  .dst-pane-scroll {
    padding-right: 8px;
    padding-left: 8px;
  }

  .dst-tree ul {
    margin-left: 8px;
    padding-left: 16px;
  }

  .dst-tree ul > li::before {
    left: -16px;
    width: 16px;
  }

  .dst-detail-scroll {
    padding-right: 14px;
    padding-left: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dst-node-disclosure {
    transition: none;
  }

  .dst-view [data-state="ongoing"] rect {
    animation: none !important;
  }
}
`

/** Install the plugin stylesheet into the DSH document and return its disposer. */
export function installStyles(): () => void {
  if (typeof document === 'undefined') return () => {}
  const previous = document.querySelector(`style[data-plugin=${JSON.stringify(STYLE_ID)}]`)
  if (previous !== null) return () => {}
  const style = document.createElement('style')
  style.dataset.plugin = STYLE_ID
  style.textContent = CSS
  document.head.append(style)
  return () => { style.remove() }
}
