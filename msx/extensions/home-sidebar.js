/*
 * Боковое меню главной — пример расширения на мосту к DOM (TS.dom / TS.keys /
 * TS.app). Открывается «влево», когда левее идти некуда (первая карточка
 * ряда, первый пункт шапки): событие nav с moved: false. В меню — подборки
 * (с общей приставкой «Кинопоиск · …» — группой), плитки категорий и разделы
 * шапки. Вверх/вниз — выбор, ОК — перейти, вправо или «Назад» — закрыть.
 * Заодно «★ 7.5» в углу постеров рядов.
 *
 * С 1.1 — под пульт: без кнопок баннера («Смотреть», «‹ ›» — с пульта до них не
 * дойти, пока листаешь ряд), карточки рядов на 20% крупнее за их счёт, «▶» на
 * карточке под фокусом, заметный фокус в шапке, значки категорий в меню и
 * «В кинотеатрах» первым пунктом категорий.
 */
TS.register({
  name: 'Боковое меню главной',
  version: '1.1',
  description: '«Влево» с края главной — меню всех подборок, категорий и разделов. Оценки на постерах, карточки крупнее, без кнопок баннера.'
});

TS.ui.addStyle([
  '#ext-sb{position:fixed;left:0;top:0;bottom:0;width:30vw;min-width:280px;max-width:520px;z-index:9000;',
  ' background:rgba(14,17,22,.97);box-shadow:8px 0 40px rgba(0,0,0,.6);overflow:hidden;',
  ' font-size:calc(14px + .45vw);color:#e8edf4;transform:translateX(-102%);transition:transform .18s}',
  '#ext-sb.open{transform:none}',
  '#ext-sb .sb-list{position:absolute;left:0;right:0;top:0;bottom:3.2em;overflow:hidden;padding:1.2em 0}',
  '#ext-sb .sb-group{padding:.9em 1.4em .3em;font-size:.72em;letter-spacing:.06em;text-transform:uppercase;color:#8b98ab}',
  '#ext-sb .sb-item{display:flex;align-items:center;padding:.5em 1.4em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '#ext-sb .sb-item.in-group{padding-left:2.2em}',
  '#ext-sb .sb-item i{margin-right:.6em;opacity:.8}',
  '#ext-sb .sb-item.cur{color:var(--focus-color,#ff8c00)}',
  '#ext-sb .sb-item.sel{background:#fff;color:#000;border-radius:0 .5em .5em 0}',
  '#ext-sb .sb-hint{position:absolute;left:0;right:0;bottom:0;padding:.9em 1.4em;font-size:.7em;color:#8b98ab;',
  ' border-top:1px solid rgba(255,255,255,.08)}',
  // Оценка — в левом верхнем углу и тем же оранжевым, что «★» в строке баннера
  '.ext-rate{position:absolute;left:.4em;top:.4em;z-index:3;padding:.15em .45em;border-radius:.4em;',
  ' background:rgba(0,0,0,.72);color:#fff;font-size:.8em;font-weight:700;line-height:1.3}',
  '.ext-rate b{color:#ff8c00;margin-right:.2em}',

  // Кнопки баннера: с пульта до них не дойти, пока листаешь ряд. Скрытые главная
  // пропускает сама (offsetParent === null) — «вверх» с ряда ведёт в ряд выше
  '#home-play-btn,#home-prev-btn,#home-next-btn{display:none!important}',

  // «▶» по центру карточки под фокусом (::after постера занят рамкой фокуса)
  '.catalog-row-card.home-card.focused:not(.home-cat-tile) .row-poster-img:before{content:"";position:absolute;',
  ' left:50%;top:50%;z-index:3;width:9vh;height:9vh;margin:-4.5vh 0 0 -4.5vh;box-sizing:border-box;',
  ' border-radius:50%;border:.35vh solid rgba(255,140,0,.9);background:rgba(0,0,0,.42);pointer-events:none}',
  '.catalog-row-card.home-card.focused:not(.home-cat-tile) .row-poster-img:after{content:"";position:absolute;',
  ' left:50%;top:50%;z-index:4;margin:-1.6vh 0 0 -.9vh;border-style:solid;border-width:1.6vh 0 1.6vh 2.6vh;',
  ' border-color:transparent transparent transparent rgba(255,140,0,.95);pointer-events:none}',

  // Фокус в шапке: у пунктов он — только цвет текста, его не отличить от текущего раздела
  'body #home-topbar .home-nav-btn.focused,body #detail-view .home-nav-btn.focused{',
  ' background:#fff!important;color:#000!important;border-radius:.45em;box-shadow:0 0 0 .4em #fff!important}',
  'body #home-topbar .home-nav-btn.focused i,body #detail-view .home-nav-btn.focused i{color:#000!important}',
  'body #home-topbar .home-nav-btn.home-nav-icon.focused,body #detail-view .home-nav-btn.home-nav-icon.focused{',
  ' border-radius:50%;border-color:#fff!important;box-shadow:none!important}',
  // Текущий раздел — всегда виден: полупрозрачная белая плашка (фокус — сплошная)
  'body #home-topbar .home-nav-btn.active:not(.focused),body #detail-view .home-nav-btn.active:not(.focused){',
  ' color:#fff!important;background:rgba(255,255,255,.2)!important;border-radius:.45em;',
  ' box-shadow:0 0 0 .4em rgba(255,255,255,.2)!important}'
].join('\n'));

