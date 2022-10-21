if (LiveAPI === undefined) {
  function LiveAPI() {
  }

  LiveAPI.prototype.call = function(var1, var2) {
    console.log(var1);
  }

  function post(message) {
    console.log(message);
  }
}

function log() {
  for (var i = 0, len = arguments.length; i < len; i++) {
    var message = arguments[i];
    if (message && message.toString) {
      var s = message.toString();
      if (s.indexOf("[object ") >= 0) {
        s = JSON.stringify(message);
      }
      post(s);
    } else if (message === null) {
      post("<null>");
    } else {
      post(message);
    }
  }
  post("\n");
}

log("___________________________________________________");
log("Reload:", new Date);

var scaleSize = 12;

//var scaleSize = 53;

function createClip(track, slot, len) {
  var api = new LiveAPI("live_set tracks " + track + " clip_slots " + slot);
  api.call("create_clip", len);
}

function duplicateClip(track, slot, len) {
  var api = new LiveAPI("live_set tracks " + track + " clip_slots " + slot, " clip");
  api.call("duplicate_clip_to_arrangement", 0);
}

//--------------------------------------------------------------------
// Clip class

// function Clip() {
//     var path = "live_set view highlighted_clip_slot clip";
//     this.liveObject = new LiveAPI(path);
// }
function Clip(track, slot, len, noClear) {
  createClip(track, slot, len);
  var path = "live_set tracks " + track + " clip_slots " + slot + " clip";
  this.liveObject = new LiveAPI(path);
  if (noClear) {
    return;
  }
  this.replaceAllNotes([]);
}

Clip.prototype.getLength = function() {
  return this.liveObject.get('length');
}

Clip.prototype._parseNoteData = function(data) {
  var notes = [];
  // data starts with "notes"/count and ends with "done" (which we ignore)
  for (var i = 2, len = data.length - 1; i < len; i += 6) {
    // and each note starts with "note" (which we ignore) and is 6 items in the list
    var note = new Note(data[i + 1], data[i + 2], data[i + 3], data[i + 4], data[i + 5]);
    notes.push(note);
  }
  return notes;
}

Clip.prototype.getSelectedNotes = function() {
  var data = this.liveObject.call('get_notes', 0, 0, 256, 128);
  return this._parseNoteData(data);

}

Clip.prototype.getNotes = function(startTime, timeRange, startPitch, pitchRange) {
  if (!startTime) {
    startTime = 0;
  }
  if (!timeRange) {
    timeRange = this.getLength();
  }
  if (!startPitch) {
    startPitch = 0;
  }
  if (!pitchRange) {
    pitchRange = 128;
  }

  var data = this.liveObject.call("get_notes", startTime, startPitch, timeRange, pitchRange);
  return this._parseNoteData(data);
}

//--------------------------------------------------------------------
// Note class

function Note(pitch, start, duration, velocity, muted, channel) {
  this.pitch = pitch;
  this.start = start;
  this.duration = duration;
  this.velocity = velocity;
  this.muted = muted;
  this.channel = channel;
}

Note.prototype.toString = function() {
  return '{pitch:' + this.pitch +
    ', start:' + this.start +
    ', duration:' + this.duration +
    ', velocity:' + this.velocity +
    ', muted:' + this.muted + '}';
}

//--------------------------------------------------------------------

/*
var clip = new Clip(0,0,10);
var notes = clip.getSelectedNotes();
var selectedNoteValues = [];
notes.forEach(function (note) {
    selectedNoteValues.push(note.pitch);
    log(note);
});
*/

Clip.prototype.setNotes = function(notes) {
  var liveObject = this.liveObject;
  liveObject.call("set_notes");
  liveObject.call("notes", notes.length);
  notes.forEach(function(note) {
    liveObject.call("note", note.pitch,
      note.start.toFixed(4), note.duration.toFixed(4),
      note.velocity, note.muted);
  });
  liveObject.call("done");
}

Clip.prototype.replaceSelectedNotes = function(notes) {
  this.liveObject.call("replace_selected_notes");
  this.setNotes(notes);
}

Clip.prototype.selectAllNotes = function() {
  this.liveObject.call("select_all_notes");
}

Clip.prototype.replaceAllNotes = function(notes) {
  this.selectAllNotes();
  this.replaceSelectedNotes(notes);
}

//----
function Sequnce(seq) {
  var pos = 0;
  var sequnce = seq;
}

//---------------------------------------------------------------------
imul = function(a, b) {
  var aHi = (a >>> 16) & 0xffff;
  var aLo = a & 0xffff;
  var bHi = (b >>> 16) & 0xffff;
  var bLo = b & 0xffff;
  // the shift by 0 fixes the sign on the high part
  // the final |0 converts the unsigned value into a signed value
  return ((aLo * bLo) + (((aHi * bLo + aLo * bHi) << 16) >>> 0) | 0);
};

function xmur3(str) {
  for (var i = 0, h = 1779033703 ^ str.length; i < str.length; i++) {
    h = imul(h ^ str.charCodeAt(i), 3432918353),
      h = h << 13 | h >>> 19;
  }
  return function() {
    h = imul(h ^ h >>> 16, 2246822507);
    h = imul(h ^ h >>> 13, 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }
}

function Stack(size) {
  this.size = size;
  this.list = [];
}

Stack.prototype.put = function(item) {
  this.list.push(item);
  if (this.list.length > this.size) {
    this.list.shift();
  }
}
Stack.prototype.get = function() {
  return this.list;
}

function Fun() {
  this.cnt = 0;
  this.last = 1000;
  this.inc = 0;
  this.min = 0;
  this.max = 0;
  this.direction = 1;
}

Fun.prototype.get = function(rmax) {
  var n = this.last + (this.inc * this.direction);
  if (n > this.max) {
    n = this.max;
    this.direction = -1;
    this.inc = randomInt(9) + 1;
    this.min = this.max - (1 + randomInt(this.max - 1));
  }
  if (n < this.min) {
    n = this.min;
    this.direction = 1;
    this.inc = randomInt(9) + 1;
    this.max = this.min + (randomInt(100 - this.min));
  }
  this.last = n;
  return Math.floor(n * rmax / 100);
}

function sfc32(a, b, c, d) {
  return function() {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    var t = (a + b) | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    d = d + 1 | 0;
    t = t + d | 0;
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  }
}

var seed = xmur3(Math.random());
// Output four 32-bit hashes to provide the seed for sfc32.
var rand = sfc32(seed(), seed(), seed(), seed());

function random(seed) {
  seed = xmur3(seed.toString() + 'salt');
  rand = sfc32(seed(), seed(), seed(), seed());
}

function randomInt(max) {
  return Math.floor(rand() * max);
}

Array.prototype.last = function() {
  return this[this.length - 1];
}

Array.prototype.exists = function(num) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] === num) {
      return true
    }
  }
  return false;
}
Array.prototype.existsOctave = function(num) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] === num) {
      return true
    }
  }
  return false;
}
Array.prototype.isSus = function() {
  var v1 = Math.abs(this[0] - this[1]);
  var v2 = Math.abs(this[1] - this[2]);
  var v3 = 12 - Math.abs(this[0] - this[2]);
  if (v1 === v2 || v2 == v3 || v1 == v3) {
    return true
  }
  return false
}

Array.prototype.deep = function() {
  return JSON.parse(JSON.stringify(this));
}

Number.prototype.times = function(func) {
  for (var i = 0; i < this; i++) {
    func(i);
  }
}

Array.prototype.shuffle = function() {
  for (var i = this.length - 1; i > 0; i--) {
    var j = randomInt(i + 1);
    var temp = this[i];
    this[i] = this[j];
    this[j] = temp;
  }
  return this;
}
var structs = [
  [0, 1, 2],
  [0, 4, 2],
  [0, 5, 2],
  [0, 1, 6],
  [0, 5, 6],
  [0, 3, 6],
  [0, 3, 4],
  [0, 5, 4],
  [0, 1, 4],
  [0, 1, 2],
  [0, 1, 3],
  [0, 3, 2],
  [0, 4, 2],
  [0, 5, 2],
  [0, 2, 3],
  [0, 4, 3],
  [0, 5, 3],
  [0, 6, 3],
  [0, 1, 4],
  [0, 1, 5],
  [0, 1, 6],
  [0, 2, 4],
  [0, 2, 5],
  [0, 2, 6],
  [0, 3, 4],
  [0, 3, 5],
  [0, 3, 6],
  [0, 4, 5],
  [0, 4, 6],
  [0, 5, 6]
]

function mod(x, m) {
  return (x % m + m) % m;
}

Array.prototype.get = function(i) {
  return this[mod(i, this.length)];
}

Array.prototype.getR = function(i) {
  return this[randomInt(this.length)];
}

function getDurs(beats, len) {
  var durs = [];
  var m = 1;
  var fill = len - (beats * m);
  beats.times(function(i) {
    durs.push(m);
  });
  while (fill > 0) {
    var rp = randomInt(beats);
    //rp = [0,1,2].shuffle()[0];
    durs[rp] += m;
    fill -= m;
  }
  var seq = [];
  var p = 0;
  beats.times(function(i) {
    seq.push({pos: p, dur: durs[i]});
    p += durs[i];
  });
  return seq;
}

function Sequence(seq) {
  this.cnt = 0;
  this.pos = 0;
  this.sequnce = seq;
}

Sequence.prototype.get = function() {
  var len = this.sequnce[this.cnt % this.sequnce.length];
  var ret = {pos: this.pos, len: len};
  this.cnt++;
  this.pos += len;
  return ret;
}

