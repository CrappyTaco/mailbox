'use client';
import './stationery.css';
import './editor-corrections.css';
import './paged-editor.css';
import { LetterFooter } from './LetterFooter';
import { HoldButton } from './HoldButton';
import { PageTurn } from './PageTurn';
import {
  paginateDocument,
  pageArtwork,
  mergePageArtwork,
  pageAtOffset,
  bodyBox,
  flowLines,
} from '@/lib/letter-pages';
import { canvasFont } from '@/lib/letter-renderer';
import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { displayName, type Letter, type Owner } from '@/lib/mailbox-state';
import {
  stampIds,
  inkColors,
  inkNames,
  pointCount,
  type InkColor,
} from '@/lib/letter-art';
import {
  clampObject,
  fieldBoxes,
  fontFamilies,
  fontIds,
  fontNames,
  fontSizes,
  textColors,
  textColorNames,
  isSigned,
  hasPlacedStamp,
  lineHeight,
  makeStamp,
  resizeSticker,
  toDocument,
  MAX_OBJECTS,
  MAX_STICKERS,
  MAX_STICKER_TOTAL,
  type LetterDocument,
  type TextField,
  type TextFieldId,
} from '@/lib/letter-document';
import {
  letterPDF,
  loadLetterFonts,
  pageCount,
  textLines,
} from '@/lib/letter-renderer';
import { makeSticker } from '@/lib/sticker-upload';
import { builtinStickers } from '@/lib/builtin-stickers';
import { LetterArtLayer, type PaperTool } from './LetterArt';
import { LetterPreview, PaperBackground } from './LetterPreview';
import { EnvelopeInteraction } from './EnvelopeInteraction';
export type StationeryMode =
  | 'opening'
  | 'reading'
  | 'writing'
  | 'saving'
  | 'closing'
  | 'stowing'
  | 'sealing'
  | null;