var menu = null;        // { root, list, items, sel }
var opening = false;

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function splitName(name) {
  var m = /^(.+?)\s*(?:·|:|—|\|)\s*(.+)$/.exec(name);
  return m ? { prefix: m[1], rest: m[2].charAt(0).toUpperCase() + m[2].slice(1) } : null;
}

// «…В кинотеатрах» — первым пунктом категорий: самое свежее, туда заходят чаще всего
var PIN_FIRST = /в кинотеатрах$/i;

/** Подборку «…В кинотеатрах» — сразу под заголовок категорий. Нет её или категорий — как было. */
function pinFirst(out) {
  var pin = -1, head = -1;
  for (var i = 0; i < out.length; i++) {
    if (pin < 0 && !out[i].group && !out[i].click && PIN_FIRST.test(out[i].name)) pin = i;
    if (head < 0 && out[i].group) head = i;
  }
  if (pin < 0 || head < 0) return;
  var it = out.splice(pin, 1)[0];
  if (pin < head) head--;
  it.name = it.split ? it.split.rest : it.name;
  it.split = null;
  it.inGroup = true;
  it.icon = 'fi fi-rr-popcorn';
  out.splice(head + 1, 0, it);
}

/** Значок плитки категории — тот же глиф, что водяным знаком на самой плитке */
var tileIcons = {};

function loadTileIcons(home) {
  var jobs = [];
  home.rows.forEach(function (row) {
    row.cards.forEach(function (c) {
      if (!c.tile || tileIcons[c.h]) return;
      jobs.push(TS.dom.query('.home-cat-watermark', { root: c.h, limit: 1, text: false }).then(function (r) {
        var cls = r[0] && r[0].cls.split(' ').filter(function (x) { return x && x !== 'home-cat-watermark'; }).join(' ');
        if (cls) tileIcons[c.h] = cls;
      }).catch(function () { }));
    });
  });
  return Promise.all(jobs).then(function () { return tileIcons; });
}