Array.prototype.shuffle = function() {
  for (var i = this.length - 1; i > 0; i--) {
    var j = Math.floor(rand() * (i + 1));
    var temp = this[i];
    this[i] = this[j];
    this[j] = temp;
  }
  return this;
}

Array.prototype.take = function(num) {
  var ret = [];
  var shuffle = this.shuffle();
  for (var i = 0; i < num; i++) {
    ret.push(shuffle[i]);
  }

  return ret;
}

function euclid(steps, pulses, rotate) {
  var storedRhythm = new Array(0, 0, 0, 0);

  rotate += 1;
  rotate % steps;
  storedRhythm = []; //empty current track
  var bucket = 0;
  for (var i = 0; i < steps; i++) {
    bucket += pulses;
    if (bucket >= steps) {
      bucket -= steps;
      storedRhythm.push(1);
    } else {
      storedRhythm.push(0);
    }
  }
  if (rotate > 0) {
    storedRhythm = rotateSeq(storedRhythm, steps, rotate);
  }

  var ar = [];
  for (var i = 0; i < storedRhythm.length; i++) {
    if (storedRhythm[i] === 1) {
      ar.push({pos: i, len: 1})
    }
  }
  return ar;
}

function rotateSeq(seq2, steps, rotate) {
  var output = new Array(steps);
  var val = steps - rotate;
  for (var i = 0; i < seq2.length; i++) {
    output[i] = seq2[Math.abs((i + val) % seq2.length)];
  }
  return output;
}

function genRythm(d1, d2, b, len, start) {
  var durs = [];
  var bc = 0;
  var total = 0;
  var sum = d1 * d2;
  for (var i = 0; i < sum; i++) {

    if (i % d1 === 0 || i % d2 === 0) {
      bc += 1;
      durs.push(1);
      total++;
    } else {
      durs[durs.length - 1] += 1;
      total++;
    }
  }
  var seq = [];
  var p = 0;

  // for (var j = 0; j < len; j++) {

  for (var i = 0; i < durs.length; i++) {
    var dd = 1;
    seq.push({pos: start + p, dur: durs[i] / dd});
    p += durs[i] / dd;
  }
  // }

  return seq;
}

function genStucts() {
  var len = 5;
  var ret = [];
  for (var i = 0; i < len; i++) {
    for (var j = 0; j < len - i; j++) {
      ret.push([0, i + 1, j + i + 2]);
    }
  }
  return ret;
}

function dif(a1, a2) {
  var dif = 0;
  var as = 3;
  if (a1.length === 0) {
    return 3
  }
  for (var i = 1; i < as; i++) {
    for (var j = 1; j < as; j++) {
      if (a1[i] % 12 == a2[j] % 12) {
        dif++;
      }
    }
  }
  return dif;
}

function getSymetricScale(tonicCnt, mNotes) {
  var tCnt = tonicCnt;
  var semiDis = 12 / tCnt;
  var sScale = [];
  for (var i = 0; i < tCnt; i++) {
    sScale.push(semiDis * i);
    for (var j = 0; j < mNotes.length; j++) {
      sScale.push((semiDis * i) + mNotes[j]);
    }
  }
  var ret = [];
  for (var i = 0; i < 10; i++) {
    for (var j = 0; j < sScale.length; j++) {
      ret.push((sScale[j] + 12 * i));
    }
  }
  return ret;
}

function getDiatonicScale(scaleType, octave) {
  // 1 dorian
  // 2 Phrygian
  // 3 Lydian
  // 4 Mixolydian
  // 5 Aeolian
  // 6 Locrian
  scale = [0];
  var sp = [];
  if (scaleSize == 12) {
    sp = [2, 2, 1, 2, 2, 2, 1];
  }
  if (scaleSize == 19) {
    sp = [3, 3, 2, 3, 3, 3, 2]; // tet19
  }
  if (scaleSize == 53) {
    sp = [9, 8, 5, 9, 8, 9, 5] // tet53
  }

  for (var i = 0; i < scaleType; i++) {
    sp.push(sp.shift());
  }
  cnt = 0;
  for (var i = 0; i < 6 * octave; i++) {
    cnt += sp[i % 7];
    scale.push(scale.last() + sp[i % 7]);
  }
  return scale;
}

var P = 0;
var L = 2;
var R = 1;
var isMajor = true;
var current = [0, 4, 7];
var exp = 2;

function transform(type) {
  if (type === 0) {
    if (isMajor) {
      current[1] = (current[1] - 1);
    } else {
      current[1] = (current[1] + 1);
    }
  } else if (type === 1) {
    if (isMajor) {
      current[2] = (current[2] + 2 - 12);
    } else {
      current[0] = (current[0] - 2 + 12);
    }
  } else if (type === 2) {
    if (isMajor) {
      current[0] = (current[0] - 1 + 12);
    } else {
      current[2] = (current[2] + 1 - 12);
    }
  }

  isMajor = !isMajor;
  current = current.sort(function(a, b) {
    return a - b;
  });
}

function getChord(n, struct, scale) {
  var chords = [];
  for (var i = 0; i < struct.length; i++) {
    chords.push(scale[n + (struct[i] * exp)]);
  }
  return chords;
}

function genSeq(c) {
  var p = [1, 2, -1, -1, -1, -2, -2, -3].shuffle();
  var seq = [0];
  var note = 0;
  var getToNote = function(n, to) {
    for (var i = 0; i < 20; i++) {
      if (mod((n - (i * exp)), 7) == to) {
        return i * -1
      }
    }
  }
  Number(c - 2).times(
    function(i) {
      var rotec = p.get(i);
      note = mod((note + (rotec * exp)), 7);
      seq.push(rotec);
    }
  );
  seq.push(getToNote(note, 4));
  seq.push(-2);
  return seq;
}

function rDif(v1, v2) {
  var m1 = mod(Math.abs((v1 + scaleSize) - (v2)), scaleSize);
  var m2 = mod(Math.abs((v1) - (v2 + scaleSize)), scaleSize);
  if (m1 < m2) {
    return m1;
  }
  return m2;
}

function difReal(a1, a2) {
  if (a1.length === 0) {
    return 0;
  }
  var a1Sum = 0;
  for (var i = 1; i < a1.length; i++) {
    a1Sum += a1[i] % scaleSize
  }
  var a2Sum = 0;
  for (var i = 1; i < a2.length; i++) {
    a2Sum += a2[i] % scaleSize
  }
  return Math.abs(a1Sum - a2Sum);
}

function dif(a1, a2) {
  var dif = 0;
  var as = 3;
  if (a1.length === 0) {
    return 3
  }
  for (var i = 0; i < as; i++) {
    for (var j = 0; j < as; j++) {
      if (a1[i] % scaleSize === a2[j] % scaleSize) {
        dif++;
      }
    }
  }
  return dif;
}

function genChordFromRoots(cs, s, exp, root, cnt) {
  var current = [];
  for (var i = 0; i < cs.length; i++) {
    var n = (s.get((cs[i] * exp) + (exp * root[cnt])));
    current.push(n);
  }

  return current;

}

function getConnectingNote(last, current) {
  var cn = []
  for (var i = 0; i < last.length; i++) {

    for (var j = 0; j < current.length; j++) {
      if (last[i] % scaleSize === current[j] % scaleSize) {
        cn.push(last[i]);
      }
    }
  }
  return cn;
}

function isConnected(last, current) {
  for (var i = 0; i < last.length; i++) {
    for (var j = 0; j < current.length; j++) {
      if (last[i] % scaleSize === current[j] % scaleSize) {
        return true;
      }
    }
  }
  return false;
}

var lastConnectedNote = 0;

function findSimilarScale(sn, root, cs, exp, cnt, it) {

  var nextScale = (sn + it) % 12;
  var s = getDiatonicScale(sn, 1);
  var s2 = getDiatonicScale(nextScale, 1);

  var ret = genChordFromRoots(cs, s, exp, root, cnt);
  var ret2 = genChordFromRoots(cs, s2, exp, root, cnt);
  var d = dif(ret, ret2);
  if (d < 3) {
    return findSimilarScale(sn, root, cs, exp, cnt, it + 1);
  }

  log("scale switch", sn, nextScale)
  return nextScale
}

var currentScale = 0

function finder(i, cnt, last, exp, root) {

  var modulation = [10, 13];
  if (i > 600) {
    return [0, 1, 2];
  }

  //scale thing

  var sn = [0, 3, 10, 15, 20].get(i) % scaleSize;
  var cs = structs.get(i);
  if (i > 50) {
    currentScale = randomInt(scaleSize);
  }
  var s = getDiatonicScale(currentScale, 1);
  var ret = genChordFromRoots(cs, s, exp, root, cnt);

  var current = JSON.parse(JSON.stringify(ret));
  current = current.sort(function(a, b) {
    return a - b;
  });

  var d = difReal(last, current);
  var d2 = dif(last, current);
  if (current[2] - current[1] == 1 || current[1] - current[0] == 1 || current[2] - current[0] == scaleSize - 1) {
    return finder(i + 1, cnt, last, exp, root);
  }

  if (rDif(current[2], current[1]) == rDif(current[1], current[0])) {
    return finder(i + 1, cnt, last, exp, root);
  }

  if (rDif(current[2], current[0]) == rDif(current[1], current[2])) {
    return finder(i + 1, cnt, last, exp, root);
  }
  var minCon = 1;
  var minDif = 16;
  if (i > 100) {
    minDif = 20;
    minCon = 1;
  }

  if (d > minDif || d2 < minCon) {
    return finder(i + 1, cnt, last, exp, root);
  }
  //
  currentScale = findSimilarScale(currentScale, root, cs, exp, cnt, 1);
  // if (modulation.exists(cnt)) {
  //     currentScale = findSimilarScale(currentScale, root, cs, exp, cnt, 1);
  // }
  return ret;

}

