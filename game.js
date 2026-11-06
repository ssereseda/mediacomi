/* Медиакоми — логика игры */
(function () {
  "use strict";

  var ROUNDS = 10;
  var SLIDER_MIN = 50000;
  var SLIDER_MAX = 2000000;
  var SLIDER_STEP = 5000;

  var fmt = new Intl.NumberFormat("ru-RU");

  function money(n) { return fmt.format(Math.round(n)) + " ₽"; }

  // --- Балльная система: чем ближе к реальной цене, тем больше баллов ---
  function pointsFor(dev) { // dev — относительная ошибка (0..∞)
    if (dev <= 0.05) return 10;
    if (dev <= 0.10) return 8;
    if (dev <= 0.20) return 6;
    if (dev <= 0.35) return 4;
    if (dev <= 0.50) return 2;
    if (dev <= 0.75) return 1;
    return 0;
  }

  // --- Экраны ---
  var screens = {
    start: document.getElementById("screen-start"),
    round: document.getElementById("screen-round"),
    final: document.getElementById("screen-final")
  };

  function show(name) {
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle("hidden", k !== name);
    });
  }

  // --- Элементы ---
  var el = {
    progressWrap: document.getElementById("progressWrap"),
    progressBar: document.getElementById("progressBar"),
    progressLabel: document.getElementById("progressLabel"),
    gallery: document.getElementById("gallery"),
    galleryDots: document.getElementById("galleryDots"),
    lotDesc: document.getElementById("lotDesc"),
    lotStreet: document.getElementById("lotStreet"),
    guessBlock: document.getElementById("guessBlock"),
    guessValue: document.getElementById("guessValue"),
    slider: document.getElementById("priceSlider"),
    btnGuess: document.getElementById("btnGuess"),
    feedbackBlock: document.getElementById("feedbackBlock"),
    fbTitle: document.getElementById("fbTitle"),
    fbReal: document.getElementById("fbReal"),
    fbGuess: document.getElementById("fbGuess"),
    fbDiff: document.getElementById("fbDiff"),
    fbPoints: document.getElementById("fbPoints"),
    fbLink: document.getElementById("fbLink"),
    btnNext: document.getElementById("btnNext"),
    finalScore: document.getElementById("finalScore"),
    finalBarFill: document.getElementById("finalBarFill"),
    personaEmoji: document.getElementById("personaEmoji"),
    personaTitle: document.getElementById("personaTitle"),
    personaText: document.getElementById("personaText"),
    finalStats: document.getElementById("finalStats"),
    roundsList: document.getElementById("roundsList"),
    btnStart: document.getElementById("btnStart"),
    btnRestart: document.getElementById("btnRestart")
  };

  // --- Состояние ---
  var state = {
    order: [],
    idx: 0,
    score: 0,
    rounds: []
  };

  function eligible() {
    return (window.APARTMENTS || []).filter(function (a) {
      return a.photos && a.photos.length > 0 && a.price > 0;
    });
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function startGame() {
    var pool = eligible();
    if (pool.length < ROUNDS) {
      alert("Недостаточно активных объявлений в данных.");
      return;
    }
    state.order = shuffle(pool).slice(0, ROUNDS);
    state.idx = 0;
    state.score = 0;
    state.rounds = [];
    el.progressWrap.classList.remove("hidden");
    show("round");
    renderRound();
  }

  // --- Галерея ---
  function renderGallery(apt) {
    el.gallery.innerHTML = "";
    el.galleryDots.innerHTML = "";
    apt.photos.forEach(function (src, i) {
      var img = document.createElement("img");
      img.src = src;
      img.alt = "Фото квартиры " + (i + 1);
      img.loading = i === 0 ? "eager" : "lazy"; // первое фото сразу, остальные по мере пролистывания
      img.referrerPolicy = "no-referrer"; // обход блокировки хотлинга
      el.gallery.appendChild(img);

      var dot = document.createElement("i");
      if (i === 0) dot.classList.add("active");
      dot.addEventListener("click", function () {
        el.gallery.scrollTo({ left: i * el.gallery.clientWidth, behavior: "smooth" });
      });
      el.galleryDots.appendChild(dot);
    });

    el.gallery.onscroll = function () {
      var i = Math.round(el.gallery.scrollLeft / el.gallery.clientWidth);
      var dots = el.galleryDots.children;
      for (var k = 0; k < dots.length; k++) {
        dots[k].classList.toggle("active", k === i);
      }
    };
  }

  // --- Бегунок ---
  function updateSliderUI() {
    var v = Number(el.slider.value);
    el.guessValue.textContent = money(v);
    var pct = ((v - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;
    el.slider.style.background =
      "linear-gradient(to right, var(--blue) " + pct + "%, #DDE3EC " + pct + "%)";
  }

  function renderRound() {
    var apt = state.order[state.idx];
    var pct = ((state.idx) / ROUNDS) * 100;
    el.progressBar.style.width = Math.max(pct, 5) + "%";
    el.progressLabel.textContent = (state.idx + 1) + " / " + ROUNDS;

    renderGallery(apt);
    el.lotDesc.textContent = apt.desc;
    el.lotStreet.textContent = apt.street ? apt.street + ", Инта, республика Коми" : "Республика Коми";

    el.slider.min = SLIDER_MIN;
    el.slider.max = SLIDER_MAX;
    el.slider.step = SLIDER_STEP;
    el.slider.value = Math.round((SLIDER_MIN + SLIDER_MAX) / 2 / SLIDER_STEP) * SLIDER_STEP;
    updateSliderUI();

    el.guessBlock.classList.remove("hidden");
    el.feedbackBlock.classList.add("hidden");
    el.btnNext.textContent = state.idx === ROUNDS - 1 ? "Показать результат" : "Следующая квартира";
  }

  // --- Оценка ---
  function onGuess() {
    var apt = state.order[state.idx];
    var guess = Number(el.slider.value);
    var real = apt.price;
    var diff = guess - real;
    var dev = Math.abs(diff) / real;
    var pts = pointsFor(dev);

    state.rounds.push({ apt: apt, guess: guess, real: real, diff: diff, dev: dev, pts: pts });
    state.score += pts;

    el.fbReal.textContent = money(real);
    el.fbGuess.textContent = money(guess);

    var pct = Math.round(Math.abs(diff) / real * 100);
    el.fbDiff.textContent = (diff > 0 ? "+" : diff < 0 ? "−" : "") + money(Math.abs(diff)) + " (" + pct + "%)";
    el.fbDiff.className = diff > 0 ? "up" : diff < 0 ? "down" : "";

    el.fbTitle.textContent = diff === 0 ? "Точно в цель! Реальная цена" : "Реальная цена";
    el.fbPoints.textContent = "+" + pts;
    el.fbPoints.className = pts >= 6 ? "down" : pts >= 2 ? "" : "up";
    el.fbLink.href = apt.url;

    el.guessBlock.classList.add("hidden");
    el.feedbackBlock.classList.remove("hidden");

    // прогресс: раунд пройден
    el.progressBar.style.width = (((state.idx + 1) / ROUNDS) * 100) + "%";
  }

  function onNext() {
    state.idx++;
    if (state.idx >= ROUNDS) { renderFinal(); }
    else { renderRound(); window.scrollTo(0, 0); }
  }

  // --- Итоги ---
  var PERSONAS = {
    cheap: {
      emoji: "🪙",
      title: "Жадный студент",
      text: "Твои ставки почти всегда ниже реальных цен. Да, квартиры в Коми дешёвые, но не настолько! Рынок тебя удивил."
    },
    fair: {
      emoji: "🎯",
      title: "Адекватный квартирант",
      text: "Ты отлично чувствуешь рынок республики Коми: большинство твоих оценок совпало с реальными ценами. Так держать!"
    },
    rich: {
      emoji: "💸",
      title: "Транжира",
      text: "Ты готов переплачивать! Твои ставки в основном выше реальных цен. В Инте за такие деньги продают не одну квартиру, а целый подъезд."
    }
  };

  function personaFor(rounds) {
    var matches = rounds.filter(function (r) { return r.dev <= 0.10; }).length;
    if (matches >= 6) return PERSONAS.fair;
    var over = rounds.filter(function (r) { return r.diff > 0; }).length;
    var under = rounds.filter(function (r) { return r.diff < 0; }).length;
    return under >= over ? PERSONAS.cheap : PERSONAS.rich;
  }

  function renderFinal() {
    show("final");
    el.progressWrap.classList.add("hidden");
    window.scrollTo(0, 0);

    el.finalScore.textContent = state.score + " / " + (ROUNDS * 10);
    setTimeout(function () {
      el.finalBarFill.style.width = (state.score / (ROUNDS * 10) * 100) + "%";
    }, 60);

    var p = personaFor(state.rounds);
    el.personaEmoji.textContent = p.emoji;
    el.personaTitle.textContent = p.title;
    el.personaText.textContent = p.text;

    var over = state.rounds.filter(function (r) { return r.diff > 0; }).length;
    var under = state.rounds.filter(function (r) { return r.diff < 0; }).length;
    var avgDev = state.rounds.reduce(function (s, r) { return s + r.dev; }, 0) / state.rounds.length;
    el.finalStats.innerHTML =
      "Средняя ошибка: <b>" + Math.round(avgDev * 100) + "%</b><br>" +
      "Ставок выше цены: <b>" + over + "</b> · ниже цены: <b>" + under + "</b>";

    el.roundsList.innerHTML = "";
    state.rounds.forEach(function (r, i) {
      var row = document.createElement("div");
      row.className = "round-item";
      var name = document.createElement("span");
      name.className = "name";
      name.textContent = (i + 1) + ". " + r.apt.desc;
      var pts = document.createElement("span");
      pts.className = "pts";
      pts.textContent = r.pts + " б.";
      row.appendChild(name);
      row.appendChild(pts);
      el.roundsList.appendChild(row);
    });
  }

  // --- События ---
  el.slider.addEventListener("input", updateSliderUI);
  el.btnStart.addEventListener("click", startGame);
  el.btnGuess.addEventListener("click", onGuess);
  el.btnNext.addEventListener("click", onNext);
  el.btnRestart.addEventListener("click", startGame);

  updateSliderUI();
})();