/** Пункты меню: подборки (группы по приставке), плитки категорий, шапка */
function buildItems(home, navBtns, icons) {
  var out = [];
  home.rows.forEach(function (row) {
    if (!row.cards.length) return;
    if (row.cards[0].tile) {
      out.push({ group: row.title || 'Категории' });
      row.cards.forEach(function (c) {
        out.push({ name: c.title, h: c.h, click: true, tile: true, inGroup: true, icon: icons[c.h] || 'fi fi-rr-apps', split: splitName(c.title) });
      });
      return;
    }
    var card = row.cards[Math.min(row.col, row.cards.length - 1)];
    out.push({ name: row.title, h: card.h, row: row.h, cur: row.index === home.activeRow, split: splitName(row.title) });
  });
  pinFirst(out);
  // Подряд идущие с общей приставкой — группой (и внутри «Категорий» тоже)
  for (var i = 0; i < out.length; i++) {
    var cur = out[i].split;
    if (!cur) continue;
    var prev = i > 0 && out[i - 1].split, next = out[i + 1] && out[i + 1].split;
    var samePrev = prev && prev.prefix === cur.prefix, sameNext = next && next.prefix === cur.prefix;
    if (!samePrev && !sameNext) continue;
    if (!samePrev) { out.splice(i, 0, { group: cur.prefix }); i++; }
    out[i].name = cur.rest;
    out[i].inGroup = true;
    out[i].split = cur;   // сосед сверяется по приставке, а имя уже хвост
  }
  if (navBtns.length) {
    out.push({ group: 'Разделы' });
    navBtns.forEach(function (b) {
      if (b.text) out.push({ name: b.text, h: b.h, click: true, inGroup: true, icon: 'fi fi-rr-angle-small-right' });
    });
  }
  return out;
}

function render() {
  var html = '';
  menu.items.forEach(function (it, i) {
    if (it.group) { html += '<div class="sb-group">' + esc(it.group) + '</div>'; return; }
    html += '<div class="sb-item' + (it.inGroup ? ' in-group' : '') + (it.cur ? ' cur' : '') +
      (i === menu.sel ? ' sel' : '') + '" data-i="' + i + '">' +
      (it.icon ? '<i class="' + esc(it.icon) + '"></i>' : '') + esc(it.name) + '</div>';
  });
  // Выбранный пункт держим в середине списка: прокрутки у ТВ нет — сдвигаем отступом
  var before = menu.items.slice(0, menu.sel).length;
  var shift = Math.max(0, before - 6);
  TS.dom.update(menu.list, { html: '<div style="margin-top:' + (-shift * 2.1) + 'em">' + html + '</div>' });
}

function move(step) {
  var i = menu.sel;
  do { i += step; } while (menu.items[i] && menu.items[i].group);
  if (!menu.items[i]) return;
  menu.sel = i;
  render();
}

function open() {
  if (menu || opening) return;
  opening = true;
  Promise.all([TS.app.home(), TS.dom.query('#home-topbar .home-nav-btn'), TS.app.screen()]).then(function (r) {
    var home = r[0], nav = r[1];
    if (!home.ready) { opening = false; return; }
    return loadTileIcons(home).then(function (icons) { return { home: home, nav: nav, icons: icons, screen: r[2] }; });
  }).then(function (r) {
    if (!r) return;
    var home = r.home;
    var items = buildItems(home, r.nav, r.icons);
    var sel = pickCurrent(items, r.screen);
    return TS.dom.create(
      '<aside id="ext-sb"><div class="sb-list"></div>' +
      '<div class="sb-hint">OK — перейти · ▶ или «Назад» — закрыть</div></aside>'
    ).then(function (root) {
      return TS.dom.query('.sb-list', { root: root.h, limit: 1 }).then(function (l) {
        menu = { root: root, list: l[0], items: items, sel: sel };
        opening = false;
        render();
        TS.keys.capture(true);
        setTimeout(function () { if (menu) TS.dom.update(menu.root, { addClass: 'open' }); }, 20);
      });
    });
  }).catch(function () { opening = false; });
}

// Последний выбранный пункт меню — чтобы меню открывалось там, где вы сейчас. Подборку
// главной меню узнаёт само (показанный ряд), а категорию каталога — нет: каталог не
// говорит, какая плитка его открыла
var LAST_PICK = 'lastPick';

function pickKey(it) { return (it.tile ? 'tile:' : 'item:') + it.name; }

