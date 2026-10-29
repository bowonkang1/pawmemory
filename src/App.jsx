import { useEffect, useRef, useState } from 'react'
import './App.css'

const PET = {
  id: 'momo',
  name: 'Momo',
  breed: 'Golden Retriever',
  age: '4 years old',
}

const DEMO_QUESTION =
  "I'm leaving Momo with Sarah for three days. What should Sarah know about Momo?"

const ASK_EXAMPLES = [
  {
    label: 'Caregiver brief',
    prompt:
      "I'm leaving Momo with Sarah for a few days. What should Sarah know about Momo, including her routine, preferences, comfort, and their previous experiences together?",
  },
  {
    label: 'Recent changes',
    prompt:
      "What has changed recently in Momo's routines, behavior, relationships, or experiences based on what you remember?",
  },
  {
    label: 'Vet visit summary',
    prompt:
      'Prepare a concise summary of recent observations about Momo that could be useful for a vet visit. Separate remembered observations from interpretation and do not provide a medical diagnosis.',
  },
]

const EXAMPLE_MEMORY =
  'Momo met Coco again today at Central Park. They played together for 30 minutes, and Momo was very excited to see Coco.'

const ROUTINE = [
  { time: '8:00 AM', dateTime: '08:00', label: 'Breakfast' },
  { time: '9:00 AM', dateTime: '09:00', label: 'Morning walk' },
  { time: '6:00 PM', dateTime: '18:00', label: 'Dinner' },
  { time: '7:00 PM', dateTime: '19:00', label: 'Evening walk' },
]

const FAVORITES = [
  'Loves chicken treats',
  'Favorite toy: yellow tennis ball',
  'Dislikes carrots',
]

const RELATIONSHIP = [
  {
    id: 'sarah-june',
    when: 'June 2026',
    text: "Momo was nervous and hid near the bedroom during Sarah's first visit.",
  },
  {
    id: 'sarah-july',
    when: 'July 2026',
    text: 'Momo became more comfortable and played with her yellow tennis ball.',
  },
  {
    id: 'sarah-september',
    when: 'September 2026',
    text: 'Momo greeted Sarah at the door and was excited to see her.',
  },
]

const CAREGIVER_BRIEF = {
  audience: 'Sarah',
  connectedCount: RELATIONSHIP.length,
  summary: 'Momo has grown increasingly comfortable with Sarah over time.',
  sources: ['Routine', 'Preferences', 'Sarah', 'Past experiences'],
}

const INITIAL_MEMORIES = [
  {
    id: 'routine',
    type: 'Routine',
    when: 'Ongoing',
    text: 'Breakfast at 8:00 AM, morning walk at 9:00 AM, dinner at 6:00 PM, and evening walk at 7:00 PM.',
  },
  {
    id: 'preferences',
    type: 'Preferences',
    when: 'Ongoing',
    text: 'Loves chicken treats. Favorite toy: yellow tennis ball. Dislikes carrots.',
  },
  ...RELATIONSHIP.map((memory) => ({
    id: memory.id,
    type: 'Sarah',
    when: memory.when,
    text: memory.text,
  })),
]

const VIEWS = [
  { id: 'ask', label: 'Ask PawMemory' },
  { id: 'add', label: 'Add Memory' },
  { id: 'memories', label: 'Memories' },
]

const CHAT_URL = '/api/agents/pawmemory-agent-for-a-pet-personal-brain/chat'
const MEMORY_SESSION_ID = 'pawmemory-ui-memory'
const UNAVAILABLE_MESSAGE = "PawMemory can't reach the Personal Brain right now."
const INCOMPLETE_MESSAGE = "PawMemory couldn't finish this answer."
const MEMORY_ERROR = "PawMemory couldn't add this memory right now."

