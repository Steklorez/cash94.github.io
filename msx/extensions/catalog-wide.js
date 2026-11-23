/*
 * Горизонтальный каталог — карточки сетки каталога (Фильмы, Сериалы, Аниме…) в 16:9
 * вместо вертикальных постеров, название — целиком, до двух строк, вместо бегущей
 * строки.
 *
 * Кадров у элементов каталога нет, поэтому картинка — тот же постер, обрезанный по
 * ширине (верхняя треть, где обычно лица). Колонок столько же, сколько задано во
 * «Внешнем виде»: по этому числу пульт считает «вверх/вниз», и менять его стилем
 * нельзя — навигация разошлась бы с раскладкой.
 */
TS.register({
  name: 'Горизонтальный каталог',
  version: '1.0',
  description: 'Карточки каталога горизонтальные (16:9), название целиком в две строки.'
});

TS.ui.addStyle([
  '#catalog-grid .catalog-card{height:auto!important}',
  // 16:9 через padding-top: aspect-ratio на части телевизоров (Chrome < 88) нет
  '#catalog-grid .catalog-card .torrent-poster{position:relative!important;height:0!important;',
  ' padding-top:56.25%!important;overflow:hidden}',
  '#catalog-grid .catalog-card .torrent-poster img{position:absolute!important;left:0;top:0;',
  ' width:100%!important;height:100%!important;object-fit:cover;object-position:50% 22%}',
  // Название: без бегущей строки, до двух строк
  '#catalog-grid .catalog-card .torrent-title,#catalog-grid .catalog-card .torrent-title span{',
  ' white-space:normal!important;overflow:hidden;text-overflow:clip!important;',
  ' animation:none!important;transform:none!important}',
  '#catalog-grid .catalog-card .torrent-title{display:-webkit-box!important;-webkit-box-orient:vertical;',
  ' -webkit-line-clamp:2;line-height:1.25;font-size:2.6vh!important}',
  // Карточка широкая — подписи крупнее, чем у вертикального постера
  '#catalog-grid .catalog-card .catalog-card-sub{font-size:2.1vh!important}',
  // «★ 7.2» в левом верхнем углу постера — как на плитках главной. Оценка уже лежит в
  // data-rating карточки; ::before — подложка со звездой и числом, ::after — та же
  // звезда оранжевым поверх белой (один псевдоэлемент двумя цветами не покрасить)
  '#catalog-grid .catalog-card{position:relative}',
  '#catalog-grid .catalog-card[data-rating]:not([data-rating=""]):before,',
  '#catalog-grid .catalog-card[data-rating]:not([data-rating=""]):after{position:absolute;left:.45em;top:.45em;',
  // z-index выше постера: у карточки под фокусом он поднят (z-index:5) и закрывал число
  ' z-index:8;padding:.2em .5em;border-radius:.45em;font-size:2.7vh;font-weight:700;line-height:1.3;',
  ' pointer-events:none}',
  '#catalog-grid .catalog-card[data-rating]:not([data-rating=""]):before{content:"★ " attr(data-rating);',
  ' background:rgba(0,0,0,.72);color:#fff}',
  '#catalog-grid .catalog-card[data-rating]:not([data-rating=""]):after{content:"★";color:#ff8c00;background:none}',
  // «▶» по центру постера карточки под фокусом — как на главной. Псевдоэлементы постера
  // заняты (::after — рамка фокуса), берём блок подписи: он не позиционирован, значит
  // его ::before/::after встают от карточки. Середина постера по вертикали — 28.125%
  // ширины карточки (постер 16:9), а margin-top в процентах считается как раз от ширины
  '#catalog-grid .catalog-card.focused .torrent-info:before,',
  '#catalog-grid .catalog-card.focused .torrent-info:after{content:"";position:absolute;left:50%;top:0;',
  ' z-index:8;pointer-events:none}',
  '#catalog-grid .catalog-card.focused .torrent-info:before{width:9vh;height:9vh;',
  ' margin:calc(28.125% - 4.5vh) 0 0 -4.5vh;box-sizing:border-box;border-radius:50%;',
  ' border:.35vh solid rgba(255,140,0,.9);background:rgba(0,0,0,.42)}',
  '#catalog-grid .catalog-card.focused .torrent-info:after{margin:calc(28.125% - 1.6vh) 0 0 -.9vh;',
  ' border-style:solid;border-width:1.6vh 0 1.6vh 2.6vh;',
  ' border-color:transparent transparent transparent rgba(255,140,0,.95)}',
  // Оценка уже в углу постера — из строки «год · ★ · тип» её убираем вместе с точкой
  '#catalog-grid .catalog-card-sub .rating-badge,',
  '#catalog-grid .catalog-card-sub .catalog-sub-dot-r:not(.catalog-sub-dot-y){display:none!important}'
].join('\n'));