/** Пункт, на котором открыть меню: в каталоге — последняя выбранная категория, на главной — показанная подборка */
function pickCurrent(items, screen) {
  var last = TS.storage.get(LAST_PICK, ''), cur = -1, picked = -1;
  for (var i = 0; i < items.length; i++) {
    if (items[i].group) continue;
    if (items[i].cur && cur < 0) cur = i;
    if (last && pickKey(items[i]) === last) picked = i;
  }
  if (screen === 'catalog' && picked >= 0 && items[picked].tile) {
    // Каталог открыт этой категорией: отмечаем её текущей, а подборку главной — нет
    if (cur >= 0) items[cur].cur = false;
    items[picked].cur = true;
    return picked;
  }
  if (cur >= 0) return cur;
  if (picked >= 0) return picked;
  var first = 0;
  while (items[first] && items[first].group) first++;
  return first;
}

function close(go) {
  if (!menu) return;
  var m = menu;
  menu = null;
  TS.keys.capture(false);
  TS.dom.remove(m.root);
  // Фокус снова на плитке главной (тот же или в выбранной подборке) — сетке нужен пульт
  setTimeout(armGrid, 450);
  if (!go) return;
  var it = m.items[m.sel];
  if (!it || !it.h) return;
  TS.storage.set(LAST_PICK, pickKey(it));
  // Разделы шапки нажимаются с любого экрана
  if (it.click && !it.tile) { TS.dom.click(it.h); return; }
  TS.app.screen().then(function (s) {
    if (s === 'home') return goItem(it);
    // Меню открыто из каталога: подборки и плитки категорий живут на главной, и плитка
    // нажимается только оттуда. Сначала на главную («Главная» в шапке), к пункту — когда
    // она встала на экран и вернула свой фокус (иначе он перебил бы наш)
    pendingRow = it;
    return TS.dom.query('#home-nav-home', { limit: 1, text: false }).then(function (b) {
      if (b[0]) TS.dom.click(b[0].h); else pendingRow = null;
    });
  }).catch(function () { });
}

var pendingRow = null;

/**
 * Ряды главной, кроме показанного, спрятаны (home-row-hidden), а фокус мост ставит
 * только на видимое — переход в другую подборку молча не срабатывал. Снимаем класс с
 * нужного ряда и фокусируем: главная (focusItem → setActiveRow) сама разложит классы
 * рядов заново, как при «вниз».
 */
function goItem(it) {
  if (it.click) return TS.dom.click(it.h).catch(function () { });
  var show = it.row ? TS.dom.update(it.row, { removeClass: 'home-row-hidden' }) : Promise.resolve();
  return show.then(function () { return TS.dom.focus(it.h); }).catch(function () { });
}

TS.on('screen', function (s) {
  if (s !== 'home' || !pendingRow) return;
  var it = pendingRow;
  pendingRow = null;
  setTimeout(function () { goItem(it); }, 500);
});

// Мышью и пальцем — клик по пункту
TS.dom.on('#ext-sb .sb-item', 'click', function (node) {
  if (!menu) return;
  menu.sel = +node.attrs['data-i'];
  close(true);
});

// Меню — с главной и с экранов-сеток (каталог, «Мои торренты»): «влево» с края
var MENU_SCREENS = { home: 1, catalog: 1, torrents: 1 };
// Сетки, где стрелки на краю строки переносят фокус на соседнюю строку
var WRAP_SCREENS = { catalog: 1, torrents: 1 };

// В сетках «влево» с первой колонки не упирается в край, а переносит фокус в конец
// строки выше (moved: true), «вправо» с последней — в начало строки ниже. Край есть
// только у самой первой карточки. Перенос узнаём по тому, что фокус ушёл не в ту
// сторону: «влево» — вправо, «вправо» — влево. Возвращаем фокус на прежнюю карточку;
// у левого края заодно открываем меню
var lastGridFocus = null;

