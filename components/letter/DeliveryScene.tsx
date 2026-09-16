import { useId, useMemo } from 'react';
import { PixelCelestial } from '../world/PixelCelestial';
import { Mailbox, MailboxEnvelope } from '../mailbox/Mailbox';
import { type Owner } from '../../lib/mailbox-state';
import { WORLD_CONFIG } from '../../lib/world-time';
import {
  WORLD_STYLE,
  MAILBOX_ART,
  DELIVERY_GLOBE,
} from '../../lib/world-style';
import {
  deliveryFrame,
  globeShadow,
  solarCycle,
  FLIGHT_ENVELOPE,
  BOTTOM_MAILBOX_TRANSFORM,
} from '../../lib/delivery';
export function DeliveryScene({
  frame,
  recipient,
  hour,
}: {
  frame: ReturnType<typeof deliveryFrame>;
  recipient: Owner;
  hour: number;
}) {
  const edge = useId();
  const { x, y, width, height } = MAILBOX_ART.globe;
  const mailboxPlacement = { x, y, width, height };
  const sun = solarCycle(hour);
  const reverseRoute = recipient === 'auggie';
  const shadowCells = useMemo(
    () =>
      Array.from({ length: 40 * 40 }, (_, i) => {
        const x = (i % 40) * 5,
          y = Math.floor(i / 40) * 5;
        const shade = globeShadow(x + 2.5 - 100, y + 2.5 - 100, hour);
        return shade > 0 ? (
          <rect
            key={i}
            x={x}
            y={y}
            width={5}
            height={5}
            fill={WORLD_STYLE.ink}
            opacity={shade}
          />
        ) : null;
      }),
    [hour],
  );
  return (
    <div
      className="delivery-stage"

      aria-label={
        frame.phase === 'complete'
          ? 'Letter delivered'
          : 'Delivering your letter'
      }
      data-delivery-phase={frame.phase}
    >
      <svg
        className="space-stars"
        viewBox="0 0 1000 800"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        shapeRendering="crispEdges"
      >
        {Array.from({ length: 54 }, (_, i) => (
          <rect
            key={i}
            x={(i * 197 + 31) % 996}
            y={(i * 113 + 17) % 796}
            width={i % 9 === 0 ? 3 : 2}
            height={i % 9 === 0 ? 3 : 2}
            fill={i % 9 === 0 ? '#e5d5b4' : '#85889d'}
            opacity={i % 3 === 0 ? 0.8 : 0.45}
          />
        ))}
      </svg>
      <svg
        className="delivery-world"
        viewBox="0 0 400 440"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <svg
          x={200 + sun.x * 178 - 12}
          y={220 + sun.y * 178 - 12}
          width={24}
          height={24}
          viewBox="0 0 32 32"
        >
          <PixelCelestial kind="sun" />
        </svg>
        <svg
          x={200 - sun.x * 178 - 11}
          y={220 - sun.y * 178 - 11}
          width={22}
          height={22}
          viewBox="0 0 32 32"
        >
          <PixelCelestial kind="moon" />
        </svg>
        <g
          className="delivery-route"
          data-route={reverseRoute ? 'indi-to-auggie' : 'auggie-to-indi'}
          transform={reverseRoute ? BOTTOM_MAILBOX_TRANSFORM : undefined}
        >
          {/* Each mailbox owns its letter and aperture in local coordinates.
              Only a fully clear envelope is handed to the world flight layer. */}
          <svg
            overflow="visible"
            {...mailboxPlacement}
            data-sending-mouth="left"
          >
            <Mailbox
              door={frame.phase === 'departing' ? 'open' : 'closed'}
              doorProgress={frame.departureDoor}
              flagProgress={0}
              showLetter={frame.phase === 'departing'}
              letterX={frame.letterX}
              letterClassName="delivery-envelope"
              letterFlipY={reverseRoute}
            />
          </svg>
          <g transform={BOTTOM_MAILBOX_TRANSFORM} data-receiving-mouth="left">
            <svg overflow="visible" {...mailboxPlacement}>
              <Mailbox
                door={frame.closed ? 'closed' : 'open'}
                doorProgress={frame.doorProgress}
                flagProgress={frame.flagProgress}
                mail={frame.flag}
                showLetter={
                  frame.phase !== 'departing' && frame.phase !== 'travelling'
                }
                letterX={frame.letterX}
                letterClassName="delivery-envelope"
                letterFlipY={!reverseRoute}
              />
            </svg>
          </g>
          {frame.phase === 'travelling' && (
            <g
              className="delivery-flight delivery-envelope"
              transform={`translate(${frame.x} ${frame.y}) scale(1 ${reverseRoute ? -1 : 1}) rotate(${frame.angle})`}
            >
              <MailboxEnvelope
                x={-FLIGHT_ENVELOPE.width / 2}
                y={-FLIGHT_ENVELOPE.height / 2}
                {...FLIGHT_ENVELOPE}
              />
            </g>
          )}
        </g>
        {/* The terrain covers the buried ends of both posts. Its surface and
            their ground anchors are defined in the same world viewBox. */}
        <svg
          x={DELIVERY_GLOBE.x}
          y={DELIVERY_GLOBE.y}
          width={DELIVERY_GLOBE.size}
          height={DELIVERY_GLOBE.size}
          viewBox="0 0 200 200"
          shapeRendering="crispEdges"
        >
          <defs>
            <clipPath id={edge}>
              <path d="M70 0h60v5h20v10h15v10h10v15h10v15h10v20h5v50h-5v20h-10v15h-10v15h-10v10h-15v10h-20v5H70v-5H50v-10H35v-10H25v-15H15v-15H5v-20H0V75h5V55h10V40h10V25h10V15h15V5h20Z" />
            </clipPath>
          </defs>
          <g clipPath={`url(#${edge})`}>
            <path fill={WORLD_STYLE.blueShade} d="M0 0h200v200H0Z" />
            <path fill={WORLD_STYLE.blueLight} d="M25 20h150v150H25Z" />
            <path fill={WORLD_STYLE.silver} d="M30 30h100v45H30Z" />
            <path
              fill={WORLD_STYLE.greenShade}
              d="M0 0h200v15h-20v10h-25v10h-15v-5h-20v15H95V30H70v15H50v10H25v20H10v20H0Zm200 115h-20v-10h-15v10h-10v20h-15v20h-20v15h-10v30h90ZM0 135h20v10h15v10h10v20h25v25H0Z"
            />
            <path
              fill={WORLD_STYLE.green}
              d="M0 0h200v10h-25v10h-25v10h-10v-5h-25v15h-15V25H65v15H45v10H20v20H5v15H0Zm200 120h-25v-10h-5v10h-10v20h-15v20h-20v15h-10v25h85ZM0 140h15v10h15v10h10v20h25v20H0Z"
            />
            <path
              fill={WORLD_STYLE.grass}
              d="M35 10h25v5H35Zm70 5h15v10h-15Zm60 125h15v10h-15Zm-15 25h20v10h-20ZM10 170h15v10H10Z"
            />
            <path
              fill={WORLD_STYLE.paper}
              d="M45 85h10v-5h15v5h10v5H45Zm65 25h10v-5h15v5h15v5h-40Z"
            />
            <path
              fill={WORLD_STYLE.blueShade}
              opacity=".4"
              d="M0 0h8v140h12v20h15v15h25v10h90v-10h20v-20h15v-20h15v65H0Z"
            />
            {shadowCells}
          </g>
        </svg>

        <text x={275} y={85}>
          {WORLD_CONFIG.auggie.locationLabel}
        </text>
        <text x={275} y={364}>
          {WORLD_CONFIG.indi.locationLabel}
        </text>
      </svg>
      <p>
        {frame.phase === 'complete'
          ? 'delivered'
          : frame.phase === 'waiting'
            ? 'delivering…'
            : 'sending your letter…'}
      </p>
    </div>
  );
}
