// The cover's front panel: 18 lamps in six octal groups, alternating
// plum and magenta as on the PDP-11/40.  Clicking cycles through a few
// words that every compiled function contains.
(function () {
  var fp = document.getElementById('fp'), cap = document.getElementById('fpcap');
  if (!fp) return;
  var words = [
    [0o4567, 'jsr r5,csv', 'the first instruction of every function this compiler emits'],
    [0o167, 'jmp cret', 'the last one: jump to the common return sequence'],
    [0o4737, 'jsr pc,*$_printf', 'a call: the address of the function follows in the next word'],
    [0o5726, 'tst (sp)+', 'pop one argument after a call, cheaper than add $2,sp']
  ];
  var k = 0, lamps = [];
  for (var g = 0; g < 6; g++) {
    var grp = document.createElement('div');
    grp.className = 'fp-group ' + (g % 2 ? 'mag' : 'plum');
    for (var b = 0; b < 3; b++) {
      var bit = document.createElement('div');
      bit.className = 'fp-bit';
      var lamp = document.createElement('span'); lamp.className = 'lamp';
      var sw = document.createElement('span'); sw.className = 'switch';
      bit.appendChild(lamp); bit.appendChild(sw); grp.appendChild(bit);
      lamps.push(lamp);
    }
    fp.insertBefore(grp, cap);
  }
  function show() {
    var w = words[k];
    for (var i = 0; i < 18; i++) lamps[i].classList.toggle('on', !!((w[0] >> (17 - i)) & 1));
    cap.innerHTML = '<b>' + ('000000' + w[0].toString(8)).slice(-6) + '</b> &nbsp;' + w[1] + ' &mdash; ' + w[2];
  }
  fp.style.cursor = 'pointer';
  fp.title = 'Click to show another instruction';
  fp.addEventListener('click', function () { k = (k + 1) % words.length; show(); });
  show();
})();