function wrapped(e) {
  var was = lastGridFocus, now = e.focused;
  if (!WRAP_SCREENS[e.screen] || !e.moved || !was || !was.rect || !now || !now.rect) return '';
  if (e.key === 'left' && now.rect.x > was.rect.x + 5) return 'left';
  if (e.key === 'right' && now.rect.x < was.rect.x - 5) return 'right';
  return '';
}

TS.on('nav', function (e) {
  if (menu) return;
  var w = wrapped(e);
  if (w) {
    // Фокус возвращаем на прежнюю карточку и её же помним: следующее нажатие в ту же
    // стену снова должно узнаваться
    var back = lastGridFocus;
    var f = TS.dom.focus(back.h);
    if (w === 'left') f.then(open, open);
    return;
  }
  lastGridFocus = WRAP_SCREENS[e.screen] ? e.focused : null;
  if (e.screen === 'home' && e.focused && /\bhome-card\b/.test(e.focused.cls)) armGrid();
  if (!MENU_SCREENS[e.screen] || e.key !== 'left' || e.moved) return;
  open();
});

TS.on('key', function (dir) {
  if (menu) {
    if (dir === 'up') move(-1);
    else if (dir === 'down') move(1);
    else if (dir === 'enter') close(true);
    else if (dir === 'right' || dir === 'back') close(false);
    return true;
  }
  if (grid.active) { gridKey(dir); return true; }
  return false;
});

// ---- Главная плитками ----
// Вместо баннера и одного ряда-ленты — показанная подборка целиком, сеткой плиток.
// Вверх/вниз ходят по сетке внутри подборки и в соседнюю не перескакивают; подборки
// переключаются меню («влево» с первой колонки). Пока фокус на плитках, пульт держим
// сами (TS.keys.capture): стрелки главной переключали бы подборки. Вверх с первой
// строки и «Назад» — в шапку, пульт отдаём приложению; «вниз» из шапки вернёт его нам.
var GRID_TOP = 120;       // выше — шапка и заголовок подборки
var GRID_BOTTOM_PAD = 24;
var ROW_CARDS = '#home-rows .catalog-row:not(.home-row-hidden) .catalog-row-card';
var grid = { active: false, busy: false, shift: 0, rowsH: null };

TS.ui.addStyle([
  '#home-hero{display:none!important}',
  '#home-rows{transition:transform .15s ease-out}',
  '#home-rows .catalog-row:not(.home-row-hidden) .catalog-row-viewport{overflow:visible!important}',
  '#home-rows .catalog-row:not(.home-row-hidden) .catalog-row-track{flex-wrap:wrap!important;',
  ' transform:none!important;width:auto!important}',
  '.home-row-next{display:none!important}',
  // Название плитки — целиком, до двух строк
  '#home-rows .catalog-row-card.home-card{height:auto!important}',
  '#home-rows .home-tile-label{height:auto!important;white-space:normal!important;font-size:2.6vh!important;',
  ' display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;line-height:1.25!important;',
  ' padding-top:.35em}'
].join('\n'));

function rowsHandle() {
  if (grid.rowsH) return Promise.resolve(grid.rowsH);
  return TS.dom.query('#home-rows', { limit: 1, text: false }).then(function (r) {
    grid.rowsH = r[0] ? r[0].h : null;
    return grid.rowsH;
  });
}

/** Сдвигаем сетку (transform: прокрутку главная держит на нуле), чтобы плитка была видна */
function scrollToCard(card, vh, firstRow) {
  if (!card || !card.rect) return;
  var top = card.rect.y, bottom = card.rect.y + card.rect.h;
  var shift = grid.shift;
  if (firstRow) shift = 0;   // первая строка — сетка на месте, заголовок подборки виден
  else if (bottom > vh - GRID_BOTTOM_PAD) shift += bottom - (vh - GRID_BOTTOM_PAD);
  else if (top < GRID_TOP) shift -= GRID_TOP - top;
  shift = Math.max(0, Math.round(shift));
  if (shift === grid.shift) return;
  grid.shift = shift;
  rowsHandle().then(function (h) {
    if (h) TS.dom.update(h, { style: { transform: shift ? 'translateY(-' + shift + 'px)' : '' } });
  });
}

