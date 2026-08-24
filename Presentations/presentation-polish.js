/*
  Progressive builds used to inherit the size chosen for their densest final
  state.  Fit each rendered slide independently so early reveals keep their
  natural presentation scale.
*/

(() => {
  const fitSlide = (slide) => {
    const inner = slide.querySelector('.slide-inner');
    if (!inner || !slide.clientHeight || !slide.clientWidth) return;

    slide.classList.add('measuring');
    let scale = 1;
    slide.style.setProperty('--fit', scale);

    const fits = () =>
      inner.scrollHeight <= slide.clientHeight * 0.82 &&
      inner.scrollWidth <= slide.clientWidth * 0.92;

    while (scale > 0.72 && !fits()) {
      scale = Math.max(0.72, scale - 0.01);
      slide.style.setProperty('--fit', scale.toFixed(3));
    }

    slide.classList.remove('measuring');
  };

  const fitEverySlide = () => {
    document.querySelectorAll('.slide').forEach(fitSlide);
  };

  let resizeTimer;
  const scheduleFit = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitEverySlide, 210);
  };

  window.addEventListener('resize', scheduleFit);
  window.addEventListener('load', scheduleFit, { once: true });

  if (document.fonts?.ready) {
    document.fonts.ready.then(scheduleFit);
  } else {
    scheduleFit();
  }
})();
