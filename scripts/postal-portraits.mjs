// Original 36 × 40 postal portraits, drawn in integer pixels from the seven
// character reference sheets. These deliberately differ from the world sprites.
export function postalPortrait(id, rect) {
  const ink = '#49414a',
    cream = '#f4e8cf',
    pale = '#ded5c2';
  const r = (x, y, w, h, c) => rect(x + 6, y + 8, w, h, c);
  r(5, 37, 26, 2, '#b6ae96');
  if (id === 'nibbler' || id === 'noddle') {
    const yellow = id === 'nibbler',
      head = yellow ? '#e4cc83' : cream;
    // Perched profile, upright crest, long tapered tail and folded wing.
    r(18, 2, 2, 9, ink);
    r(15, 0, 2, 8, ink);
    r(12, 3, 3, 7, ink);
    r(16, 2, 1, 7, head);
    r(13, 4, 1, 5, head);
    r(19, 4, 1, 6, head);
    r(10, 8, 12, 2, ink);
    r(8, 10, 16, 10, ink);
    r(6, 13, 3, 4, ink);
    r(10, 10, 12, 10, head);
    r(9, 12, 13, 6, head);
    r(7, 14, 3, 2, '#ad9371');
    r(11, 12, 2, 2, '#292a35');
    r(11, 12, 1, 1, cream);
    if (yellow) {
      r(13, 16, 4, 3, '#c57f5f');
      r(14, 16, 2, 2, '#de9a67');
    } else r(12, 16, 6, 3, '#c8c5bf');
    r(13, 20, 14, 2, ink);
    r(12, 22, 17, 10, ink);
    r(15, 32, 12, 3, ink);
    r(23, 33, 4, 5, ink);
    r(25, 36, 5, 2, ink);
    r(14, 21, 11, 10, '#85858b');
    r(14, 22, 4, 8, '#b3b0ac');
    r(20, 22, 6, 10, '#65656e');
    r(21, 24, 4, 7, cream);
    r(23, 25, 2, 4, pale);
    r(18, 30, 6, 3, '#8d8a8c');
    r(24, 33, 2, 3, '#b3b0ac');
    r(16, 34, 2, 3, '#a28b7c');
    r(21, 34, 2, 3, '#a28b7c');
    r(14, 37, 5, 1, ink);
    r(20, 37, 5, 1, ink);
    return;
  }
  const lop = id === 'earl' || id === 'lady',
    black = id === 'wilfred' || id === 'squashy';
  const fur = black
    ? '#51505b'
    : id === 'toffee'
      ? '#cfa971'
      : id === 'earl'
        ? '#c1ac90'
        : '#a29f9f';
  const light = black
    ? '#696675'
    : id === 'toffee'
      ? '#e0bd86'
      : id === 'earl'
        ? '#d3c0a0'
        : '#bbb7b2';
  // Ears are part of the outer silhouette; the two lops have hanging ears.
  if (!lop) {
    r(10, 1, 5, 15, ink);
    r(22, 3, 5, 13, ink);
    r(11, 2, 3, 13, fur);
    r(23, 4, 3, 11, fur);
    r(12, 4, 1, 8, black ? '#817680' : '#c38b80');
    r(24, 6, 1, 7, black ? '#817680' : '#c38b80');
  }
  r(10, 12, 16, 3, ink);
  r(8, 15, 20, 12, ink);
  r(10, 27, 16, 2, ink);
  r(10, 15, 16, 11, fur);
  r(12, 14, 12, 2, light);
  r(9, 18, 18, 6, fur);
  if (lop) {
    r(5, 14, 5, 15, ink);
    r(6, 15, 3, 12, fur);
    r(6, 18, 1, 7, light);
    r(27, 14, 5, 14, ink);
    r(28, 15, 3, 11, fur);
    r(29, 18, 1, 6, '#837878');
  }
  r(9, 28, 18, 2, ink);
  r(7, 30, 22, 7, ink);
  r(9, 37, 18, 1, ink);
  r(10, 28, 16, 3, fur);
  r(9, 31, 18, 5, fur);
  r(8, 32, 20, 3, fur);
  r(9, 35, 7, 2, light);
  r(21, 35, 7, 2, light);
  if (id === 'toffee') {
    r(13, 24, 10, 4, cream);
    r(14, 29, 8, 6, cream);
    r(11, 16, 3, 3, light);
  }
  if (id === 'earl') {
    r(13, 18, 10, 7, '#84776e');
    r(16, 14, 4, 8, cream);
    r(13, 24, 10, 3, cream);
    r(13, 28, 10, 8, cream);
    r(10, 34, 5, 2, cream);
  }
  if (id === 'lady') {
    r(13, 23, 10, 4, pale);
    r(11, 17, 3, 2, light);
    r(22, 19, 3, 2, light);
    r(12, 29, 3, 2, light);
    r(22, 31, 3, 2, light);
    r(17, 33, 2, 2, '#8d898e');
  }
  if (id === 'wilfred') {
    r(17, 14, 2, 6, cream);
    r(15, 23, 6, 4, cream);
    r(10, 29, 14, 7, cream);
    r(11, 29, 4, 3, fur);
    r(19, 32, 5, 3, fur);
    r(13, 34, 3, 2, fur);
    r(24, 35, 3, 2, cream);
  }
  if (id === 'squashy') {
    r(16, 23, 5, 3, cream);
    r(12, 27, 12, 8, cream);
    r(14, 26, 8, 2, cream);
    r(9, 35, 7, 2, cream);
    r(21, 35, 7, 2, cream);
  }
  r(12, 20, 2, 2, '#292a35');
  r(23, 20, 2, 2, '#292a35');
  r(12, 20, 1, 1, cream);
  r(23, 20, 1, 1, cream);
  r(17, 23, 3, 1, black ? '#c1a6a3' : '#ac7a74');
  r(18, 24, 1, 2, ink);
}
