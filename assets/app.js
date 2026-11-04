/* Page glue: scale each drawn screen to its frame, the Sound switch, start the two recreations. */
(function (root) {
  "use strict";
  var S = root.MT_SFX;

  // Each stage is designed at a fixed size and scaled to fit; on a narrow screen it stops
  // shrinking at data-min and the frame scrolls sideways instead.
  function fit(stage) {
    var w = +stage.getAttribute("data-w"), h = +stage.getAttribute("data-h"), min = +stage.getAttribute("data-min") || 0.6;
    var viewport = stage.parentNode, scaler = document.createElement("div");
    scaler.className = "scaler"; viewport.insertBefore(scaler, stage); scaler.appendChild(stage);
    function apply() {
      var avail = viewport.clientWidth, s = Math.max(min, Math.min(+stage.getAttribute("data-max") || 1.12, avail / w));
      scaler.style.width = Math.round(w * s) + "px"; scaler.style.height = Math.round(h * s) + "px";
      scaler.style.marginLeft = Math.max(0, Math.round((avail - w * s) / 2)) + "px";
      stage.style.transform = "scale(" + s + ")";
    }
    apply();
    if (root.ResizeObserver) new ResizeObserver(apply).observe(viewport); else root.addEventListener("resize", apply);
  }

  function boot() {
    root.MT_initShell();   // builds the shell stage before it is measured
    root.MT_initDepDeck();
    Array.prototype.forEach.call(document.querySelectorAll(".stage"), fit);

    var btn = document.getElementById("snd"), lbl = btn.querySelector(".lbl");
    function show() { btn.setAttribute("aria-pressed", String(S.isOn())); lbl.textContent = S.isOn() ? "Sound on" : "Sound off"; }
    btn.addEventListener("click", function () { S.set(!S.isOn()); show(); });
    show();
    // a remembered "on" needs one gesture before the browser lets audio start
    var unlock = function () { if (S.isOn()) S.set(true); document.removeEventListener("pointerdown", unlock, true); };
    document.addEventListener("pointerdown", unlock, true);
    // softly click on plain buttons outside the drawn screens too
    document.addEventListener("click", function (e) { if (e.target.closest(".btn, .mbtn, .seg button")) S.play("click"); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})(window);
