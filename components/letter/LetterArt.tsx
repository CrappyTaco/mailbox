'use client';
import { useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  eraseInk,
  pointCount,
  strokePath,
  type Point,
  type InkColor,
  type InkStroke,
} from '@/lib/letter-art';
import {
  clampObject,
  type LetterDocument,
  type LetterObject,
} from '@/lib/letter-document';
export type PaperTool = 'text' | 'stamp' | 'sticker' | 'marker' | 'eraser';
export function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
      <path className="trash-lid" fill="currentColor" d="M8 3h8v2h5v3H3V5h5Z" />
      <path fill="currentColor" d="M5 9h3v10h2V9h4v10h2V9h3v12H5Z" />
    </svg>
  );
}
export function LetterArtLayer({
  art,
  onChange,
  tool,
  color,
  size,
  disabled = false,
  beginEdit,
  endEdit,
  selected,
  onSelect,
  trashTarget,
  onTextAt,
  otherInk = { points: 0, strokes: 0 },
}: {
  art: LetterDocument;
  onChange: (art: LetterDocument) => void;
  tool: PaperTool;
  color: InkColor;
  size: 2 | 4 | 7;
  disabled?: boolean;
  beginEdit: () => void;
  endEdit: () => void;
  selected: string | null;
  onSelect: (id: string | null) => void;
  trashTarget: HTMLElement | null;
  onTextAt?: (x: number, y: number) => boolean;
  otherInk?: { points: number; strokes: number };
}) {
  const drawing = useRef<{
    pointer: number;
    last: Point;
    stroke: InkStroke | null;
    base: LetterDocument;
  } | null>(null);
  const dragging = useRef<{
    pointer: number;
    id: string;
    offset: Point;
    base: LetterDocument;
    overTrash: boolean;
  } | null>(null);
  const artRef = useRef(art);
  const trash = useRef<HTMLButtonElement>(null);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [overTrash, setOverTrash] = useState(false);
  const [limit, setLimit] = useState(false);
  const commit = (next: LetterDocument) => {
    artRef.current = next;
    onChange(next);
  };
  const point = (event: PointerEvent<Element>, clamp = true): Point => {
    const box = event.currentTarget
      .closest('.paper-sheet')!
      .getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 600,
      y = ((event.clientY - box.top) / box.height) * 760;
    return [
      Math.round((clamp ? Math.max(0, Math.min(600, x)) : x) * 2) / 2,
      Math.round((clamp ? Math.max(0, Math.min(760, y)) : y) * 2) / 2,
    ];
  };
  const active = !disabled && (tool === 'marker' || tool === 'eraser');
  const begin = (event: PointerEvent<SVGSVGElement>) => {
    if (
      !active ||
      event.button !== 0 ||
      !event.isPrimary ||
      drawing.current ||
      dragging.current
    )
      return;
    const hit = point(event);
    if (onTextAt?.(hit[0], hit[1])) return;
    event.preventDefault();
    if (
      tool === 'marker' &&
      (pointCount(art.strokes) + otherInk.points >= 10000 ||
        art.strokes.length + otherInk.strokes >= 220)
    ) {
      setLimit(true);
      return;
    }
    setLimit(false);
    onSelect(null);
    beginEdit();
    const p = point(event),
      stroke = tool === 'marker' ? { color, width: size, points: [p] } : null;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = { pointer: event.pointerId, last: p, stroke, base: art };
    commit({
      ...art,
      strokes: stroke
        ? [...art.strokes, stroke]
        : eraseInk(art.strokes, p, p, size * 2 + 5),
    });
  };
  const move = (event: PointerEvent<SVGSVGElement>) => {
    const p = point(event);
    setCursor(p);
    const state = drawing.current;
    if (!active || !state || state.pointer !== event.pointerId) return;
    event.preventDefault();
    if (state.stroke) {
      if (
        Math.hypot(p[0] - state.last[0], p[1] - state.last[1]) < 1 ||
        state.stroke.points.length >= 1100
      )
        return;
      state.stroke = { ...state.stroke, points: [...state.stroke.points, p] };
      commit({ ...state.base, strokes: [...state.base.strokes, state.stroke] });
    } else
      commit({
        ...artRef.current,
        strokes: eraseInk(artRef.current.strokes, state.last, p, size * 2 + 5),
      });
    state.last = p;
  };
  const finishInk = () => {
    if (drawing.current) {
      drawing.current = null;
      endEdit();
    }
  };
  const end = (event: PointerEvent<SVGSVGElement>) => {
    if (drawing.current?.pointer !== event.pointerId) return;
    finishInk();
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const remove = (id: string, current = art) => {
    commit({ ...current, objects: current.objects.filter((o) => o.id !== id) });
    onSelect(null);
  };
  const key = (
    event: KeyboardEvent<HTMLButtonElement>,
    object: LetterObject,
  ) => {
    if (disabled) return;
    const amount = event.shiftKey ? 15 : 3;
    const arrows: Record<string, Point> = {
      ArrowLeft: [-amount, 0],
      ArrowRight: [amount, 0],
      ArrowUp: [0, -amount],
      ArrowDown: [0, amount],
    };
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      remove(object.id);
    } else if (arrows[event.key]) {
      event.preventDefault();
      commit({
        ...art,
        objects: art.objects.map((o) =>
          o.id === object.id
            ? clampObject({
                ...o,
                x: o.x + arrows[event.key][0],
                y: o.y + arrows[event.key][1],
              })
            : o,
        ),
      });
    }
  };
  const finishDrag = (
    event: PointerEvent<HTMLButtonElement>,
    cancel = false,
  ) => {
    const drag = dragging.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    if (cancel) commit(drag.base);
    else if (drag.overTrash) remove(drag.id, artRef.current);
    dragging.current = null;
    setMoving(null);
    setOverTrash(false);
    endEdit();
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return (
    <>
      <svg
        className={`paper-ink ${active ? 'ink-active' : ''} tool-${tool}`}
        viewBox="0 0 600 760"
        aria-label={active ? 'Drawing surface' : 'Hand-drawn ink'}
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={finishInk}
        onPointerLeave={() => setCursor(null)}
      >
        {art.strokes.map((stroke, i) => (
          <path
            key={i}
            d={strokePath(stroke.points)}
            fill="none"
            stroke={stroke.color}
            strokeWidth={stroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {active && cursor && (
          <circle
            className="ink-cursor"
            cx={cursor[0]}
            cy={cursor[1]}
            r={tool === 'eraser' ? size * 2 + 5 : size / 2 + 2}
            fill={tool === 'eraser' ? '#fff8e940' : 'none'}
            stroke={tool === 'eraser' ? '#8e766b' : color}
            strokeWidth="1"
            strokeDasharray={tool === 'eraser' ? '3 3' : undefined}
          />
        )}
      </svg>
      {art.objects.map((object) => (
        <button
          key={object.id}
          type="button"
          data-object-id={object.id}
          className={`letter-object placed-${object.type} ${moving === object.id ? 'object-moving' : ''} ${selected === object.id ? 'object-selected' : ''} ${moving === object.id && overTrash ? 'over-trash' : ''}`}
          aria-label={
            object.type === 'stamp'
              ? `${object.asset} postage stamp; drag or use arrow keys to move`
              : 'Custom sticker; drag or use arrow keys to move'
          }
          disabled={disabled}
          onFocus={() => onSelect(object.id)}
          onKeyDown={(event) => key(event, object)}
          style={{
            left: `${object.x / 6}%`,
            top: `${object.y / 7.6}%`,
            width: `${object.width / 6}%`,
            height: `${object.height / 7.6}%`,
            transform: `translate(-50%, -50%) rotate(${object.rotation}deg)`,
            transformOrigin: 'center',
          }}
          onPointerDown={(event) => {
            if (
              disabled ||
              !event.isPrimary ||
              event.button !== 0 ||
              dragging.current ||
              drawing.current
            )
              return;
            event.preventDefault();
            event.stopPropagation();
            onSelect(object.id);
            event.currentTarget.focus();
            beginEdit();
            const p = point(event, false);
            artRef.current = art;
            dragging.current = {
              pointer: event.pointerId,
              id: object.id,
              offset: [p[0] - object.x, p[1] - object.y],
              base: art,
              overTrash: false,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
            setMoving(object.id);
          }}
          onPointerMove={(event) => {
            const drag = dragging.current;
            if (
              !drag ||
              drag.pointer !== event.pointerId ||
              drag.id !== object.id
            )
              return;
            event.preventDefault();
            event.stopPropagation();
            const p = point(event, false);
            const box = trash.current?.getBoundingClientRect();
            drag.overTrash =
              !!box &&
              event.clientX >= box.left - 8 &&
              event.clientX <= box.right + 8 &&
              event.clientY >= box.top - 8 &&
              event.clientY <= box.bottom + 8;
            setOverTrash(drag.overTrash);
            commit({
              ...artRef.current,
              objects: artRef.current.objects.map((o) =>
                o.id === object.id
                  ? clampObject({
                      ...o,
                      x: p[0] - drag.offset[0],
                      y: p[1] - drag.offset[1],
                    })
                  : o,
              ),
            });
          }}
          onPointerUp={(event) => finishDrag(event)}
          onPointerCancel={(event) => finishDrag(event, true)}
          onLostPointerCapture={(event) => finishDrag(event, true)}
        >
          {/* oxlint-disable-next-line nextjs/no-img-element */}
          <img
            src={
              object.type === 'stamp'
                ? `/stamps/${object.asset}.png`
                : object.asset
            }
            alt=""
            draggable={false}
          />
        </button>
      ))}
      {trashTarget &&
        createPortal(
          <button
            type="button"
            ref={trash}
            className={`letter-trash ${moving ? 'trash-visible' : ''} ${overTrash ? 'trash-ready' : ''} ${selected ? 'trash-available' : ''}`}
            aria-label="Delete selected decoration"
            aria-hidden={!selected && !moving}
            tabIndex={selected ? 0 : -1}
            disabled={disabled || !selected}
            onClick={() => selected && remove(selected)}
          >
            <TrashIcon />
            <span>{overTrash ? 'let go' : 'drop here'}</span>
          </button>,
          trashTarget,
        )}
      {limit && (
        <output className="ink-limit">
          This sheet has lots of ink. Erase a few marks to make room.
        </output>
      )}
    </>
  );
}