function remove(n, ar) {
  var ret = [];
  for (var i = 0; i < ar.length; i++) {
    if (ar[i] != mod(n, 12)) {
      ret.push(ar[i]);
    }
  }
  return ret;
}

function findNote(ar, type) {
  var possibelNotes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  for (var i = 0; i < ar.length; i++) {
    if (possibelNotes.length === 0) {
      break;
    }
    var n = mod(ar[i], 12);
    if (type == 0) {
      possibelNotes = remove(n, possibelNotes);
      possibelNotes = remove(12 + n - 1, possibelNotes);
      possibelNotes = remove(n + 1, possibelNotes);
      possibelNotes = remove(n + 8, possibelNotes);
      possibelNotes = remove(n + 6, possibelNotes);

      possibelNotes = remove(12 + n - 2, possibelNotes);
      possibelNotes = remove(n + 2, possibelNotes);
    }
    if (type == 1) {
      possibelNotes = remove(n, possibelNotes);
      if (i == 0) {
        // possibelNotes = remove(12 + n - 2, possibelNotes);
        // possibelNotes = remove(n + 2, possibelNotes);
      }
      possibelNotes = remove(12 + n - 1, possibelNotes);
      possibelNotes = remove(n + 1, possibelNotes);
      possibelNotes = remove(n + 8, possibelNotes);
      possibelNotes = remove(n + 6, possibelNotes);
      possibelNotes = remove(n + 6, possibelNotes);
    }
  }
  return possibelNotes;
}

function mergeNotes(notes) {
  // notes = notes.sort(function (a, b) {
  //
  //     return a.start < b.start
  // })
  for (var i = 0; i < notes.length - 1; i++) {
    var sp = notes[i].pitch;
    var se = notes[i].start + notes[i].duration;
    for (var j = i + 1; j < notes.length; j++) {
      if (sp == notes[j].pitch && se == notes[j].start) {
        se += notes[j].duration;
        notes[i].duration += notes[j].duration;
        notes.splice(j, 1);
        j--;
      }
    }
  }
  return notes;
}

function limitNotes(notes) {
  for (var i = 0; i < notes.length - 1; i++) {
    notes[i].pitch = 48 + notes[i].pitch % 12;

  }
  return notes;
}

function genSymetricHarmony(base, struct, c, durs, seq, scale) {
  var note = 0;
  var notes = [];
  for (var i = 0; i < c; i++) {
    chords = getChord(note, struct, scale);
    note = mod((note + seq.get(i) * exp), 7);
    for (var j = 0; j < chords.length; j++) {
      notes.push(new Note(base + chords[j] % 12, durs[i].pos, durs[i].dur, 60));
    }
  }
  notes = mergeNotes(notes);
  clip.setNotes(notes);
}

function genDiatonicHarmony(base, struct, c, durs, seq) {
  var note = 0;
  var notes = [];
  var scale = getDiatonicScale(1, 4);
  for (var i = 0; i < c; i++) {
    //scale = getDiatonicScale((i * 5) % 7, 4);
    chords = getChord(note, struct, scale);
    note = mod((note + seq.get(i) * exp), 7);
    for (var j = 0; j < chords.length; j++) {
      notes.push(new Note(base + chords[j] % 12, durs[i].pos, durs[i].dur, 60));
    }
    notes.push(new Note(base + chords[0] - 12, durs[i].pos, durs[i].dur, 60));
  }
  //notes = mergeNotes(notes);
  clip.setNotes(notes);
}

Number.prototype.modDistanceMin = function(item) {
  var d1 = mod(this + 12 - item, 12);
  var d2 = mod(item + 12 - this, 12);
  if (d1 < d2) {
    return d1 * -1;
  }

  return d2;
}

Array.prototype.modClosest = function(goal) {
  var a = this.sort(function(a, b) {
    return b - a;
  });
  if (this.length === 0) {
    return [0];
  }
  return a.reduce(function(prev, curr) {
    return Math.abs(goal.modDistanceMin(curr)) < Math.abs(goal.modDistanceMin(prev)) ? curr : prev
  });
}
Array.prototype.existsMod = function(num) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] % 12 === num % 12) {
      return true
    }
  }
  return false;
}

Array.prototype.removeValueModOnce = function(val) {

  var ret = [];
  var v = 0;
  for (var i = 0; i < this.length; i++) {
    if (val % 12 == this[i] % 12) {
      v = this[i];
      break;
    }
  }
  for (var i = 0; i < this.length; i++) {
    if (v != this[i]) {
      ret.push(this[i]);
    }
  }
  return ret;
}

function voiceLead(ar1, ar2) {
  var newAr = [];
  var toA = ar2;
  for (var i = 0; i < ar1.length; i++) {
    var toB = toA;
    for (var f = 0; f < 5; f++) {
      var closest = toB.modClosest(ar1[i]);
      var lead = ar1[i] + ar1[i].modDistanceMin(closest);
      if (newAr.indexOf(lead) < 0) {
        newAr.push(lead);
        toA = toB.removeValueModOnce(closest);
        break;
      }
      toB = toB.removeValueModOnce(closest);
    }
  }
  return newAr.sort(function(a, b) {
    return a - b
  });
}

var funS = new Fun();

function resolve(ar, ci) {
  var rd = ar.reduce(function(a, b) {
    return a < b ? a : b
  });
  var ru = ar.reduce(function(a, b) {
    return a > b ? a : b
  });
  var r = [7].get(randomInt(2))
  var newAr = ar.map(function(item) {
    return item + r;
  });
  var bn = ar.reduce(function(a, b) {
    return a < b ? a : b
  });
  var tn = ar.reduce(function(a, b) {
    return a > b ? a : b
  });

  var results = [];
  for (var i = 0; i < 4; i++) {
    var vAr = voiceLead(ar, newAr);
    var vArDif = dif(ar, vAr);
    var bottomNote = vAr.reduce(function(a, b) {
      return a < b ? a : b
    }) - 200;
    var topNote = vAr.reduce(function(a, b) {
      return a > b ? a : b
    });
    results.push([vAr, vArDif, bottomNote, topNote]);
  }
  var si = 1
  if (tn > 60) {
    si = 3;
  }
  if (bn < 25) {
    si = 2;
  }
  var sResult = results.sort(function(a, b) {
    return a[si] - b[si];
  });
  return sResult[0][0];

}

function genDiatonicHarmony2(base, struct, c, durs, seq) {
  var note = 0;
  var notes = [];
  var chords = [];
  var oldAr = [];
  for (var i = 0; i < c; i++) {

    chords = finder(0, i, chords, exp, seq);
    var ar = [];
    for (var j = 0; j < chords.length; j++) {

      //notes.push(new Note(base + chords[j], durs[i].pos, durs[i].dur, 60));
      ar.push(base + chords[j]);
    }
    if (oldAr.length > 0) {
      ar = voiceLead(oldAr, ar);
    }
    for (var j = 0; j < ar.length; j++) {

      var pitch = ar[j];

      notes.push(new Note(pitch, durs[i].pos, durs[i].dur, 60));
    }
    oldAr = ar;
    var ex = findNote(ar, 1).sort(function(a, b) {
      return a - b;
    });

    notes.push(new Note(base - scaleSize + (ex.get(0) % scaleSize), durs[i].pos, durs[i].dur, 60));
    //notes.push(new Note(base + scaleSize + 2 + (chords[0] % scaleSize), durs[i].pos, durs[i].dur, 60));
    //notes.push(new Note(base + scaleSize + 5 +(chords[0] % scaleSize), durs[i].pos, durs[i].dur, 60));
    //notes.push(new Note(base + scaleSize + 9 +(chords[0] % scaleSize), durs[i].pos, durs[i].dur, 60));
  }
  // notes = mergeNotes(notes);
  clip.setNotes(notes);
}

function randSeq(c) {
  var notes = [];
  for (var a = 0; a < c; a++) {

    var chord = [];
    if (notes.length > 0) {
      var s = [1, 2, 3].shuffle();
      chord.push(notes[notes.length - s[0]].pitch % 12);
      chord.push(notes[notes.length - s[1]].pitch % 12);
    } else {
      chord.push(Math.floor(Math.random() * 12));
    }
    for (var i = 0; i < 4 - chord.length; i++) {
      var ns = findNote(chord, 0).shuffle()
      if (ns.length > 0) {
        chord.push(ns[0]);
      }
    }

    for (var j = 0; j < chord.length; j++) {
      var octav = 48;
      notes.push(new Note(octav + chord[j], a, 1, 60));
    }
  }
  notes = mergeNotes(notes);
  clip.setNotes(notes);

  return chord;
}

function genChord(notesIn) {
  var notes = [];
  for (var a = 0; a < notesIn.length; a++) {

    var chord = [notesIn[a].pitch % 12];
    if (notes.length > 0) {
      chord.push(notes[notes.length - 1].pitch % 12);
    } else {
      //chord.push(Math.floor(Math.random() * 12));
    }

    //var chord = [Math.floor(Math.random() * 12)];
    for (var i = 0; i < 3; i++) {
      var ns = findNote(chord, 0).shuffle()
      if (ns.length > 0) {
        chord.push(ns[0]);
      }
    }
    for (var j = 0; j < chord.length; j++) {
      var octav = Math.floor(notesIn[a].pitch / 12) * 12;
      notes.push(new Note(octav + chord[j], notesIn[a].start, notesIn[a].duration, 60));
    }
  }
  notes = mergeNotes(notes);
  clip.setNotes(notes);

  return chord;
}