// Streams a ClawMax chat turn. Deltas append; a complete event replaces them with the final text.
async function streamAgentChat({ message, sessionId, onText }) {
  let response
  try {
    response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId }),
    })
  } catch {
    throw new Error(UNAVAILABLE_MESSAGE)
  }

  if (!response.ok || !response.body) {
    throw new Error(UNAVAILABLE_MESSAGE)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let answer = ''
  let completed = false

  const applyEvent = (rawEvent) => {
    const event = parseSseEvent(rawEvent)
    if (!event) return

    if (event.type === 'delta') {
      const chunk = typeof event.data?.text === 'string' ? event.data.text : ''
      if (!chunk) return
      answer += chunk
      onText?.(answer)
      return
    }

    if (event.type === 'complete') {
      completed = true
      const finalText = typeof event.data?.text === 'string' ? event.data.text : ''
      if (!finalText.trim()) return
      answer = finalText
      onText?.(answer)
      return
    }

    if (event.type === 'error') {
      throw new Error(INCOMPLETE_MESSAGE)
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      buffer = buffer.replace(/\r\n/g, '\n')

      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        applyEvent(buffer.slice(0, boundary))
        buffer = buffer.slice(boundary + 2)
        boundary = buffer.indexOf('\n\n')
      }
    }

    buffer += decoder.decode()
    if (buffer.trim()) applyEvent(buffer)
  } finally {
    reader.cancel().catch(() => {})
  }

  return { text: answer, completed }
}

async function askPawMemory({ question, onText }) {
  const sessionId = `pawmemory-ui-demo-${Date.now()}`
  const result = await streamAgentChat({
    message: question,
    sessionId,
    onText,
  })
  return result.text
}

function parseSseEvent(rawEvent) {
  const dataLines = []

  for (const line of rawEvent.split('\n')) {
    if (!line || line.startsWith(':')) continue
    if (!line.startsWith('data:')) continue
    dataLines.push(line.slice(5).replace(/^ /, ''))
  }

  if (dataLines.length === 0) return null

  try {
    return JSON.parse(dataLines.join('\n'))
  } catch {
    return null
  }
}

async function rememberMemory({ text }) {
  const result = await streamAgentChat({
    message: `Please remember this about Momo: ${text}`,
    sessionId: MEMORY_SESSION_ID,
  })

  if (!result.completed) {
    throw new Error(MEMORY_ERROR)
  }

  return {
    id: `memory-${Date.now()}`,
    type: 'Experience',
    when: 'Just added',
    text,
  }
}

function PawMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="8" cy="9.5" r="3.05" fill="currentColor" />
      <circle cx="14.6" cy="6.2" r="3.15" fill="currentColor" />
      <circle cx="21.2" cy="7.4" r="3.05" fill="currentColor" />
      <circle cx="25.4" cy="13" r="2.55" fill="currentColor" />
      <ellipse cx="15.6" cy="20.2" rx="7.1" ry="5.5" fill="currentColor" />
    </svg>
  )
}

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="7" cy="16" r="2.3" fill="currentColor" />
      <circle cx="16" cy="16" r="2.3" fill="currentColor" />
      <circle cx="25" cy="16" r="2.3" fill="currentColor" />
      <path
        d="M9.3 16h4.4M18.3 16h4.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconAsk() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 7.25h12a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H9.2L6 18.5V16a1 1 0 0 1-1-1V8.25a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconAdd() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 6.5v11M6.5 12h11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconMemories() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 7.5h10M7 12h10M7 16.5h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

const NAV_ICONS = {
  ask: IconAsk,
  add: IconAdd,
  memories: IconMemories,
}