function viewportHeight() {
  return TS.dom.query('#main-container', { limit: 1, rect: true, text: false }).then(function (r) {
    return r[0] && r[0].rect ? r[0].rect.y + r[0].rect.h : 720;
  });
}

/** Фокус на плитке главной — пульт наш */
function armGrid() {
  if (menu || grid.active) return;
  TS.app.screen().then(function (s) {
    if (s !== 'home' || menu) return;
    return TS.dom.focused().then(function (f) {
      if (!f || !/\bhome-card\b/.test(f.cls)) return;
      grid.active = true;
      TS.keys.capture(true);
      return viewportHeight().then(function (vh) { scrollToCard(f, vh); });
    });
  }).catch(function () { });
}

function releaseGrid() {
  if (!grid.active) return;
  grid.active = false;
  TS.keys.capture(false);
}

function toTopbar() {
  releaseGrid();
  TS.dom.query('#home-topbar .home-nav-btn.active, #home-nav-home', { limit: 2, text: false }).then(function (b) {
    if (b[0]) TS.dom.focus(b[0].h);
  }).catch(function () { });
}

function gridKey(dir) {
  if (dir === 'back') {
    // Пульт приложение уже забрало («Назад» отпускает захват всегда); оно же шлёт back
    // при смене экрана — тогда шапка ни при чём
    grid.active = false;
    TS.app.screen().then(function (s) { if (s === 'home') toTopbar(); });
    return;
  }
  if (grid.busy) return;
  grid.busy = true;
  Promise.all([TS.dom.query(ROW_CARDS, { rect: true, text: false, limit: 300 }), viewportHeight()]).then(function (r) {
    var cards = r[0], vh = r[1];
    if (!cards.length) return;
    var idx = 0;
    for (var i = 0; i < cards.length; i++) if (cards[i].focused) { idx = i; break; }
    var y0 = cards[0].rect.y, cols = 0;
    for (var j = 0; j < cards.length; j++) if (Math.abs(cards[j].rect.y - y0) < 3) cols++;
    cols = Math.max(1, cols);
    var col = idx % cols, row = Math.floor(idx / cols), lastRow = Math.floor((cards.length - 1) / cols);
    var t = -1;
    if (dir === 'enter') return TS.dom.click(cards[idx].h);
    if (dir === 'right') t = col < cols - 1 && idx + 1 < cards.length ? idx + 1 : -1;
    else if (dir === 'left') {
      if (col === 0) { releaseGrid(); open(); return; }
      t = idx - 1;
    } else if (dir === 'down') {
      if (idx + cols < cards.length) t = idx + cols;
      else if (row < lastRow) t = cards.length - 1;
    } else if (dir === 'up') {
      if (row > 0) t = idx - cols;
      else { toTopbar(); return; }
    }
    if (t < 0) return;
    return TS.dom.focus(cards[t].h).then(function () { scrollToCard(cards[t], vh, t < cols); });
  }).then(function () { grid.busy = false; }, function () { grid.busy = false; });
}

TS.on('screen', function (s) {
  if (s !== 'home') { grid.active = false; return; }
  setTimeout(armGrid, 600);
});
setTimeout(armGrid, 1200);

// ---- Оценки на постерах ----
var decorating = false;

function fmt(v) { v = Number(v); return v > 0 ? (Math.round(v * 10) / 10).toFixed(1) : ''; }

function decorate() {
  if (decorating) return;
  decorating = true;
  TS.app.home().then(function (home) {
    if (!home.ready) return;
    var jobs = [];
    home.rows.forEach(function (row) {
      row.cards.forEach(function (c) {
        var r = c.item && fmt(c.item.vote);
        if (!r) return;
        jobs.push(TS.dom.query('.torrent-poster', { root: c.h, limit: 1, text: false }).then(function (box) {
          if (!box[0]) return;
          return TS.dom.query('.ext-rate', { root: box[0].h, limit: 1, text: false }).then(function (have) {
            if (!have.length) return TS.dom.create('<span class="ext-rate"><b>★</b>' + r + '</span>', { parent: box[0].h });
          });
        }).catch(function () { }));
      });
    });
    return Promise.all(jobs);
  }).then(function () { decorating = false; }, function () { decorating = false; });
}