function choose(ar) {
  return ar[Math.floor(rand() * (ar.length))];
}

function genCp() {
  var pm = [3, 2, 1];
  var ar = [0];
  var tm = 0;
  for (var i = 0; i < 100; i++) {

    if (mod(tm, 7) === 5 && ar.length > 6) {
      break;
    }
    var rnd = randomInt(100);
    if (rnd > 90) {
      tm = tm + choose(pm);
    } else {
      tm = tm + (choose(pm) * -1);
    }
    ar.push(tm)
  }
  return ar;
}

function genChord2(notesIn) {
  var notes = [];
  var d1 = getDurs(notesIn.length, notesIn.length * 10)
  for (var a = 0; a < notesIn.length; a++) {

    var chord = [notesIn[a] % 12];

    //var chord = [Math.floor(Math.random() * 12)];
    for (var i = 0; i < 3; i++) {
      var ns = findNote(chord, 0).shuffle()
      if (ns.length > 0) {
        chord.push(ns[0]);
      }
    }
    for (var j = 0; j < chord.length; j++) {
      var octav = Math.floor(notesIn[a].pitch / 12) * 12;
      notes.push(new Note(48 + chord[j], d1[a].pos, d1[a].dur, 60));
    }
  }
  //notes = mergeNotes(notes);
  clip.setNotes(notes);

  return chord;
}

function harm() {
  var notes = clip.getSelectedNotes();
  genChord(notes);
}

random(Math.floor(Math.random() * 1200000));
random(24545455);

var rotateZ3D = function(theta, nodes) {
  var sinTheta = Math.sin(theta);
  var cosTheta = Math.cos(theta);
  for (var n = 0; n < nodes.length; n++) {
    var node = nodes[n];
    var x = node[0];
    var y = node[1];
    node[0] = x * cosTheta - y * sinTheta;
    node[1] = y * cosTheta + x * sinTheta;
  }
  return nodes;
};

//random(43250);
var paternSize = 1000;

function chrodProg(seq, minLen) {
  var branching = {
    2: [5],
    5: [3, 1],
    3: [1, 6],
    1: [6, 4],
    6: [4, 0],
    4: [0],
    0: [1, 2, 3, 4, 5, 6]
  }
  var last = seq[seq.length - 1];
  var lastPossibles = branching[last];
  var newProgression = lastPossibles[randomInt(lastPossibles.length)]
  seq.push(newProgression)
  if (newProgression == 0 && seq.length > minLen) {
    return seq;
  }
  return chrodProg(seq, minLen);
}

function genAlgoHarm(base, struct, c, durs, seq) {
  var note = 0;
  var notes = [];
  var chords = [];
  for (var i = 0; i < c; i++) {

    var s = getDiatonicScale(0, 1);

    var ch = [];
    for (var j = 0; j < 3; j++) {
      var note = s.get(seq.get(i) + (j * exp))
      ch.push(note);
      notes.push(new Note(base + note, durs[i].pos, durs[i].dur, 60));
    }
    var ex = findNote(ch, 1)
    notes.push(new Note(base - 12 + ch[0], durs[i].pos, durs[i].dur, 60));
    //notes.push(new Note(base - 12 -7  + (ex[0]), durs[i].pos, durs[i].dur, 60));
  }
  //notes = mergeNotes(notes);
  clip.setNotes(notes);
}

function genAlgoChords(b1, b2, s, base, i) {
  var s1 = chrodProg([2], 3);

  var len = b1 * b2;

  clip = new Clip(0, i, len, false);
  var d1 = genRythm(b1, b2, len, 10)
  var steps = s1.length;
  genAlgoHarm(base, s, steps, d1, s1);
}

function genDiatonicTrack(b1, b2, s, base, sm) {
  var s1 = genCp();
  s1 = s1
  var len = b1 * b2;

  var d1 = genRythm(b1, b2, len, 1000)
  var steps = s1.length;
  genDiatonicHarmony2(base, s, steps, d1, s1);
}

function genDiatonicTrack2(beats, len, s, base) {
  var d1 = getDurs(beats, len)

  var steps = d1.length;
  var s1 = genSeq(steps);
  genDiatonicHarmony(base, s, steps, d1, s1);
}

function genSymetricTrack(b1, b2, s, base, sm) {
  var symScale = getSymetricScale(3, [2, 2]);
  var len = b1 * b2;
  var d1 = genRythm(b1, b2, len, sm)

  var steps = d1.length;
  var s1 = genSeq(steps);
  genSymetricHarmony(base, s, steps, d1, s1, symScale);
}

function transformation2(ar, pos) {
  pos = pos % ar.length
  var oz = scaleSize;
  var newAr = []
  if (pos === 0) {
    var dio = Math.floor((ar[pos + 2] - ar[pos]) / scaleSize) + 1;
    newAr.push(ar[pos + 2] - (oz * dio));
  } else {
    newAr.push(ar[pos - 1])
  }
  if (pos === ar.length - 1) {
    var dio = Math.floor((ar[pos] - ar[pos - 2]) / scaleSize) + 1;
    newAr.push(ar[pos - 2] + (oz * dio))
  } else {
    newAr.push(ar[pos + 1])
  }
  ar[pos] = (newAr[1] - ar[pos]) - (ar[pos] - newAr[0]) + ar[pos];
  return ar;
}

function genRolandSequnce(base, transSeq) {
  current = getChord(0, [0, 1, 2], getDiatonicScale(0, 1));
  var seq = [4];
  var notes = [];
  var pos = 0;
  transSeq = [0, 1, 3, 2, 1, 4, 5, 1, 2, 3, 2, 3, 2, 4, 2, 32, 31, 23].shuffle()
  // transSeq = [];
  // for (var i = 0; i < 50; i++) {
  //     transSeq.push(i % 3);
  // }
  //    transSeq = transSeq.shuffle();

  for (var i = 0; i < 10; i++) {
    var mul = 1 + (i / 500);
    mul = 1
    var len = seq.get(i);
    for (var j = 0; j < current.length; j++) {
      notes.push(new Note(base + Math.round(current[j] * mul, 0), pos, len, 60));
    }
    var ns = findNote(current, 1)
    notes.push(new Note(base + ((current.get(0) - scaleSize) * mul), pos, len, 60));

    for (var j = 0; j < 2; j++) {
      var ne = transformation2(current, transSeq.get(i + (j * 2)))
      ne.sort(function(a, b) {
        return a - b;
      });
      //ne = resolve(current,ne)
      current = ne;
    }

    pos += len;
    if (pos >= paternSize) {
      break;
    }
  }
  //notes = mergeNotes(notes);
  clip.setNotes(mergeNotes(notes));
}

function genRihmanSequnce(base, transSeq, mid, low, high) {
  current = [0, 4, 7];
  isMajor = false;

  var seq = [4];
  var notes = [];
  var pos = 0;

  for (var i = 0; i < 1000; i++) {
    var len = seq.get(i);

    if (mid) {
      for (var j = 0; j < current.length; j++) {
        notes.push(new Note(base + mod(current[j], 12), pos, len, 60));
      }
    }

    var ns = findNote(current, 1).shuffle()
    var currentSorted = [current[0], current[1], current[2], ns[0]];
    currentSorted.sort(function(a, b) {
      return mod(a, 12) - mod(b, 12);
    });

    if (high) {
      notes.push(new Note(base + 12 + mod(currentSorted[1], 12), pos, len, 60));
    }
    if (low) {
      notes.push(new Note(base - 12 + mod(currentSorted[0], 12), pos, len, 60));
    }
    var ts = transSeq.get(i);
    ts.length.times(function(m) {
      transform(ts[m]);
    })
    pos += len;
    if (pos >= paternSize) {
      break;
    }
  }
  notes = mergeNotes(notes);
  clip.setNotes(notes);
}

function genEuclideanRythmDurs(steps, pulses, rotate) {
  var dev = 1;
  var seq = euclid(steps, pulses, rotate);
  var ar = [];
  for (var i = 1; i < seq.length; i++) {
    ar.push((seq[i].pos - seq[i - 1].pos) / dev);
  }

  ar.push((steps - seq[seq.length - 1].pos) / dev);
  return ar;
}

function genEuclideanRythm(base, steps, pulses, rotate) {
  var seq = euclid(steps, pulses, rotate);
  var notes = [];
  for (var i = 0; i < seq.length; i++) {
    notes.push(new Note(base, seq[i].pos / 4, seq[i].len / 4, 60));
  }
  clip.setNotes(notes);
}

Array.prototype.range = function(start, end) {
  for (var i = start; i < end; i++) {
    this.push(i)
  }
  return this;
}
Array.prototype.removeValue = function(val) {
  var ret = [];
  for (var i = 0; i < this.length; i++) {
    if (val != this[i]) {
      ret.push(this[i]);
    }
  }
  return ret;
}

Array.prototype.removeValues = function(values) {
  var ret = [];
  for (var i = 0; i < this.length; i++) {
    if (!values.contains(this[i])) {
      ret.push(this[i]);
    }
  }
  return ret;
}

Array.prototype.closest = function(goal, up) {
  if (up > 0.5) {
    this.sort(function(a, b) {
      return b - a;
    });

  }
  if (this.length == 0) {
    return goal;
  }
  return this.filter(function(it) {
    return it !== goal;
  }).reduce(function(prev, curr) {
    return (Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev);
  });
}