function FlowJoin() {
  return (
    <div className="flowJoin" aria-hidden="true">
      <svg viewBox="0 0 16 22">
        <path d="M8 1v14" fill="none" stroke="currentColor" strokeWidth="1.25" />
        <path
          d="M4 12.5 8 17l4-4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

function ProvenanceMark() {
  return (
    <svg className="provenanceMark" viewBox="0 0 72 40" aria-hidden="true">
      <path d="M12 8c12 0 16 12 28 12" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M12 20h28" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M12 32c12 0 16-12 28-12" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="10" cy="8" r="2.4" fill="currentColor" />
      <circle cx="10" cy="20" r="2.4" fill="currentColor" />
      <circle cx="10" cy="32" r="2.4" fill="currentColor" />
      <circle cx="50" cy="20" r="5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="50" cy="20" r="1.7" fill="currentColor" />
    </svg>
  )
}

function Sidebar({ view, onNavigate }) {
  const [petMenuOpen, setPetMenuOpen] = useState(false)
  const petPickerRef = useRef(null)

  useEffect(() => {
    if (!petMenuOpen) return undefined

    function onPointerDown(event) {
      if (!petPickerRef.current?.contains(event.target)) setPetMenuOpen(false)
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') setPetMenuOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [petMenuOpen])

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brandMark">
          <BrandMark />
        </div>
        <div>
          <p className="brandName">PawMemory</p>
          <p className="brandTag">Personal Brain for Pets</p>
        </div>
      </div>

      <div className="petPicker" ref={petPickerRef}>
        <button
          type="button"
          className={petMenuOpen ? 'petCard petSelect open' : 'petCard petSelect'}
          aria-expanded={petMenuOpen}
          aria-haspopup="listbox"
          aria-label={`${PET.name}, selected pet`}
          onClick={() => setPetMenuOpen((open) => !open)}
        >
          <div className="petIdentity">
            <div className="avatar" aria-hidden="true">
              <PawMark />
            </div>
            <p className="petName">
              {PET.name}
              <svg className="petCaret" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 6.5 8 10.5 12 6.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </p>
          </div>
          <p className="petMeta">
            {PET.breed} · {PET.age}
          </p>
          <p className="petBrainLabel">Personal Brain</p>
        </button>

        {petMenuOpen && (
          <div className="petMenu" role="listbox" aria-label="Pets">
            <div className="petOption" role="option" aria-selected="true">
              <span className="petCheck" aria-hidden="true">✓</span>
              <span>
                <span className="petOptionName">Momo</span>
                <span className="petOptionMeta">Golden Retriever</span>
              </span>
            </div>
            <button type="button" className="petAdd" onClick={() => setPetMenuOpen(false)}>
              <span aria-hidden="true">+</span>
              Add another pet
            </button>
          </div>
        )}
      </div>

      <nav className="nav" aria-label="PawMemory">
        {VIEWS.map((item) => {
          const Icon = NAV_ICONS[item.id]
          const active = view === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={active ? 'navItem active' : 'navItem'}
              aria-current={active ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <Icon />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="brainStatus">
        <span className="statusDot" aria-hidden="true" />
        <div>
          <p className="brainTitle">Personal Brain</p>
          <p className="brainMeta">Momo's memories, connected over time.</p>
          <p className="brainCognee">Cognee</p>
        </div>
      </div>
    </aside>
  )
}

function MemoryConstellation({ active }) {
  return (
    <div className={active ? 'constellation isConnecting' : 'constellation'} aria-hidden="true">
      <svg viewBox="0 0 360 248">
        <path className="constellationLine" pathLength="1" d="M104 40C128 62 148 90 170 122" />
        <path className="constellationLine" pathLength="1" d="M46 168C86 178 124 158 170 122" />
        <path className="constellationLine" pathLength="1" d="M322 86C276 74 222 96 170 122" />
        <path className="constellationLine" pathLength="1" d="M232 200C210 176 190 150 170 122" />
        <path className="constellationSpark" pathLength="1" d="M104 40C128 62 148 90 170 122" />
        <path className="constellationSpark" pathLength="1" d="M46 168C86 178 124 158 170 122" />
        <path className="constellationSpark" pathLength="1" d="M322 86C276 74 222 96 170 122" />

        <g className="constellationNode people isSoft">
          <circle className="constellationGlow" cx="104" cy="40" r="16" />
          <circle cx="104" cy="40" r="9" />
          <text x="104" y="18" textAnchor="middle">Sarah</text>
        </g>
        <g className="constellationNode routine">
          <circle className="constellationGlow" cx="46" cy="168" r="15" />
          <circle cx="46" cy="168" r="8.5" />
          <text x="72" y="208" textAnchor="middle">Morning walk</text>
        </g>
        <g className="constellationNode moment isSoft">
          <circle className="constellationGlow" cx="322" cy="86" r="16" />
          <circle cx="322" cy="86" r="9" />
          <text x="322" y="62" textAnchor="middle">Coco</text>
        </g>
        <g className="constellationNode place">
          <circle cx="232" cy="200" r="8.5" />
          <text x="232" y="228" textAnchor="middle">Central Park</text>
        </g>

        <g className="constellationCenter">
          <circle className="momoGlow" cx="170" cy="122" r="40" />
          <circle className="momoDisc" cx="170" cy="122" r="26" />
          <g className="momoPaw" transform="translate(158 110) scale(0.74)">
            <circle cx="8" cy="9.5" r="3.05" />
            <circle cx="14.6" cy="6.2" r="3.15" />
            <circle cx="21.2" cy="7.4" r="3.05" />
            <circle cx="25.4" cy="13" r="2.55" />
            <ellipse cx="15.6" cy="20.2" rx="7.1" ry="5.5" />
          </g>
        </g>
      </svg>
    </div>
  )
}

function MemoryFlow({ linking }) {
  return (
    <div className={linking ? 'flowWrap isLinking' : 'flowWrap'}>
      <div className="flow" aria-label="How PawMemory answers">
        <article className="flowCard">
          <p className="flowKicker">Memories across time</p>
          <p className="flowDetail">June · July · September</p>
        </article>
        <FlowJoin />
        <article className="flowCard flowHub">
          <p className="flowKicker">Personal Brain</p>
          <p className="flowDetail">Momo's memories, connected over time.</p>
        </article>
        <FlowJoin />
        <article className="flowCard">
          <p className="flowKicker">One useful answer</p>
          <p className="flowDetail">Ready when you need it.</p>
        </article>
      </div>
    </div>
  )
}

function stripLeadingSessionId(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  let index = 0

  while (index < lines.length && !lines[index].trim()) index += 1
  if (index >= lines.length || !/^session id:\s+\S+/i.test(lines[index].trim())) return text

  index += 1
  while (index < lines.length && !lines[index].trim()) index += 1
  return lines.slice(index).join('\n')
}

// Display-only. Runtime logs sometimes arrive inside the streamed answer and must not be shown.
function isRuntimeDiagnosticLine(line) {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (/^\[plugins\]/i.test(trimmed)) return true
  if (/plugins\.allow is empty/i.test(trimmed)) return true
  if (/discovered non-bundled plugins may auto-load/i.test(trimmed)) return true
  if (/openclaw plugins (?:list|inspect)\b/i.test(trimmed)) return true
  if (/^cognee-openclaw\s*:/i.test(trimmed)) return true
  if (/\bagent registered\b/i.test(trimmed) && /\bconnectionId\b/i.test(trimmed)) return true
  if (/\bconnectionId=/i.test(trimmed)) return true
  if (/^\[provider-transport-fetch\]/i.test(trimmed)) return true
  if (/plugin runtime config\.loadConfig\(\) is deprecated/i.test(trimmed)) return true
  if (/^🦞\s*OpenClaw\b/.test(trimmed)) return true
  if (/^\(Command exited\b/i.test(trimmed)) return true
  return false
}

function stripRuntimeDiagnostics(text) {
  const withoutAnsi = text
    .replace(/\u001b\[[0-9;]*[A-Za-z]/g, '')
    .replace(/\[[0-9;]+m/g, '')

  return withoutAnsi
    .split('\n')
    .filter((line) => !isRuntimeDiagnosticLine(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function visibleAssistantText(text) {
  return stripRuntimeDiagnostics(stripLeadingSessionId(text))
}

function splitTableRow(line) {
  let raw = line.trim()
  if (raw.startsWith('|')) raw = raw.slice(1)
  if (raw.endsWith('|')) raw = raw.slice(0, -1)
  return raw.split('|').map((cell) => cell.trim())
}

function isTableSeparator(line) {
  const cells = splitTableRow(line)
  if (!line.includes('-') || cells.length === 0) return false
  return cells.every((cell) => /^:?-+:?$/.test(cell.replace(/\s/g, '')))
}

function isTableRow(line) {
  const trimmed = line.trim()
  return trimmed.includes('|') && !trimmed.startsWith('#')
}

function looksLikeTable(headerLine, separatorLine) {
  if (!separatorLine || !isTableSeparator(separatorLine)) return false
  const header = headerLine.trim()
  const separator = separatorLine.trim()
  if (!header.includes('|')) return false
  return header.startsWith('|') || separator.includes('|')
}

function isBlockStart(lines, index) {
  const trimmed = lines[index].trim()
  if (/^#{1,6}\s+/.test(trimmed)) return true
  if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) return true
  if (/^([-*]|\d+\.)\s+/.test(trimmed)) return true
  return looksLikeTable(trimmed, lines[index + 1])
}

function parseAnswerBlocks(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let index = 0

  while (index < lines.length) {
    const trimmed = lines[index].trim()
    if (!trimmed) {
      index += 1
      continue
    }

    const heading = /^(#{1,6})\s+(.+?)\s*#*$/.exec(trimmed)
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2].trim() })
      index += 1
      continue
    }

    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' })
      index += 1
      continue
    }

    if (looksLikeTable(trimmed, lines[index + 1])) {
      const header = splitTableRow(lines[index])
      index += 2
      const rows = []
      while (index < lines.length && lines[index].trim() && isTableRow(lines[index]) && !isTableSeparator(lines[index])) {
        rows.push(splitTableRow(lines[index]))
        index += 1
      }
      blocks.push({ type: 'table', header, rows })
      continue
    }

    if (/^([-*]|\d+\.)\s+/.test(trimmed)) {
      const items = []
      while (index < lines.length && /^([-*]|\d+\.)\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^([-*]|\d+\.)\s+/, ''))
        index += 1
      }
      blocks.push({ type: 'list', items })
      continue
    }

    const paragraph = []
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
      paragraph.push(lines[index].trim())
      index += 1
    }
    blocks.push({ type: 'paragraph', lines: paragraph })
  }

  return blocks
}

function renderInline(text, keyPrefix) {
  const parts = []
  let rest = text
  let key = 0

  while (rest.includes('**')) {
    const start = rest.indexOf('**')
    const end = rest.indexOf('**', start + 2)
    if (start > 0) parts.push(rest.slice(0, start))
    if (end === -1) {
      parts.push(rest.slice(start + 2))
      rest = ''
      break
    }
    parts.push(<strong key={`${keyPrefix}-${key}`}>{rest.slice(start + 2, end)}</strong>)
    key += 1
    rest = rest.slice(end + 2)
  }

  if (rest) parts.push(rest)
  return parts
}

function FormattedAnswer({ text }) {
  const blocks = parseAnswerBlocks(text)

  return (
    <div className="liveAnswer" aria-live="polite">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const Tag = block.level === 1 ? 'h3' : 'h4'
          return (
            <Tag key={index} className={`liveHeading level${Math.min(block.level, 3)}`}>
              {renderInline(block.text, `h-${index}`)}
            </Tag>
          )
        }

        if (block.type === 'hr') return <hr key={index} className="liveRule" />

        if (block.type === 'list') {
          return (
            <ul key={index} className="liveList">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item, `li-${index}-${itemIndex}`)}</li>
              ))}
            </ul>
          )
        }

        if (block.type === 'table') {
          return (
            <div key={index} className="liveTableWrap">
              <table className="liveTable">
                <thead>
                  <tr>
                    {block.header.map((cell, cellIndex) => (
                      <th key={cellIndex}>{renderInline(cell, `th-${index}-${cellIndex}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{renderInline(cell, `td-${index}-${rowIndex}-${cellIndex}`)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 && <br />}
                {renderInline(line, `p-${index}-${lineIndex}`)}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

function ShareGuide({ onClose }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function copyLink() {
    const link = `${window.location.origin}/care/momo-for-sarah`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="shareOverlay" onClick={onClose}>
      <div
        className="shareDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">Momo's Care Guide</p>
        <h2 id="share-title">Prepared for Sarah</h2>

        <div className="sharePet">
          <div className="avatar" aria-hidden="true"><PawMark /></div>
          <div>
            <p className="petName">{PET.name}</p>
            <p className="petMeta">{PET.breed} · {PET.age}</p>
          </div>
        </div>

        <section className="shareSection">
          <h3>Daily routine</h3>
          <ul className="routineList">
            {ROUTINE.map((item) => (
              <li key={item.time} className="routineRow">
                <time dateTime={item.dateTime}>{item.time}</time>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="shareSection">
          <h3>Favorites</h3>
          <ul className="favoriteList">
            {FAVORITES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="shareSection">
          <h3>Comfort</h3>
          <p>Momo already knows Sarah well. During their latest visit, Momo greeted her at the door excitedly.</p>
        </section>

        <section className="shareSection">
          <h3>Good to know</h3>
          <p>After long walks or hikes, Momo may be tired and sleep for much of the evening.</p>
        </section>

        <p className="sharePrepared">Prepared from Momo's Personal Brain</p>

        <div className="shareActions">
          <button type="button" className="shareButton" onClick={copyLink}>
            Copy link
          </button>
          {copied && <span className="shareCopied" role="status">Link copied</span>}
          <button type="button" className="primaryButton shareDone" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

function CaregiverBrief({ brief, liveAnswer, asking, error }) {
  const showingLive = liveAnswer !== null
  const visibleAnswer = liveAnswer ? visibleAssistantText(liveAnswer) : ''
  const [shareOpen, setShareOpen] = useState(false)

  return (
    <section className="brief" aria-labelledby="brief-title">
      <div className="briefTop">
        <div>
          {showingLive ? (
            <h2 id="brief-title">PawMemory Answer</h2>
          ) : (
            <>
              <p className="eyebrow">Caregiver brief</p>
              <h2 id="brief-title">For {brief.audience}</h2>
            </>
          )}
        </div>
        {!showingLive && (
          <div className="briefActions">
            <p className="badge">{brief.connectedCount} memories connected</p>
            <button type="button" className="shareButton" onClick={() => setShareOpen(true)}>
              Share with Sarah →
            </button>
          </div>
        )}
      </div>

      {showingLive && (
        <>
          {error && (
            <p className="formNote formNoteError" role="alert">{error}</p>
          )}
          {(visibleAnswer || asking) && (
            visibleAnswer
              ? <FormattedAnswer text={visibleAnswer} />
              : (
                <div className="liveAnswer isEmpty connecting" aria-live="polite">
                  <span className="connectingDots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  Connecting Momo's memories...
                </div>
              )
          )}
        </>
      )}

      {!showingLive && (
        <>

      <div className="infoGrid">
        <div className="infoBlock">
          <h3>Daily Routine</h3>
          <ul className="routineList">
            {ROUTINE.map((item) => (
              <li key={item.time} className="routineRow">
                <time dateTime={item.dateTime}>{item.time}</time>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="infoBlock">
          <h3>Favorites</h3>
          <ul className="favoriteList">
            {FAVORITES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="relationship">
        <h3>Sarah & Momo</h3>
        <div className="timeline">
          {RELATIONSHIP.map((event) => (
            <article key={event.id} className="timelineItem">
              <span className="timelineDot" aria-hidden="true" />
              <h4>{event.when}</h4>
              <p>{event.text}</p>
            </article>
          ))}
        </div>
        <p className="summary">{brief.summary}</p>
      </div>
        </>
      )}

      <footer className="provenance">
        <ProvenanceMark />
        <div>
          <p className="provenanceTitle">Connected from Momo's Personal Brain</p>
          <p className="provenanceSources">
            {showingLive
              ? 'Routine · Preferences · People · Places · Past experiences'
              : brief.sources.join(' · ')}
          </p>
          <p className="provenanceCue">
            {showingLive
              ? 'Cognee connected relevant memories into this answer.'
              : 'Cognee linked these memories into this brief.'}
          </p>
        </div>
      </footer>
      {shareOpen && <ShareGuide onClose={() => setShareOpen(false)} />}
    </section>
  )
}

function ChipIcon({ label }) {
  if (label === 'Recent changes') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 5v3.2L10.2 9.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    )
  }

  if (label === 'Vet visit summary') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M5 2.8h6v10.4H5z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M6.6 6.2h2.8M6.6 8.4h2.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.2 4.2h9.6M3.2 8h9.6M3.2 11.8h5.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function AskView({ question, onQuestionChange, onAsk, asking, brief, liveAnswer, askError }) {
  return (
    <>
      <section className="askHero">
        <div className="askIntro">
          <header className="pageHeader">
            <p className="eyebrow">Ask PawMemory</p>
            <h1>Ask something about Momo.</h1>
            <p className="lede">
              Ask about a routine, a person, a place, or a moment from Momo's life.
            </p>
          </header>
          <MemoryConstellation active={asking} />
        </div>

        <form className="askCard" onSubmit={onAsk}>
        <div className="tryAsking">
          <p className="tryAskingLabel">Try asking</p>
          <div className="tryChips">
            {ASK_EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                className={question === example.prompt ? 'tryChip selected' : 'tryChip'}
                onClick={() => onQuestionChange(example.prompt)}
              >
                <ChipIcon label={example.label} />
                {example.label}
              </button>
            ))}
          </div>
        </div>
        <label className="srOnly" htmlFor="question">
          Ask Momo's Personal Brain
        </label>
        <textarea
          id="question"
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          placeholder="Ask about a person, a routine, or a trip…"
        />
        <div className="askFooter">
          <p>Momo's memories, connected over time.</p>
          <button className="primaryButton" type="submit" disabled={!question.trim() || asking} aria-busy={asking}>
            Ask PawMemory →
          </button>
        </div>
      </form>
      </section>

      <p className="srOnly" role="status">
        {asking ? "Connecting Momo's memories." : ''}
      </p>

      <MemoryFlow linking={asking} />
      <CaregiverBrief brief={brief} liveAnswer={liveAnswer} asking={asking} error={askError} />
    </>
  )
}

function AddMemoryView({ draft, onDraftChange, onRemember, saveState, onViewMemories }) {
  const [memoryKind, setMemoryKind] = useState('note')

  return (
    <>
      <section className="addHero">
        <header className="pageHeader">
          <p className="eyebrow">Add Memory</p>
          <h1>Tell PawMemory something that happened.</h1>
          <p className="lede">
            A walk, a person, or a small moment. It can connect with what PawMemory already knows.
          </p>
          <div className={saveState === 'saved' ? 'momentMark isJoined' : 'momentMark'} aria-hidden="true">
            <span className="momentSeed" />
            <span className="momentThread" />
            <span className="momentNode" />
          </div>
        </header>
      </section>

      <form className="askCard" onSubmit={onRemember}>
        <div className="memoryKinds" role="group" aria-label="Memory type">
          {[
            ['note', 'Note'],
            ['photo', 'Photo'],
            ['voice', 'Voice'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={memoryKind === id ? 'memoryKind selected' : 'memoryKind'}
              aria-pressed={memoryKind === id}
              onClick={() => setMemoryKind(id)}
            >
              {label}
              {id !== 'note' && <span className="memorySoonMark">Soon</span>}
            </button>
          ))}
        </div>

        {memoryKind === 'note' ? (
          <>
            <label className="srOnly" htmlFor="memory">
              New memory about Momo
            </label>
            <textarea
              id="memory"
              className="memoryField"
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder="What should PawMemory remember?"
            />
            <p className="memoryHint">Small moments become part of Momo's memory over time.</p>
            <div className="askFooter">
              <p role={saveState === 'saving' ? 'status' : undefined}>
                {saveState === 'saving'
                  ? "Adding to Momo's Personal Brain..."
                  : "It joins Momo's Personal Brain."}
              </p>
              <button
                className="primaryButton"
                type="submit"
                disabled={!draft.trim() || saveState === 'saving'}
                aria-busy={saveState === 'saving'}
              >
                Remember this
              </button>
            </div>
          </>
        ) : (
          <p className="memorySoon" role="status">
            {memoryKind === 'photo' ? 'Photo memories — coming soon' : 'Voice memories — coming soon'}
          </p>
        )}
      </form>

      <p className="memorySupport">Your pet's moments can become part of one connected Personal Brain.</p>

      {saveState === 'saved' && (
        <div className="saveNote" role="status">
          <p>✓ Added to Momo's Personal Brain</p>
          <button type="button" className="textButton" onClick={onViewMemories}>
            See memories
          </button>
        </div>
      )}

      {saveState === 'error' && (
        <p className="formNote formNoteError" role="alert">
          {MEMORY_ERROR}
        </p>
      )}
    </>
  )
}

function MemoriesView({ memories }) {
  return (
    <>
      <header className="pageHeader">
        <p className="eyebrow">Memories</p>
        <h1>Momo's story</h1>
        <p className="lede">
          Routines, people, and moments, held over time.
        </p>
      </header>

      <ul className="memoryList">
        {memories.map((memory) => {
          const kind = memory.type === 'Sarah' ? 'People' : memory.type
          return (
            <li key={memory.id}>
              <article className="memoryCard" data-kind={kind}>
                <p>{memory.text}</p>
                <div className="memoryMeta">
                  <span className="tag" data-kind={kind}>{kind}</span>
                  <time>{memory.when}</time>
                </div>
              </article>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function App() {
  const [view, setView] = useState('ask')
  const [question, setQuestion] = useState(DEMO_QUESTION)
  const [liveAnswer, setLiveAnswer] = useState(null)
  const [asking, setAsking] = useState(false)
  const [askError, setAskError] = useState(null)
  const [memories, setMemories] = useState(INITIAL_MEMORIES)
  const [draft, setDraft] = useState(EXAMPLE_MEMORY)
  const [saveState, setSaveState] = useState('idle')
  const askGeneration = useRef(0)
  const askInFlight = useRef(false)
  const saveInFlight = useRef(false)

  useEffect(() => {
    document.title = "PawMemory — Personal Brain for Pets"
    return () => {
      askGeneration.current += 1
    }
  }, [])

  async function handleAsk(event) {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || askInFlight.current) return

    const generation = ++askGeneration.current
    askInFlight.current = true
    setAsking(true)
    setAskError(null)
    setLiveAnswer('')

    try {
      await askPawMemory({
        question: trimmed,
        onText: (text) => {
          if (askGeneration.current === generation) setLiveAnswer(text)
        },
      })
    } catch (error) {
      if (askGeneration.current !== generation) return
      setAskError(error?.message || UNAVAILABLE_MESSAGE)
    } finally {
      if (askGeneration.current === generation) {
        askInFlight.current = false
        setAsking(false)
      }
    }
  }

  async function handleRemember(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || saveInFlight.current) return

    saveInFlight.current = true
    setSaveState('saving')
    try {
      const memory = await rememberMemory({ text })
      setMemories((current) => [memory, ...current])
      setSaveState('saved')
    } catch {
      setSaveState('error')
    } finally {
      saveInFlight.current = false
    }
  }

  function handleDraftChange(value) {
    setDraft(value)
    if (saveState === 'saved' || saveState === 'error') setSaveState('idle')
  }

  return (
    <div className="app">
      <Sidebar view={view} onNavigate={setView} />
      <main className="main">
        <div className="mainInner">
          {view === 'ask' && (
            <AskView
              question={question}
              onQuestionChange={setQuestion}
              onAsk={handleAsk}
              asking={asking}
              brief={CAREGIVER_BRIEF}
              liveAnswer={liveAnswer}
              askError={askError}
            />
          )}
          {view === 'add' && (
            <AddMemoryView
              draft={draft}
              onDraftChange={handleDraftChange}
              onRemember={handleRemember}
              saveState={saveState}
              onViewMemories={() => setView('memories')}
            />
          )}
          {view === 'memories' && <MemoriesView memories={memories} />}
        </div>
      </main>
    </div>
  )
}

export default App