TS.on('home', decorate);
// Меню принадлежит экрану, на котором его открыли: сменился экран — закрываем
TS.on('screen', function () { close(false); });

// ---- Карточки рядов крупнее ----
// Раскладку считает главная: высоту баннера и размер плиток под экран. Её числа мост
// не отдаёт, поэтому один раз меряем, как она разложила, и ставим поверх: плитки в
// CARD_SCALE раз крупнее, баннер ниже ровно на столько, на сколько выросли картинки.
// Меряем один раз: после нашего стиля замер показал бы уже наши размеры, а свой
// размер экран телевизора не меняет.
var CARD_SCALE = 1.2;
var HERO_MIN = 150;
var scaled = false;

function scaleCards() {
  if (scaled) return;
  // Мерить — только когда главная на экране: под настройками или карточкой фильма
  // её раскладка другая, и замер оттуда навсегда дал бы неверные размеры
  TS.app.screen().then(function (s) { if (s === 'home') measureAndScale(); }).catch(function () { });
}

function measureAndScale() {
  if (scaled) return;
  Promise.all([
    TS.dom.query('#home-hero', { limit: 1, rect: true, text: false }),
    TS.dom.query('#home-rows .catalog-row-card.home-card', { limit: 60, rect: true, text: false })
  ]).then(function (r) {
    var hero = r[0][0], card = null;
    // Карточку под фокусом не берём: её подрастание при фокусе (transform) попало бы в замер
    r[1].forEach(function (c) {
      if (!card && !c.focused && c.visible && c.rect && c.rect.w > 0 && c.rect.h > 0) card = c;
    });
    if (scaled || !hero || !hero.visible || !hero.rect || !card) return;
    return TS.dom.query('.torrent-poster', { root: card.h, limit: 1, rect: true, text: false }).then(function (p) {
      var poster = p[0];
      if (scaled || !poster || !poster.rect || !(poster.rect.h > 0)) return;
      var w = poster.rect.w, ih = poster.rect.h, ch = card.rect.h, hh = hero.rect.h;
      var delta = Math.round(ih * CARD_SCALE) - ih;
      if (hh - delta < HERO_MIN) delta = Math.max(0, hh - HERO_MIN);
      if (delta <= 0) return;
      scaled = true;
      var nih = ih + delta, nw = Math.round(w * nih / ih);
      TS.ui.addStyle(
        'body .catalog-row-card.home-card,body .catalog-row-viewport .catalog-row-card.home-card{' +
        'flex:0 0 ' + nw + 'px!important;width:' + nw + 'px!important;height:' + (ch + delta) + 'px!important}' +
        'body .catalog-row-card.home-card .torrent-poster,' +
        'body .catalog-row-viewport .catalog-row-card.home-card .torrent-poster,' +
        'body .catalog-row-card.home-card .row-poster-img{width:' + nw + 'px!important;height:' + nih + 'px!important}' +
        'body #home-hero{height:' + (hh - delta) + 'px!important}');
    });
  }).catch(function () { });
}

// Раскладка готова чуть позже рядов: даём ей время. Расширение может запуститься и
// на уже построенной главной (установили только что) — тогда пробуем сразу, а не
// вышло (главная не на экране) — при первом нажатии на ней
TS.on('home', function () { setTimeout(scaleCards, 600); });
TS.on('screen', function (s) { if (s === 'home') setTimeout(scaleCards, 600); });
TS.on('nav', function (e) { if (!scaled && e.screen === 'home') scaleCards(); });
setTimeout(scaleCards, 600);
