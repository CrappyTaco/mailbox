import { WORLD_STYLE, ENVELOPE_ART } from '../../lib/world-style';
export { ENVELOPE_ART };
export function EnvelopeBack() {
  return (
    <>
      <path fill={WORLD_STYLE.ink} d="M2 0h156v2h2v84h-2v2H2v-2H0V2h2Z" />
      <path fill={WORLD_STYLE.paperShade} d="M2 2h156v84H2Z" />
      <path fill={WORLD_STYLE.paperFold} d="M4 4h152v4H4Z" />
    </>
  );
}
export function EnvelopeFront() {
  return (
    <>
      <path
        fill={WORLD_STYLE.paperShade}
        d="M2 4h8v2h8v2h8v2h8v2h8v2h8v2h8v2h8v2h8v2h12v-2h8v-2h8v-2h8v-2h8v-2h8v-2h8v-2h8v-2h8v-2h8v82H2Z"
      />
      <path
        fill="none"
        stroke={WORLD_STYLE.paperFold}
        strokeWidth="2"
        d="M2 4h8v2h8v2h8v2h8v2h8v2h8v2h8v2h8v2h8v2h12v-2h8v-2h8v-2h8v-2h8v-2h8v-2h8v-2h8v-2h8v-2h8M2 84H4V82H5V80H7V78H9V76H10V74H12V72H14V70H16V68H17V66H19V64H21V62H22V60H24V58H26V56H27V54H29V52H31V50H33V48H34V46H36V44H38V42H39V40H41V38H43V36H44V34H46V32H48V30H50V28H51V26H53V24H55V22H56V20H58V18M158 84H156V82H155V80H153V78H151V76H150V74H148V72H146V70H144V68H143V66H141V64H139V62H138V60H136V58H134V56H133V54H131V52H129V50H127V48H126V46H124V44H122V42H121V40H119V38H117V36H116V34H114V32H112V30H110V28H109V26H107V24H105V22H104V20H102V18"
      />
      <path fill={WORLD_STYLE.paper} d="M12 81h136v3H12Z" />
      <path fill={WORLD_STYLE.ink} d="M0 3h2v81h156V3h2v83h-2v2H2v-2H0Z" />
    </>
  );
}
export function EnvelopeFlap() {
  return (
    <>
      <path
        fill={WORLD_STYLE.paper}
        stroke={WORLD_STYLE.ink}
        strokeWidth="3"
        d="M2 1h156v4h-12v6h-12v6h-12v6h-12v6H98v6H86v6H74v-6H62v-6H50v-6H38v-6H26v-6H14V5H2Z"
      />
    </>
  );
}