function ToolIcon({
  tool,
}: {
  tool: PaperTool | 'undo' | 'redo' | 'download';
}) {
  const paths = {
    text: 'M3 3h14v3h-5v13H8V6H3Z',
    stamp:
      'M3 2h14v2h2v3h-2v3h2v3h-2v3h2v3h-2v1H3v-1H1v-3h2v-3H1v-3h2V7H1V4h2Zm3 4v10h8V6Z',
    sticker: 'M3 2h16v12h-3v3h-3v3H3Zm2 2v14h7v-6h5V4Zm9 10v2h2v-2Z',
    marker: 'M14 2h3v2h2v3L8 18H3v-5Zm-9 12v2h2l8-8-2-2Z',
    eraser: 'M11 3h5l4 4v3L9 20H5l-4-4v-4Zm-6 9-2 2 4 4h2l3-3-5-5Z',
    undo: 'M7 3v4h8v2h3v3h2v7h-3v-6h-2v-3H7v4L1 9Z',
    redo: 'M15 3v4H7v2H4v3H2v7h3v-6h2v-3h8v4l6-5Z',
    download: 'M9 2h4v9h4l-6 6-6-6h4ZM3 17h3v2h10v-2h3v5H3Z',
  };
  return (
    <svg viewBox="0 0 22 22" shapeRendering="crispEdges" aria-hidden="true">
      <path fill="currentColor" d={paths[tool]} />
    </svg>
  );
}
export function Stationery({
  owner,
  mode,
  letter,
  artwork,
  setArtwork: saveArtwork,
  beginEdit,
  endEdit,
  undo,
  redo,
  canUndo,
  canRedo,
  canReply,
  error,
  busy,
  onClose,
  onReply,
  onSend,
  onRetryRead,
  onPaperComplete,
}: {
  owner: Owner;
  mode: StationeryMode;
  letter: Letter | null;
  artwork: LetterDocument;
  setArtwork: (value: LetterDocument) => void;
  beginEdit: () => void;
  endEdit: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  canReply: boolean;
  error: string;
  busy: boolean;
  onClose: () => void;
  onReply: () => void;
  onSend: () => void;
  onRetryRead: () => void;
  onPaperComplete: () => void;
}) {
  const measureRef = useRef<CanvasRenderingContext2D | null>(null);
  const [paginator, setPaginator] = useState<
    ((doc: LetterDocument) => LetterDocument) | null
  >(null);
  useEffect(() => {
    let cancelled = false;
    void loadLetterFonts()
      .then(() => {
        if (!cancelled) {
          const ctx = document.createElement('canvas').getContext('2d')!;
          measureRef.current = ctx;
          setPaginator(() => (doc: LetterDocument) => {
            ctx.font = canvasFont(doc.text.body);
            return paginateDocument(doc, (s) => ctx.measureText(s).width);
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const paginate = (doc: LetterDocument) => (paginator ? paginator(doc) : doc);
  const setArtwork = (doc: LetterDocument) => {
    const next = paginate(doc);
    artworkRef.current = next;
    saveArtwork(next);
  };
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const artworkRef = useRef(artwork);
  useEffect(() => {
    artworkRef.current = artwork;
  }, [artwork]);
  const [tool, setTool] = useState<PaperTool>('text');
  const [panel, setPanel] = useState<PaperTool | null>(null);
  const [field, setField] = useState<TextFieldId>('body');
  const [color, setColor] = useState<InkColor>(inkColors[0]);
  const [size, setSize] = useState<2 | 4 | 7>(4);
  const [selected, setSelected] = useState<string | null>(null);
  const [trashTarget, setTrashTarget] = useState<HTMLDivElement | null>(null);
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [preview, setPreview] = useState(false);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [textIssue, setTextIssue] = useState('');
  const [draftPages, setDraftPages] = useState(1);
  const [turn, setTurn] = useState<{
    from: number;
    to: number;
    doc: LetterDocument;
  } | null>(null);
  const finishTurn = useCallback(() => setTurn(null), []);
  const writing =
    mode === 'writing' ||
    mode === 'saving' ||
    mode === 'sealing' ||
    mode === 'stowing';
  const motion =
    mode === 'opening'
      ? 'opening'
      : mode === 'closing' || mode === 'stowing' || mode === 'sealing'
        ? 'closing'
        : null;
  const editing = (mode === 'writing' || mode === 'saving') && !preview;
  const locked = busy || uploading || !!turn;
  const currentObject = artwork.objects.find((o) => o.id === selected);
  const received = useMemo(
    () => toDocument(letter?.artwork, letter?.body ?? '', displayName(owner)),
    [letter, owner],
  );
  const composing = useMemo(
    () => (paginator ? paginator(artwork) : artwork),
    [artwork, paginator],
  );
  const paperArt = writing ? composing : received;
  const totalPages = writing ? (composing.pages?.length ?? draftPages) : pages;
  const pageIndex = Math.min(page, totalPages - 1);
  const range = composing.pages?.[pageIndex] ?? {
    start: 0,
    end: artwork.text.body.text.length,
  };
  const localArt = pageArtwork(artwork, pageIndex);
  const goPage = (next: number) => {
    if (turn || busy || uploading || motion || next < 0 || next >= totalPages)
      return;
    endEdit();
    setSelected(null);
    setPanel(null);
    setTurn({ from: pageIndex, to: next, doc: paperArt });
    setPage(next);
  };
  const [readyDocument, setReadyDocument] = useState<LetterDocument | null>(
    null,
  );
  const paperReady = useCallback(() => setReadyDocument(paperArt), [paperArt]);
  const activeText = artwork.text[field];
  const signed = isSigned(artwork);
  const stamped = hasPlacedStamp(artwork);
  const [lastMode, setLastMode] = useState(mode);
  if (lastMode !== mode) {
    setLastMode(mode);
    if (mode === 'writing' || mode === 'opening' || mode === null) {
      setPreview(false);
      setPage(0);
      setNotice('');
      setSelected(null);
      setPanel(null);
    }
    if (mode === 'writing') {
      setTool('text');
      setField('body');
    }
  }
  useEffect(() => {
    if (mode !== 'writing') return;
    const request = requestAnimationFrame(() =>
      bodyRef.current?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(request);
  }, [mode]);
  useEffect(() => {
    if (!writing) return;
    let cancelled = false;
    void loadLetterFonts()
      .then(() => {
        if (cancelled) return;
        const ctx = document.createElement('canvas').getContext('2d')!;
        const over = (['greeting', 'signature'] as const).find(
          (id) =>
            textLines(ctx, artwork.text[id], fieldBoxes[id].width).length *
              lineHeight(artwork.text[id]) >
            fieldBoxes[id].height,
        );
        setTextIssue(
          over
            ? `The ${over} needs a little more room. Shorten it or choose a smaller size.`
            : '',
        );
        setDraftPages(pageCount(ctx, artwork));
      })
      .catch(() => {
        if (!cancelled)
          setTextIssue(
            'A letter font could not load. Please refresh and try again.',
          );
      });
    return () => {
      cancelled = true;
    };
  }, [artwork, writing]);
  const chooseTool = (next: PaperTool) => {
    endEdit();
    setTool(next);
    setSelected(null);
    setPanel(panel === next ? null : next);
    setNotice('');
  };
  const styleText = (patch: Partial<TextField>) => {
    endEdit();
    setArtwork({
      ...artwork,
      text: { ...artwork.text, [field]: { ...activeText, ...patch } },
    });
  };
  const objectChange = (patch: 'left' | 'right' | 'smaller' | 'larger') => {
    const currentObject = artworkRef.current.objects.find(
      (o) => o.id === selected,
    );
    if (!currentObject) return;
    const next =
      patch === 'left' || patch === 'right'
        ? clampObject({
            ...currentObject,
            rotation: currentObject.rotation + (patch === 'left' ? -3 : 3),
          })
        : resizeSticker(currentObject, patch === 'smaller' ? 0.85 : 1.15);
    setArtwork({
      ...artworkRef.current,
      objects: artworkRef.current.objects.map((o) =>
        o.id === selected ? next : o,
      ),
    });
  };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (
      artwork.objects.length >= MAX_OBJECTS ||
      artwork.objects.filter((o) => o.type === 'sticker').length >= MAX_STICKERS
    ) {
      setNotice(
        'This letter is full of decorations. Remove one to add another.',
      );
      return;
    }
    setUploading(true);
    setNotice('');
    try {
      const sticker = await makeSticker(file),
        current = artworkRef.current;
      if (
        current.objects
          .filter((o) => o.type === 'sticker')
          .reduce((n, o) => n + o.asset.length, sticker.asset.length) >
        MAX_STICKER_TOTAL
      )
        throw new Error(
          'These stickers fill the letter. Remove one before adding another.',
        );
      setArtwork({
        ...current,
        objects: [...current.objects, { ...sticker, page: pageIndex }],
      });
      setSelected(sticker.id);
      setPanel(null);
    } catch (cause) {
      setNotice(
        cause instanceof Error
          ? cause.message
          : 'This sticker could not be made. Try another image.',
      );
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = '';
    }
  };
  const download = async () => {
    if (exporting || !letter) return;
    setExporting(true);
    setNotice('');
    try {
      const blob = await letterPDF(received),
        url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `our-mailbox-${letter.recipient}-${letter.created_at.slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setNotice('The PDF could not be made. Please try again.');
    } finally {
      setExporting(false);
    }
  };
  const activateTextAt = (x: number, y: number) => {
    const ctx = measureRef.current;
    if (!ctx || locked) return false;
    for (const id of ['greeting', 'body', 'signature'] as const) {
      if (
        (id === 'greeting' && pageIndex !== 0) ||
        (id === 'signature' && pageIndex !== totalPages - 1)
      )
        continue;
      const value = artwork.text[id],
        box = id === 'body' ? bodyBox(pageIndex) : fieldBoxes[id];
      if (
        x < box.x ||
        x > box.x + box.width ||
        y < box.y ||
        y > box.y + box.height
      )
        continue;
      const text =
        id === 'body' ? value.text.slice(range.start, range.end) : value.text;
      ctx.font = canvasFont(value);
      const lines = flowLines(text, box.width, (s) => ctx.measureText(s).width),
        line = lines[Math.floor((y - box.y) / lineHeight(value))];
      if (!line) continue;
      const contents = text.slice(line.start, line.visibleEnd);
      if (!contents.trim() || x - box.x > ctx.measureText(contents).width + 3)
        continue;
      let caret = 0;
      while (
        caret < contents.length &&
        ctx.measureText(contents.slice(0, caret + 1)).width < x - box.x
      )
        caret++;
      setTool('text');
      setField(id);
      setSelected(null);
      setPanel(null);
      requestAnimationFrame(() => {
        const field = document.querySelector<HTMLTextAreaElement>(
          '.field-' + id,
        );
        field?.focus();
        field?.setSelectionRange(line.start + caret, line.start + caret);
      });
      return true;
    }
    return false;
  };
  const selectObject = (id: string | null) => {
    setSelected(id);
    if (id) setPanel(null);
  };
  return (
    <Dialog
      open={mode !== null}
      onOpenChange={(open) => {
        if (!open && !uploading && !motion && !busy) onClose();
      }}
    >
      <DialogContent
        className={`stationery stationery-set ${writing ? 'is-composing' : 'is-reading'} ${preview ? 'showing-preview' : ''} ${motion ? 'in-envelope-motion' : ''}`}
        showCloseButton={false}
        initialFocus={editing ? bodyRef : true}
        finalFocus={() =>
          document.querySelector<HTMLButtonElement>('.mailbox-hit')
        }
      >
        <DialogTitle className="sr-only">
          {writing ? 'Write a letter' : 'Your received letter'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {writing
            ? 'Write, decorate, and type or draw your signature.'
            : 'Your letter, kept just as it was sent.'}
        </DialogDescription>
        {/* Keyboard shortcuts bubble from the editor's interactive controls. */}
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <form
          className="stationery-layout"
          onSubmit={(event) => {
            event.preventDefault();
            if (writing && !locked && !textIssue && signed && stamped) {
              endEdit();
              onSend();
            }
          }}
          onKeyDown={(event) => {
            if (!editing || locked || !(event.ctrlKey || event.metaKey)) return;
            if (event.key.toLowerCase() === 'z') {
              event.preventDefault();
              if (event.shiftKey) redo();
              else undo();
            }
            if (event.key.toLowerCase() === 'y') {
              event.preventDefault();
              redo();
            }
          }}
        >
          <EnvelopeInteraction
            phase={motion}
            ready={readyDocument === paperArt}
            onComplete={onPaperComplete}
          >
            <div
              className={`paper-sheet mode-${editing ? tool : 'read'}`}
              onPointerDown={() => setSelected(null)}
            >
              <DialogClose
                type="button"
                className="paper-close"
                aria-label="Put the letter away"
                disabled={locked || !!motion}
              >
                <svg
                  viewBox="0 0 12 12"
                  shapeRendering="crispEdges"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    d="M1 1h2v2h2v2h2V3h2V1h2v2H9v2H7v2h2v2h2v2H9V9H7V7H5v2H3v2H1V9h2V7h2V5H3V3H1Z"
                  />
                </svg>
              </DialogClose>
              {editing ? (
                <>
                  <PaperBackground />
                  {(['greeting', 'body', 'signature'] as const).map((id) => {
                    if (
                      (id === 'greeting' && pageIndex !== 0) ||
                      (id === 'signature' && pageIndex !== totalPages - 1)
                    )
                      return null;
                    const value = artwork.text[id],
                      box = id === 'body' ? bodyBox(pageIndex) : fieldBoxes[id];
                    return (
                      <textarea
                        key={id}
                        ref={id === 'body' ? bodyRef : undefined}
                        className={`sheet-field field-${id}`}
                        aria-label={
                          id === 'body'
                            ? 'Letter body'
                            : id === 'greeting'
                              ? 'Greeting'
                              : 'Typed signature'
                        }
                        value={
                          id === 'body'
                            ? value.text.slice(range.start, range.end)
                            : value.text
                        }
                        maxLength={id === 'body' ? 20000 : 240}
                        placeholder={
                          id === 'signature'
                            ? 'Your signature…'
                            : id === 'body'
                              ? 'Write your letter…'
                              : 'Dear…'
                        }
                        spellCheck
                        readOnly={locked || tool !== 'text'}
                        style={{
                          left: `${box.x / 6}%`,
                          top: `${box.y / 7.6}%`,
                          width: `${box.width / 6}%`,
                          height: `${box.height / 7.6}%`,
                          fontFamily: fontFamilies[value.font],
                          color: value.color,
                          fontSize: `${value.size / 6}cqw`,
                          lineHeight: 1.5,
                        }}
                        onPointerDown={(event) => {
                          if (!event.isPrimary) {
                            event.preventDefault();
                            return;
                          }
                          if (!locked && tool !== 'text') {
                            setTool('text');
                            setPanel(null);
                            setSelected(null);
                            event.currentTarget.readOnly = false;
                          }
                        }}
                        onFocus={() => {
                          setField(id);
                          setSelected(null);
                          beginEdit();
                        }}
                        onBlur={endEdit}
                        onChange={(event) => {
                          const input = event.target,
                            typed = input.value;
                          const text =
                            id === 'body'
                              ? artwork.text.body.text.slice(0, range.start) +
                                typed +
                                artwork.text.body.text.slice(range.end)
                              : typed;
                          const next = paginate({
                            ...artwork,
                            text: { ...artwork.text, [id]: { ...value, text } },
                          });
                          if (text.length > 20000) return;
                          setArtwork(next);
                          if (id === 'body' && next.pages) {
                            const offset =
                                range.start +
                                (input.selectionStart ?? typed.length),
                              nextPage = pageAtOffset(next.pages, offset);
                            setPage(nextPage);
                            requestAnimationFrame(() => {
                              bodyRef.current?.focus({ preventScroll: true });
                              bodyRef.current?.setSelectionRange(
                                offset - next.pages![nextPage].start,
                                offset - next.pages![nextPage].start,
                              );
                            });
                          }
                        }}
                        onKeyDown={(event) => {
                          if (
                            id === 'body' &&
                            event.key === 'Backspace' &&
                            event.currentTarget.selectionStart === 0 &&
                            event.currentTarget.selectionEnd === 0 &&
                            range.start > 0
                          ) {
                            event.preventDefault();
                            const offset =
                                range.start -
                                (Array.from(
                                  artwork.text.body.text.slice(0, range.start),
                                ).at(-1)?.length ?? 1),
                              text =
                                artwork.text.body.text.slice(0, offset) +
                                artwork.text.body.text.slice(range.start),
                              next = paginate({
                                ...artwork,
                                text: {
                                  ...artwork.text,
                                  body: { ...artwork.text.body, text },
                                },
                              });
                            setArtwork(next);
                            const target = pageAtOffset(
                              next.pages ?? [{ start: 0, end: text.length }],
                              offset,
                            );
                            setPage(target);
                            requestAnimationFrame(() =>
                              bodyRef.current?.setSelectionRange(
                                offset - (next.pages?.[target].start ?? 0),
                                offset - (next.pages?.[target].start ?? 0),
                              ),
                            );
                          }
                          if (id === 'body' && event.key === 'PageDown') {
                            event.preventDefault();
                            goPage(pageIndex + 1);
                          }
                          if (id === 'body' && event.key === 'PageUp') {
                            event.preventDefault();
                            goPage(pageIndex - 1);
                          }
                        }}
                      />
                    );
                  })}
                  <LetterArtLayer
                    key={pageIndex}
                    art={localArt}
                    otherInk={{
                      points:
                        pointCount(artwork.strokes) -
                        pointCount(localArt.strokes),
                      strokes: artwork.strokes.length - localArt.strokes.length,
                    }}
                    onChange={(next) =>
                      setArtwork(
                        mergePageArtwork(artworkRef.current, pageIndex, next),
                      )
                    }
                    onTextAt={activateTextAt}
                    tool={tool}
                    color={color}
                    size={size}
                    disabled={locked}
                    beginEdit={beginEdit}
                    endEdit={endEdit}
                    selected={selected}
                    onSelect={selectObject}
                    trashTarget={trashTarget}
                  />
                </>
              ) : (
                <LetterPreview
                  doc={paperArt}
                  page={pageIndex}
                  onPages={setPages}
                  onReady={paperReady}
                />
              )}
            </div>
            {turn && (
              <PageTurn
                doc={turn.doc}
                from={turn.from}
                to={turn.to}
                onComplete={finishTurn}
              />
            )}
          </EnvelopeInteraction>
          {writing && !preview && (
            <div className="editor-rail">
              <aside className="paper-tools" aria-label="Letter editing tools">
                <div className="tool-modes">
                  {(
                    ['text', 'stamp', 'sticker', 'marker', 'eraser'] as const
                  ).map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`paper-tool ${tool === t ? 'tool-selected' : ''}`}
                      aria-pressed={tool === t}
                      aria-label={
                        t === 'text'
                          ? 'Text settings'
                          : t === 'stamp'
                            ? 'Choose stamp'
                            : t === 'sticker'
                              ? 'Sticker'
                              : t === 'marker'
                                ? 'Marker'
                                : 'Eraser'
                      }
                      disabled={locked}
                      onClick={() => chooseTool(t)}
                    >
                      <ToolIcon tool={t} />
                      <span>{t[0].toUpperCase() + t.slice(1)}</span>
                    </button>
                  ))}
                </div>
                <div className="history-tools">
                  <button
                    type="button"
                    className="paper-tool"
                    aria-label="Undo"
                    disabled={!canUndo || locked}
                    onClick={undo}
                  >
                    <ToolIcon tool="undo" />
                    <span>Undo</span>
                  </button>
                  <button
                    type="button"
                    className="paper-tool"
                    aria-label="Redo"
                    disabled={!canRedo || locked}
                    onClick={redo}
                  >
                    <ToolIcon tool="redo" />
                    <span>Redo</span>
                  </button>
                </div>
                {panel && (
                  <div className={`tool-panel panel-${panel}`}>
                    <button
                      className="panel-close"
                      type="button"
                      aria-label="Close tool settings"
                      onClick={() => setPanel(null)}
                    >
                      ×
                    </button>
                    {panel === 'text' && (
                      <>
                        <label>
                          Text area
                          <select
                            aria-label="Text area to style"
                            value={field}
                            onChange={(event) => {
                              endEdit();
                              setField(event.target.value as TextFieldId);
                            }}
                          >
                            <option value="greeting">Greeting</option>
                            <option value="body">Body</option>
                            <option value="signature">Signature</option>
                          </select>
                        </label>
                        <label>
                          Font
                          <select
                            aria-label="Letter font"
                            value={activeText.font}
                            onChange={(event) =>
                              styleText({
                                font: event.target.value as TextField['font'],
                              })
                            }
                          >
                            {fontIds.map((id, i) => (
                              <option key={id} value={id}>
                                {fontNames[i]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <fieldset className="text-sizes" aria-label="Text size">
                          {fontSizes.map((n, i) => (
                            <button
                              key={n}
                              type="button"
                              aria-label={
                                [
                                  'Small text',
                                  'Normal text',
                                  'Large text',
                                  'Extra large text',
                                ][i]
                              }
                              aria-pressed={activeText.size === n}
                              onClick={() => styleText({ size: n })}
                            >
                              {['S', 'M', 'L', 'XL'][i]}
                            </button>
                          ))}
                        </fieldset>
                        <fieldset
                          className="ink-colors text-colors"
                          aria-label="Text color"
                        >
                          {textColors.map((ink, i) => (
                            <button
                              key={ink}
                              type="button"
                              aria-label={`${textColorNames[i]} text`}
                              aria-pressed={activeText.color === ink}
                              className={
                                activeText.color === ink ? 'color-selected' : ''
                              }
                              onClick={() => styleText({ color: ink })}
                              style={{ '--ink-swatch': ink } as CSSProperties}
                            />
                          ))}
                        </fieldset>
                      </>
                    )}
                    {panel === 'stamp' && (
                      <fieldset
                        className="stamp-tray"
                        aria-label="Postage stamp collection"
                      >
                        {stampIds.map((id) => (
                          <button
                            key={id}
                            type="button"
                            aria-label={`Add ${id} stamp`}
                            onClick={() => {
                              if (artwork.objects.length >= MAX_OBJECTS) {
                                setNotice(
                                  'Remove a decoration to make room for another.',
                                );
                                return;
                              }
                              const stamp = {
                                ...makeStamp(id, crypto.randomUUID()),
                                page: pageIndex,
                              };
                              setArtwork({
                                ...artwork,
                                objects: [...artwork.objects, stamp],
                              });
                              setSelected(stamp.id);
                              setPanel(null);
                            }}
                          >
                            {/* oxlint-disable-next-line nextjs/no-img-element */}
                            <img
                              src={`/stamps/${id}.png`}
                              alt=""
                              draggable={false}
                            />
                          </button>
                        ))}
                      </fieldset>
                    )}
                    {panel === 'sticker' && (
                      <div className="sticker-picker">
                        <div
                          className="builtin-sticker-tray"

                          aria-label="Pixel sticker collection"
                        >
                          {builtinStickers.map((sticker) => (
                            <button
                              type="button"
                              key={sticker.name}
                              aria-label={`Add ${sticker.name} sticker`}
                              disabled={locked}
                              onClick={() => {
                                if (
                                  artwork.objects.length >= MAX_OBJECTS ||
                                  artwork.objects.filter(
                                    (o) => o.type === 'sticker',
                                  ).length >= MAX_STICKERS
                                ) {
                                  setNotice(
                                    'Remove a decoration to make room for another.',
                                  );
                                  return;
                                }
                                const object = {
                                  id: crypto.randomUUID(),
                                  type: 'sticker' as const,
                                  asset: sticker.asset,
                                  x: 300,
                                  y: 380,
                                  width: 96,
                                  height: 96,
                                  rotation: 0,
                                  page: pageIndex,
                                };
                                endEdit();
                                setArtwork({
                                  ...artwork,
                                  objects: [...artwork.objects, object],
                                });
                                setSelected(object.id);
                                setPanel(null);
                              }}
                            >
                              {/* oxlint-disable-next-line nextjs/no-img-element */}
                              <img
                                src={sticker.asset}
                                alt=""
                                draggable={false}
                              />
                            </button>
                          ))}
                        </div>
                        <label className="pixel-button upload-label">
                          {uploading ? 'Making sticker…' : 'Choose image'}
                          <input
                            ref={uploadRef}
                            type="file"
                            aria-label="Upload sticker image"
                            accept="image/png,image/jpeg,image/webp"
                            disabled={locked}
                            onChange={(event) =>
                              void upload(event.target.files?.[0])
                            }
                          />
                        </label>
                        <small>PNG, JPEG or WebP · up to 8 MB</small>
                      </div>
                    )}
                    {(panel === 'marker' || panel === 'eraser') && (
                      <div className="ink-options">
                        <fieldset
                          className="marker-sizes"
                          aria-label="Marker size"
                        >
                          {([2, 4, 7] as const).map((value, i) => (
                            <button
                              key={value}
                              type="button"
                              aria-label={
                                [
                                  'Small marker',
                                  'Medium marker',
                                  'Large marker',
                                ][i]
                              }
                              aria-pressed={size === value}
                              onClick={() => setSize(value)}
                            >
                              <i
                                style={{ width: value + 3, height: value + 3 }}
                              />
                            </button>
                          ))}
                        </fieldset>
                        {panel === 'marker' && (
                          <fieldset
                            className="ink-colors"
                            aria-label="Marker color"
                          >
                            {inkColors.map((ink, i) => (
                              <button
                                key={ink}
                                type="button"
                                className={
                                  color === ink ? 'color-selected' : ''
                                }
                                aria-label={inkNames[i]}
                                aria-pressed={color === ink}
                                onClick={() => setColor(ink)}
                                style={{ '--ink-swatch': ink } as CSSProperties}
                              />
                            ))}
                          </fieldset>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </aside>
              {currentObject && (
                <div
                  className="object-adjust"

                  aria-label="Selected decoration controls"
                >
                  <span className="object-adjust-title">
                    Selected {currentObject.type}
                  </span>
                  <HoldButton
                    selection={currentObject.id}
                    onBegin={beginEdit}
                    onEnd={endEdit}
                    label="Rotate decoration left"
                    disabled={locked}
                    onStep={() => objectChange('left')}
                  >
                    ↶
                  </HoldButton>
                  <HoldButton
                    selection={currentObject.id}
                    onBegin={beginEdit}
                    onEnd={endEdit}
                    label="Rotate decoration right"
                    disabled={locked}
                    onStep={() => objectChange('right')}
                  >
                    ↷
                  </HoldButton>
                  {
                    <>
                      <HoldButton
                        selection={currentObject.id}
                        onBegin={beginEdit}
                        onEnd={endEdit}
                        label={`Make ${currentObject.type} smaller`}
                        disabled={locked}
                        onStep={() => objectChange('smaller')}
                      >
                        −
                      </HoldButton>
                      <HoldButton
                        selection={currentObject.id}
                        onBegin={beginEdit}
                        onEnd={endEdit}
                        label={`Make ${currentObject.type} larger`}
                        disabled={locked}
                        onStep={() => objectChange('larger')}
                      >
                        +
                      </HoldButton>
                    </>
                  }
                </div>
              )}
              <div className="editor-trash-slot" ref={setTrashTarget} />
            </div>
          )}
          <LetterFooter
            error={error || notice || (writing ? textIssue : undefined)}
            page={{
              index: pageIndex,
              count: totalPages,
              disabled: !!turn || busy || !!motion,
              onChange: goPage,
            }}
            left={
              writing
                ? {
                    label: preview ? 'KEEP EDITING' : 'PREVIEW',
                    disabled: locked,
                    onClick: () => {
                      endEdit();
                      setPreview(!preview);
                      setPage(0);
                      setPanel(null);
                    },
                  }
                : {
                    label: exporting ? 'Saving…' : 'Download PDF',
                    accessibleLabel: 'Download PDF',
                    icon: <ToolIcon tool="download" />,
                    disabled: exporting,
                    onClick: () => void download(),
                  }
            }
            right={
              writing
                ? {
                    label: 'send letter',
                    type: 'submit',
                    disabled:
                      locked ||
                      !artwork.text.body.text.trim() ||
                      !signed ||
                      !stamped ||
                      !!textIssue,
                  }
                : !letter?.read_at
                  ? {
                      label: busy ? 'unfolding…' : 'try opening again',
                      disabled: busy,
                      onClick: onRetryRead,
                    }
                  : canReply
                    ? { label: 'write back', onClick: onReply }
                    : undefined
            }
            hint={
              writing && (!stamped || !signed)
                ? !stamped && !signed
                  ? 'Add a stamp and signature to send.'
                  : !stamped
                    ? 'Add a stamp to send.'
                    : 'Add your signature to send.'
                : undefined
            }
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