Array.prototype.closestMatch = function(goal, up) {
  if (up > 0.5) {
    this.sort(function(a, b) {
      return b - a;
    });

  }
  if (this.length == 0) {
    return goal;
  }
  return this.reduce(function(prev, curr) {
    return (Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev);
  });
}

Array.prototype.containsOne = function(item) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] % 12 === item % 12) {
      return true
    }
  }

  return false;
}

Number.prototype.modDistance = function(item) {
  var d1 = mod(this - item, 12);
  var d2 = mod(item - this, 12);

  return [d1, d2];
}

function isInt(value) {
  if (isNaN(value)) {
    return false;
  }
  var x = parseFloat(value);
  return (x | 0) === x;
}

function isSus(ar, num) {
  if (ar.length < 2) {
    return false;
  }

  var a = []

  for (var i = 0; i < ar.length - 1; i++) {
    for (var j = 1; j < ar.length; j++) {
      var modDis = ar[i].modDistance(ar[j]);
      a = a.concat(modDis);
    }
  }

  for (var i = 0; i < ar.length; i++) {
    var modDis = ar[i].modDistance(num);
    if ((a.indexOf(modDis[0]) > -1 && modDis[0] < 4) || (a.indexOf(modDis[1]) > -1 && modDis[1] < 4)) {
      return true;
    }
    a = a.concat(modDis);
  }
  return false;

}

function isSus2(ar, num) {
  if (ar.length < 2) {
    return false;
  }

  var notes = ar.deep().map(function(item) {
    return item % 12
  });
  notes = notes.filter(function(item,
                                index) {
    return notes.indexOf(item) === index
  });

  notes.push(num % 12)
  notes = notes.sort();

  var pDif = -1;
  for (var i = 0; i < notes.length - 1; i++) {
    var dif = Math.abs(notes[i] - notes[i + 1]);
    if (pDif === dif) {
      return true;
    }

    pDif = dif
  }
  return false;
}

isSus2([60, 52, 57], 50)

Array.prototype.modRemoveMin = function(elements) {
  var ret = [];

  for (var i = 0; i < this.length; i++) {
    var include = true;
    for (var j = 0; j < elements.length; j++) {
      if (
        (this[i]).modDistance(elements[j]).containsOne(1) ||
        (this[i]).modDistance(elements[j]).containsOne(6)
      ) {
        include = false;
      }
    }

    if (include) {
      ret.push(this[i]);
    }

  }
  return ret;
}

Array.prototype.multi = function(x) {
  return this.map(function(i) {
    return i * x;
  })
}

Array.prototype.mod = function(x) {
  return this.map(function(i) {
    return i % x;
  })
}

Array.prototype.modRemoveDynamic = function(elements, rElements, noSuss) {
  var ret = [];
  var contitional = function(b, p) {
    if (randomInt(10) < p) {
      return b;
    }
    return false;
  }
  for (var i = 0; i < this.length; i++) {
    var include = true;
    for (var j = 0; j < elements.length; j++) {
      for (var k = 0; k < rElements.length; k++) {
        var element = rElements[k];
        if (element > 0) {
          if (new Number(this[i]).modDistance(elements[j]).containsOne(rElements[k])) {
            include = false;
            break;
          }
        } else {
          if (
            this[i] === elements[j] - element ||
            this[i] === elements[j] + element
          ) {
            include = false;
            break;
          }
        }
      }

      if (
        this[i] === elements[j]
      ) {
        include = false;
      }
    }

    if (noSuss) {
      var sus = isSus2(elements, this[i]);
      if (sus) {
        include = false;
      }
    }
    if (include) {
      ret.push(this[i]);
    }

  }
  return ret;
}

//var a = [].range(0,24).modRemoveDynamic([0,3], [1], true)

Array.prototype.modRemove = function(elements, elem) {
  var ret = [];
  var contitional = function(b, p) {
    if (randomInt(10) < p) {
      return b;
    }
    return false;
  }
  for (var i = 0; i < this.length; i++) {
    var include = true;
    for (var j = 0; j < elements.length; j++) {

      if (
        new Number(this[i]).modDistance(elements[j]).containsOne(1) ||
        new Number(this[i]).modDistance(elements[j]).containsOne(6) ||
        this[i] === elements[j] - 2 ||
        this[i] === elements[j] + 2 ||
        this[i] === elements[j]

        //contitional((0).modDistance(elements[j]).containsOne(this[i]), 3)
      ) {
        include = false;
      }
    }

    if (true) {
      var sus = isSus2(elements, this[i]);

      if (sus) {
        include = false;
      }
    }
    if (include) {
      ret.push(this[i]);
    }

  }
  return ret;
}

Array.prototype.removeAr = function(ar) {
  var ret = [];
  for (var i = 0; i < this.length; i++) {
    if (!ar.exists(this[i])) {
      ret.push(this[i])
    }
  }
  return ret;
}

Array.prototype.modRemoveMax = function(elements) {
  var ret = [];

  for (var i = 0; i < this.length; i++) {
    var include = true;
    for (var j = 0; j < elements.length; j++) {
      if (this[i].modDistance(elements[j]).containsOne(1) ||
        (this[i]).modDistance(elements[j]).containsOne(6)
      ) {
        include = false;
      }

    }
    if (include) {
      ret.push(this[i]);
    }
  }
  return ret;
}

Array.prototype.chordIsSame = function(ar) {
  var uthis = this.filter(function(value, index, self) {
    self.indexOf(value) === index
  });
  var uAr = ar.filter(function(value, index, self) {
    self.indexOf(value) === index
  });
  var c = 0;
  for (var i = 0; i < uthis.length; i++) {
    for (var j = 0; j < uAr.length; j++) {
      if (uAr[j] % 12 === uthis[i] % 12) {
        c++;
      }
    }
  }
  if (c === this.length) {
    return true;
  }
  return false;
}

function overLaps(startA, durationA, startB, durationB) {
  if (startA < startB + durationB && durationA + startA > startB) {
    return true;
  }
  return false;
}

function getChordsOnPosDur(notes, start, dur, channel) {
  var chords = [];
  for (var i = 0; i < notes.length; i++) {
    if (notes[i].start < start + dur && notes[i].duration + notes[i].start > start && notes[i].channel != channel && notes[i].muted === 0) {
      chords.push(notes[i].pitch);
    }
  }
  return chords;
}

function getChordsOnPosition(notes, start, dur) {
  var chords = [];
  for (var i = 0; i < notes.length; i++) {
    if (notes[i].start < start + dur && notes[i].duration + notes[i].start > start) {
      chords.push(notes[i].pitch);
    }
  }
  return chords;
}

function getChordsOnCurrentPosition(notes, position) {
  var chords = [];
  for (var i = 0; i < notes.length; i++) {
    if (notes[i].start <= position && notes[i].duration + notes[i].start >= position) {
      chords.push(notes[i].pitch);
    }
  }
  return chords;
}

function getSameNotes(ar1, ar2) {
  var chords = [];
  for (var i = 0; i < ar1.length; i++) {
    for (var j = 0; j < ar2.length; j++) {
      if (ar1[i] % 12 === ar2[i] % 12) {
        var note = ar1[i] % 12;
        if (chords.indexOf(note) < 0) {
          chords.push(note);
        }
      }
    }
  }

  return chords;
}

function sin(pos, frequency, amplitude) {

  var increase = Math.PI / (400 / frequency);
  var counter = 0;

  var y = (amplitude + amplitude * Math.sin(pos * increase));
  return y;
}

function scaleGen(scaleType) {
  var pat = [2, 1, 2, 2, 2, 1, 2];
  //var pat = [1];

  //
  //  for (var i = 0; i < scaleType; i++) {
  //      pat.push(pat.shift());
  //  }
  var ret = [];
  var c = 0;
  var i = 0;
  while (c < 128) {
    ret.push(c);
    c += pat.get(i);
    i++;
  }

  return ret;
}

function generateArp(notes, seq, base) {
  var ret = [];
  var position = 0;
  var last = -12;
  for (var i = 0; i < 80000; i++) {

    var len = 0.1;
    var availableChords = getSameNotes(getChordsOnCurrentPosition(notes, position),
      getChordsOnCurrentPosition(notes, position + len))
    if (availableChords.length == 0) {
      break;
    }
    var extas = [].range(0, 127).modRemove(availableChords)
    availableChords = availableChords.concat(extas);
    var closest = remove(last, availableChords).closest(last, 0);
    ret.push(new Note(closest + base, position, len, 40 + sin(i + 20, 200, 20)));
    last = closest;
    position += seq.get(i);
  }
  return ret;

}

function pedalNotes(notes) {
  var ps = [];
  var ret = [];
  var start = 0;
  var end = 0;
  var last = [];
  notes = notes.sort(function(a, b) {
    a.start - b.start
  })
  for (var i = 0; i < notes.length; i++) {
    var p = notes[i].pitch;

    ps.push(p);
    var s = [].range(0, 127);
    var an = s.modRemoveMax(ps);

    if (an.length < 35) {
      ps = [];
      var cl = notes[0].pitch;

      if (ret.length > 0) {
        cl = ret[ret.length - 1].pitch;
      }
      ret.push(new Note(last.closest(cl, 1), start, end - start, 100, 0, 0));
      start = end;
    }
    last = an;
    end = notes[i].start + notes[i].duration;
  }
  return ret;

}

function pn(notes) {
  var ps = [];
  var ret = [];
  var start = 0;
  var end = 0;
  var last = [];
  notes = notes.sort(function(a, b) {
    a.start - b.start
  })
  for (var i = 0; i < notes.length; i++) {
    var p = notes[i].pitch;

    ps.push(p);
    var s = [].range(0, 127);
    var an = s.modRemoveMax(ps);

    if (an.length < 40) {
      ps = [];
      var cl = notes[0].pitch;

      if (ret.length > 0) {
        cl = ret[ret.length - 1].pitch;
      }
      ret.push(new Note(last.closest(cl, 1), start, end - start, 100, 0, 0));
      start = end;
    }
    last = an;
    end = notes[i].start;
  }
  return ret;

}

var cs = [36, 48, 48 + 4, 48 + 7, 48 + 12];

var js = [48, 48 + 4, 48 + 7];

function smoothChorder() {
  var fun = new Fun();
  var fun2 = new Fun();
  var c = JSON.parse(JSON.stringify(cs));
  var notes = [];
  var notes2 = [];
  var notesChannels = c.map(function(item) {
    return []
  });
  var len = 4;
  var pos = 0;
  var rots = 0;
  var lens = [];
  var start = 0;
  for (var i = 0; i < 80; i++) {
    var a1 = [8, 16, 24].get(i.dev(1));
    var a2 = [8, 16, 24].get(i.dev(1));

    lens = lens.concat(genRythm(a1, a2, 1000, 1000, start))
    start += a1 * a2;

  }

  // for (var i = 0; i < 60; i++) {
  //     var len = fun2.get(100)/10.0;
  //
  //     lens = lens.push({dur:len, pos:start})
  //     start += len;
  // }

  var rot = [0, 1, 3, 0, 1, 2, 4, 2, 3, 1, 2, 3, 4];
  var lastChangeIndex = -10;

  for (var i = 0; i < lens.length - 1; i++) {
    // lens = genRythm(randomInt(15)+1, 5, 10, 1000);
    len = lens.get(i);
    var newAr = c;
    for (var x = 0; x < 1; x++) {

      for (var j = 0; j < 100; j++) {
        var changeIndex = [0, 1, 3, 2, 4].get(i);// [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025, 121393, 196418, 317811, 514229, 832040, 1346269, 2178309, 3524578, 5702887, 9227465, 14930352, 24157817, 39088169, 63245986, 102334155].get(randomInt(1333));

        var oldValue = newAr.get(changeIndex);
        newAr = newAr.removeValue(oldValue)
        var upper = oldValue < 60 ? 1 : 0;
        var scl = getDiatonicScale(0, 12);
        var scl = scaleGen(0);
        // var scl = [].range(26,80)
        //var bosArr = scl.modRemove(newAr, true);
        var bosArr = scl.modRemoveMin(js.take(2)).modRemove(newAr, true);

        var ne = bosArr.closest(oldValue, upper);

        if (oldValue === ne) {
          log('err')
        }

        var limtier = 1 + randomInt(2) + (j / 100 * 8);
        if (Math.abs(oldValue - ne) < 100 && lastChangeIndex != changeIndex) {

          newAr.push(ne);
          //if (i % (3 * 4) === 0)
          //newAr = resolve(newAr, changeIndex);
          lastChangeIndex = changeIndex;
          c = newAr.sort(function(a, b) {
            return a - b;
          });
          break;
        } else {
          newAr.push(oldValue);
          c = newAr.sort(function(a, b) {
            return a - b;
          });
        }
        js = newAr;
      }
    }

    for (var j = 0; j < c.length; j++) {
      var hu = rand() / 10.0;
      var hu2 = 2
      notesChannels[j][i] = (new Note(c[j], len.pos, len.dur, 30 + randomInt(20)))
      //notes.push(new Note(c[j], len.pos + j / hu2 + hu, len.dur - j / hu2 + hu, 30 + randomInt(20)));
      notes.push(new Note(c[j], len.pos + rand() * 0.5, len.dur, 30 + Math.floor(sin((j + 1) * i, 20, 20))));
      notes2.push(new Note(c[j], len.pos, len.dur, 60));
    }
  }

  var n = JSON.parse(JSON.stringify(notes2));
  var n2 = JSON.parse(JSON.stringify(notes2));
  // clip = new Clip(0, 0, 1000, false);
  // clip.setNotes(pedalNotes(notes));
  // clip = new Clip(6, 1, 1000, false);
  // clip.setNotes((notes2));
  // clip = new Clip(7, 1, 1000, false);
  // clip.setNotes((notes2.randNotes()));
  // clip = new Clip(8, 1, 1000, false);
  // clip.setNotes((notes2));
  clip = new Clip(1, 1, 1000, false);
  clip.setNotes((notes2));

  // clip = new Clip(1, 0, 1000, false);
  // clip.setNotes(limitNotes(notes2));
  // clip = new Clip(2, 4, 1000, false);
  // clip.setNotes(generateArp(notes2, [0.25, 0.75, 1, 0.5, 0.5], 36));
  // clip = new Clip(2, 4, 1000, false);
  // clip.setNotes(generateArp(n2, [1, 2, 1, 3, 3].map(function (it) {
  //     return it / 4
  // }), 48));

  // clip = new Clip(1, 0, 1000, false);
  // clip.setNotes(limitNotes(n2));
  //

  for (var i = 0; i < notesChannels.length; i++) {
    clip = new Clip(i + 2, 1, 1000, false);
    clip.setNotes(mergeNotes(notesChannels[i]));
  }

}

function genRandomIntAr(len) {
  var ret = [];
  var rf = randomInt(10);

  for (var i = 0; i < 600; i++) {
    var r = [1, 2, 4, 0.5].multi(1).get(randomInt(10));
    // var r = rand() * 10;
    //var r = 0.25 + sin(i, rf, 10)
    var tl = len - r;
    if (tl <= 0) {
      if (len > 0) {
        ret.push(len);
      }
      return ret;
    } else {
      ret.push(r)
      len = tl;
    }
  }
  return ret;

}

function genSameLenRan(len, cnt) {
  var ar = []
  var r = genRandomIntAr(len)
  for (var i = 0; i < cnt; i++) {
    //ar = ar.concat(r.shuffle())
    r.unshift(r.pop())
    ar = ar.concat(r);
  }
  return ar;
}

Array.prototype.times = function(v, t, s) {
  var ret = [s]
  for (var i = 0; i < t; i++) {
    ret.push(v)
  }
  return ret;
}

function mapMod(ar, o) {
  for (var i = 0; i < ar.length; i++) {
    ar[i].pitch = (ar[i].pitch % 12) + (o * 12)
  }
  return ar;
}

Array.prototype.removeCorossings = function(value, currentNotes) {
  if (currentNotes.length == 0) {
    return this;
  }
  currentNotes.push(value);
  var sorted = currentNotes.sort(function(a, b) {
    return a - b;
  })
  var index = sorted.lastIndexOf(value);
  var smaller = sorted[index - 1];
  var larger = sorted[index + 1];
  var ret = this;
  if (typeof smaller !== 'undefined') {
    ret = ret.filter(function(item) {
      return item > smaller;
    })
  }
  if (typeof larger !== 'undefined') {
    ret = ret.filter(function(item) {
      return item < larger;
    })
  }

  return ret;
}

Array.prototype.scale = function(min, max) {
  var r = [];
  for (var j = min; j < max; j++) {
    for (var i = 0; i < this.length; i++) {
      r.push((this[i] % 12) + (12 * j));
    }
  }
  return r;
}

Array.prototype.voiceLead = function(prev) {
//   var s = this.scale(Math.floor(Math.min(...prev) / 12) - 1, Math.floor(Math.max(...prev) / 12) + 1);
  var s = this.scale(0, 8);
  var r = prev.map(function(item) {
    var c = s.closestMatch(item, 0);
    s = s.filter(function(it) {
      return it !== c
    })
    return c;
  })

  return r;
}

Array.prototype.randNotes = function() {

  for (var i = 0; i < this.length; i++) {
    this[i].start += rand() * 0.001
  }

  return this;
}

Array.prototype.modTo = function(b) {
  for (var i = 0; i < this.length; i++) {
    this[i].pitch = b + this[i].pitch % 12
  }

  return this;
}

Array.prototype.arp = function(seq) {
  var seqMaxLen = this.sort(function(a, b) {
    return b.start - a.start;
  })[0].start;
  var currentPostion = 0;
  var notes = [];
  var i = 0;
  while (currentPostion < seqMaxLen) {
    var dur = seq.get(i);
    var currentChord = getChordsOnPosition(this, currentPostion, dur);
    var note = [].range(36, 60).modRemoveMin(currentChord).get(i % 3);
    if (note) {
      notes.push(new Note(note, currentPostion, dur, 60, 0, 0));
    }
    i++;
    currentPostion += dur;
  }

  return notes;
}
Number.prototype.dev = function(num) {
  return Math.floor(this / num);
}

function genDurSeq(d, l) {
  var ar = [];
  for (var i = 0; i < 20; i++) {

    var a = genRandomIntAr(d.getR())
    for (var j = 0; j < l; j++) {
      ar = ar.concat(a);
    }
  }
  return ar;
}

function getHarmSeq(d) {
  var seqs = [
    [1, 2, 6, 10, 11],
    [1,6, -2, -3, -8],
    [1, 6, 8],
    [1, 6],
    [1, 6],
    [1],
    [1, -2, -3, 6, -8],
    [1, -2, -3, 6, -8],
  ];

  return seqs.get(1);

}

function genScale(ap) {
  var ar = [];
  // var ap = [0, 3, 7];
  for (var i = 3; i < 8; i++) {
    for (var j = 0; j < ap.length; j++) {
      ar.push(ap[j] + 12 * i);
    }
  }

  return ar;

}

function morseTue(cnt, mod, multi, base) {

  return (cnt % mod * multi).toString(base).toString().split('1').length - 1;
}

function genMT() {
  var ar = [];
  for (var i = 0; i < 100; i++) {
    ar.push(morseTue(i, 10, 2, 2))
  }
  return ar;
}

function getModPos(mod, pos) {
  return Math.floor(pos / mod) * mod;
}

function baseScaler(old, cElm) {
  //return old;

  var a = [0, 3, 7];
  var cd = [7,3,0].get(Math.floor(cElm.start % 8));

  // var b = a.map(function(i) {
  //   return mod(i - cd, 12);
  // })

  var b = a.map(function(i) {
    return transformMod(i, cd) ;
  })

  return  b;

  var ps = getModPos(8, cElm.start);
  if (overLaps(ps + 7, 1, cElm.start, cElm.duration)) {
    //return old;

    //
    // return old.map(function(i){
    //   return mod(i-(ps % 12), 12);
    // })
    return [7, 11, 2];
    // var tp = [7].get(i);
    // baseScale = baseScale.map(function (item) {
    //     return transformMod(item, tp);
    //
    // })
    // var tp = [7, 11, 2].get(i);
    // baseScale = baseScale.map(function(item) {
    //   return transformMod(item, tp);

    // })

  } else if (overLaps(ps, 1, cElm.start, cElm.duration)) {
    return [0, 4, 7];
    //
    return old.map(function(i) {
      return mod(i - 7, 12);
    })
  } else {

    var a = [0, 4, 5, 7];
    var cd = [7,4,3].get(Math.floor(cElm.start % 8));

    // var b = a.map(function(i) {
    //   return mod(i - cd, 12);
    // })

    var b = a.map(function(i) {
          return transformMod(i, cd) ;
        })

    return  b;
    //return old;
    //return [0,3,7];
    //  return old.map(function(i) {
    //    return transformMod(i, (ps*7) % 12) ;
    //  })
    // var tp = [0, 3, 7].get(i);
    // baseScale = baseScale.map(function (item) {
    //     return transformMod(item, tp);
    //
    // })

    return [0, 2, 4, 5, 7, 9, 11];
    //  baseScale = [0,2,4,5,7,9,11];
    //return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  }
}

function harmoniseNotes() {
  var ds = genScale([0, 4, 7, 11]);
  var s = [].range(0, 8).map(function(item) {
    var s = morseTue(item, 3333, 32323232, 2);
    return ds[s];
  });

  //[0, -1, -3, -1]
  var bn = 24;
  var p = genRandomIntAr([8].getR());

  // var ar = addLayers(10 + bn, [].times(4,100,0), s, 0)
  //         .concat(addLayers(7 + bn, [].times(4,100,2), s, 1))
  //         .concat(addLayers(4 + bn,  [].times(4,100,4), s, 2))
  //         .concat(addLayers(0 + bn,  [].times(4,100,6), s, 3))
  // ;

  var sdd = 4;

  var sss = [2, 0.5, 2.5];
  var prevNotes = new Stack(2);

  var stackSize = 1;
  var voiceLasts = [new Stack(stackSize), new Stack(stackSize), new Stack(stackSize), new Stack(stackSize)]

  var rythm = genMT();
  //

  // var ar = addLayers(10 + bn, sss.multi(1), s, 0)
  //     .concat(addLayers(4 + bn, sss.multi(2), s, 1))
  //     .concat(addLayers(7 + bn, sss.multi(4), s, 2))
  //     .concat(addLayers(0 + bn, sss.multi(8), s, 3))

  // var ar = addLayers(11 + bn, genDurSeq([8], 50), s, 0)
  //     .concat(addLayers(4 + bn, genDurSeq([8,4], 4), s, 1))
  //     .concat(addLayers(7 + bn, genDurSeq([8,2,2], 3), s, 2))
  //     .concat(addLayers(0 + bn, genDurSeq([8,2,2], 2), s, 3))
  // //
  // var ar = addLayers(11 + bn, genRandomIntAr(8), s, 0)
  //   .concat(addLayers(4 + bn, genRandomIntAr(8), s, 1))
  //   .concat(addLayers(7 + bn, genRandomIntAr(8), s, 2))
  //   .concat(addLayersM(bn - 0, genRandomIntAr(8), s, 3, 1))

  var ar = generateLayer(60, [2])

  // var ar = addLayers(11 + bn, [2,1,1,4], s, 0)
  //   .concat(addLayers(4 + bn, [2,1,4,1], s, 1))
  //   .concat(addLayers(7 + bn, [1,1,2,4], s, 2))
  //   .concat(addLayers(0 + bn, [4,1,2,1], s, 3));


  //
  // var ar = addLayersM(24 + bn, [1, 0, 5, 0, 5], s, 0, 0)
  //     .concat(addLayers(7 + bn, [2], s, 1))
  //     .concat(addLayers(4 + bn, [4], s, 2))
  //     .concat(addLayers(0 + bn, [2], s, 3));

  // var ar = addLayers(36 + bn, genEuclideanRythmDurs(16, 5, 0), s, 0)
  //     .concat(addLayers(24 + bn, genEuclideanRythmDurs(16, 7, 0), s, 1))
  //     .concat(addLayers(12 + bn, genEuclideanRythmDurs(16, 3, 0), s, 2))
  //     .concat(addLayers(0 + bn, genEuclideanRythmDurs(16, 9, 0), s, 3))

  // var ar = addLayers(24 + 7 + bn, [2], s, 0)
  //     .concat(addLayers(19 + bn, [1], s, 1))
  //     .concat(addLayers(12 + bn, [4], s, 2))
  //     .concat(addLayers(0 + bn,  [8], s, 3))

  //
  ar = ar.sort(function(a, b) {
    return a.start - b.start
  })

  var baseScale = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  for (var i = 0; i < ar.length; i++) {
    if (ar[i].muted == 1) {

      baseScale = baseScaler(baseScale, ar[i]);

      var chn = [];

      var leed = ar[i].pitch

      var chn = chn.concat(getChordsOnPosDur(ar, ar[i].start, ar[i].duration, ar[i].channel))

      var closest = ar[i].pitch;

      var lastOnSameChannel = ar.filter(function(n) {
        return n.channel === ar[i].channel && n.muted === 0 && n.start < ar[i].start
      }).sort(function(a, b) {
        return b.start - a.start
      })[0];

      if (lastOnSameChannel) {
        lead = lastOnSameChannel.pitch;
        closest = lead
      }

      ar[i].muted = 0;

      var modRemove =
        genScale(baseScale)

          //[].range(0, 120)
          //[].range(limit(closest - 12), limit(closest + 12))
          .modRemoveMin(prevNotes.get())
          .modRemoveDynamic(chn, getHarmSeq(Math.floor(ar[i].start)), true);

      if (randomInt(5) > 1) {
        modRemove = modRemove.removeAr(voiceLasts[ar[i].channel].get());

      }

      // var modRemove = [].range(27, 80).modRemoveMin(prevNotes.get()).modRemoveDynamic(chn, getHarmSeq(i.dev(1)), true);

      //var modRemove = getDiatonicScale(0, 12).modRemoveDynamic(chn, getHarmSeq(i.dev(4)), true);

      //
      //var modRemove = [].range(34, 80).modRemoveMin(last).modRemove(chn);
      //  var modRemove = scaleGen().modRemoveMin([7]).modRemove(chn);

      // var parcnt = Math.floor(i / 7)
      // var modRemove = getDiatonicScale(1  , 12).modRemove(chn);
      if (modRemove.length < 1) {
        modRemove = [].range(0, 120)
          .modRemoveMin(prevNotes.get())
          .modRemoveDynamic(chn, [1, -2, -8, 6], true);
        // ar[i].muted = 1;
        // ar[i].velocity = 0;
        // log("error");
      }
      var u = rand();
      if (closest > 50) {
        u = 0;
      }

      var r = ar[i].channel  === 0 ? modRemove.closest(closest, u) : modRemove.closest(closest, u);
      if (Math.abs(r - closest) > 7) {
        r = [].range(0, 120)
          .modRemoveMin(prevNotes.get())
          .modRemoveDynamic(chn, [1, 6], true)
          .closest(closest, u);
      }

      ar[i].pitch = r;
      prevNotes.put(r);
      voiceLasts[ar[i].channel].put(r);
    }
  }

  var cl = 1000;
  // clip = new Clip(0, 0, cl, false);
  // clip.setNotes(mergeNotes(ar.map(function (it) {
  //     it.start = it.start + rand() * 0.01
  //     //it.pitch = it.pitch%12
  //     return it
  // })));
  var cliii = 2;

  clip = new Clip(0, cliii, cl, false);
  clip.setNotes((ar.deep().randNotes()));

  clip = new Clip(1, cliii, cl, false);
  clip.setNotes((ar.deep().modTo(36)));
  clip.setNotes((ar.deep().modTo(48)));

  clip = new Clip(6, cliii, cl, false);
  clip.setNotes(pedalNotes(ar.deep()));
  // clip.setNotes(ar.deep().arp([1]));
  // clip = new Clip(5, 0, cl, false);
  // clip.setNotes(pn(ar));
  // clip = new Clip(6, 0, cl, false);
  // clip.setNotes(mergeNotes(ar));
  // clip = new Clip(7, 0, cl, false);
  // clip.setNotes(mergeNotes(ar));

  for (var i = 0; i < 4; i++) {

    clip = new Clip(i + 2, cliii, cl, false);
    if (i === 3) {
      clip.setNotes((
        ar.filter(function(n) {
          return n.channel === i
        })));
    } else {
      clip.setNotes((ar.filter(function(n) {
        return n.channel === i
      })));
    }

  }
}

function durdev(durs, dev) {
  var rd = []
  for (var i = 0; i < durs.length; i++) {
    var it = durs[i]
    if (it > 2) {

      for (var j = 0; j < dev; j++) {
        rd.push(it / dev)
      }
    } else {
      rd.push(it)
    }
  }
  return rd;
}

function melodyHarm() {
  var c = new Clip(0, 0, paternSize, true);
  var pnotes = c.getSelectedNotes().map(function(item) {
    item.channel = -1
    item.muted = 0
    return item;
  });

  pnotes = pnotes.sort(function(a, b) {
    return a.start - b.start
  })

  var durs = pnotes.map(function(item) {
    return item.duration;
  });

  var ar = pnotes

    .concat(addLayers(48, durdev(durs, 4), [0, 1], 0))
    .concat(addLayers(48 + 7, durdev(durs, 3), [0, 1], 1))
    .concat(addLayers(48 - 7, durdev(durs, 2), [0, 1], 2))

  ar = ar.sort(function(a, b) {
    return a.start - b.start
  })

  var last = [];

  for (var i = 0; i < ar.length; i++) {
    if (ar[i].channel != -1) {

      var chn = getChordsOnPosDur(ar, ar[i].start, ar[i].duration, ar[i].channel)
      var closest = ar[i].pitch;

      var lastOnSameChannel = ar.filter(function(n) {
        return n.channel === ar[i].channel && n.muted === 0 && n.start < ar[i].start
      }).sort(function(a, b) {
        return b.start - a.start
      })[0];

      if (lastOnSameChannel) {
        var lead = lastOnSameChannel.pitch;
        closest = lead
      }
      ar[i].muted = 0;

      var modRemove = genScale([0, 3, 7])
        // [].range(32, 80)
        .modRemoveMin(last).modRemoveDynamic(chn, getHarmSeq(Math.floor(ar[i].start)), true);
      //var modRemove = [].range(34, 90).modRemoveMin(last).modRemove(chn);
      //  var modRemove = scaleGen().modRemoveMin([7]).modRemove(chn);

      // var parcnt = Math.floor(i / 7)
      // var modRemove = getDiatonicScale(1, 12).modRemove(chn);
      if (modRemove.length < 1) {
        ar[i].muted = 1;

        ar[i].velocity = 0;
        log("error");
      }
      var u = rand();
      if (closest < 40) {
        u = 1
      }

      var r = modRemove.closest(closest, u);
      if (Math.abs(closest - r) > 5) {
        ar[i].muted = 1;
        ar[i].velocity = 0;
        log("error");
      }

      ar[i].pitch = r;
      last = []
      last.push(ar[i].pitch)
      if (i > 1) {
        last.push(ar[i - 1])
        last.push(ar[i - 2])
      }

    }
  }

  var cl = 100

  clip = new Clip(1, 0, cl, false);
  clip.setNotes(mergeNotes(ar));

  for (var i = 0; i < 4; i++) {

    clip = new Clip(i + 2, 0, cl, false);
    if (i === 3) {
      clip.setNotes((
        ar.filter(function(n) {
          return n.channel === i
        })));
    } else {
      clip.setNotes((ar.filter(function(n) {
        return n.channel === i
      })));
    }

  }
}

function addLayers(base, rythm, f, ch) {
  return addLayersM(base, rythm, f, ch, 1);
}

function addLayersM(base, rythm, f, ch, muted) {
  var ar = [];
  var ff = new Fun();
  var pos = 0;
  var c = 0;
  var sf = randomInt(60) + 1;

  var mtm = randomInt(10000) + 1;

  var sf2 = randomInt(30) + 1;
  while (pos <= 600) {
    var n = base + f.get(c);
    var d = rythm.get(c);
    var v = 80 + sin(c, sf, 20);
    ar.push(new Note(n, pos, d, 42 + randomInt(12), muted, ch));
    pos += d;
    c++;
  }

  return ar;
}

function generateLayer(base, rythm) {
  var ar = [];
  var ff = new Fun();
  var pos = 0;
  var c = 0;
  var sf = randomInt(60) + 1;
  var f = new Fun();

  var lpos = [0, 0.5, 1, 1.5]
  var sf2 = randomInt(30) + 1;
  while (c <= 600) {
    for (var j = 0; j < lpos.length; j++) {
      var n = base + f.get(c);
      var d = rythm.get(c);
      ar.push(new Note(n, lpos[j], d, 60 + (rand() * 30), 1, j));
      lpos[j] += d;
      c++;
    }

  }
  return ar;

}

function limitTo(n, t) {

}

function limit(v) {
  if (v > 60) {
    return 60
  }
  return v;
}

function trepp() {
  var notes = []
  var b = 60;
  var s = [b, b + 4, b + 7];
  notes.push(s.concat([b - 12]))
  for (var i = 0; i < 23; i++) {
    s = resolve(s, 0)
    var low = s.sort()[0] - 12

    notes.push(s.concat([low]))
  }
  var seq = []
  var start = 0;
  var dur = 2;
  for (var i = 0; i < notes.length; i++) {
    var low = notes[i].sort()[0]
    seq.push(new Note(low, start, dur, 60 - (i / notes.length) * 60, 0, 0))
    seq.push(new Note(low + 24, start, dur, limit((i / (notes.length / 2.8)) * 60), 0, 0))
    for (var j = 0; j < notes[i].length; j++) {
      // seq.push(new Note(notes[i][j],start, dur, 60 - (i/notes.length)*60 ,0,0 ))
      // seq.push(new Note(notes[i][j] + 24,start, dur, limit((i/(notes.length/2.8))  *60) ,0,0 ))
    }
    start += dur;
  }
  clip = new Clip(4, 0, 100, false);
  clip.setNotes((seq));
}

// function modMap(a, b) {
//     var diff = Math.abs(b % 12 - a % 12);
//     return ((diff < 6) ? a + diff : a - (12 - diff));
// }

function modMap(a, b) {
  var dif = Math.abs(a - b) % 12;
  var min = Math.min(dif, 12 - dif)
  var sign = a - b > 0 ? -1 : 1;
  return dif > 6 ? a - min * sign : a + min * sign;
}

function transform(v, p) {
  return 2 * p - v;
}

function transformMod(v, p) {
  return mod(2 * p - v, 12);
}

function trans() {
  var c = new Clip(0, 0, 100, false);
  //var pnotes = c.getSelectedNotes()
  var pnotes = [60, 63, 67, 72];
  var ar = [];
  var len = 8;
  for (var i = 0; i < 20; i++) {
    var tp = pnotes.get(randomInt(120));
    var nn = pnotes.map(function(item) {
      ar.push(new Note(item, i * len, len, 60, 0, 0));
      return transform(item, tp);
    });
    var vl = nn.voiceLead(pnotes);
    pnotes = vl;
  }
  c.setNotes(ar);

}

random(80999);
//trans();
// for (var i = 0; i < 3; i++) {
//     trans();
// }

///trepp();
//
//melodyHarm()

//1

// //createClip(0,4,100);
//
var s = [[L, R]];
//

// for (var i = 0; i < 5; i++) {
//     random(i + 2334432);
//     clip = new Clip(0, i, 1, false);
//     genDiatonicTrack(6, 11, [0, 1, 2], 48, 2);
// }

harmoniseNotes();

//smoothChorder();

// for (var i = 0; i < 5; i++) {
//     genAlgoChords(4, 4, [randomInt(6)], 60, i);
// }
//

// clip = new Clip(0, 3, paternSize, false);
// genRolandSequnce(48, s);

//genRihmanSequnce(48, s, true, true, true);
//clip = new Clip(0, 0, paternSize,false);
//genRihmanSequnce(48, s, true, true);
// clip = new Clip(2, 0, paternSize,false);

// genRihmanSequnce(48, s, true, false, true);
//
// //
// // var slot = 0
// // clip = new Clip(3, slot, 16,false);
// // genEuclideanRythm(36, 16,5,0);
// // clip = new Clip(3, slot, 16,true);
// // genEuclideanRythm(39, 16,2,4);
// // clip = new Clip(3, slot, 16,true);
// // genEuclideanRythm(42, 16,13,0);
//clip = new Clip(0, 0, paternSize,false);
//
//genChord2([0]);

//genEuclideanRythm(39, 16,14,0);
//genEuclideanRythm(38, 16,2,4);
//genEuclideanRythm(44, 16,9,2);

//genRihmanSequnce(48, [[L], [R], [P], [L], [R], [L,P], [R]]);

//randSeq(60)

//genDiatonicTrack2(9, 16, [0,1,2], 36, 1);
//clip = new Clip(0, 1, paternSize, false);
// genSymetricTrack(3, 9, [0,1,2,3], 60, 1);

//genSong(3, 7, [0], 36,1);

//genDiatonicTrack(7, 4, [0,1,2], 48, 1);
//genDiatonicTrack2(8, 4, [0,1,2], 36, 1);

//genDiatonicTrack(7, 4, [0,1,2], 48, 1,1);

//genEuclideanRythm(36, 16,7,0);