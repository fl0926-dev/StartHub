/* schema.js — loads form-schema.json (single source of truth) and
 * builds: the 지원하기 form, the filter sidebar, and tag rendering.
 * Keeps spec rules (verbatim options, Q4-1 conditional) in one place. */
(function () {
  let schema = null;

  async function load() {
    if (!schema) schema = await fetch('data/form-schema.json').then(r => r.json());
    return schema;
  }
  function questions() { return schema.questions; }
  function get(key) { return schema.questions.find(q => q.key === key); }
  function filterable() { return schema.questions.filter(q => q.filterable); }

  /* ---- Build the apply form into a container ----
   * existing: optional answers object (edit mode) to prefill. */
  function buildForm(container, existing = {}) {
    container.innerHTML = '';
    schema.questions.forEach(q => {
      const wrap = document.createElement('div');
      wrap.className = 'form-q';
      wrap.dataset.key = q.key;
      if (q.conditional) wrap.dataset.conditionalOn = q.conditional.on;

      const label = document.createElement('label');
      label.className = 'form-q-label';
      const num = (q.num && q.num !== '0') ? q.num + '. ' : '';
      // schema label carried in a data-i18n-schema span so I18N.apply re-translates on toggle
      label.innerHTML = `<span class="q-num">${num}</span><span data-i18n-schema="${q.key}"></span>`;
      wrap.appendChild(label);

      const val = existing[q.key];

      if (q.type === 'text') {
        const input = document.createElement(q.key === 'mission' ? 'textarea' : 'input');
        input.name = q.key;
        input.className = 'form-input';
        if (val) input.value = val;
        if (q.required) input.required = true;
        wrap.appendChild(input);
      } else if (q.type === 'file') {
        const input = document.createElement('input');
        input.type = 'file';
        input.name = q.key;
        input.accept = q.accept || '';
        input.className = 'form-file';
        wrap.appendChild(input);
        if (val && val.name) {
          const cur = document.createElement('span');
          cur.className = 'form-file-current';
          cur.textContent = val.name;
          wrap.appendChild(cur);
        }
      } else if (q.type === 'multi') {
        const opts = document.createElement('div');
        opts.className = 'form-options';
        q.options.forEach(opt => {
          const id = q.key + '__' + opt;
          const lab = document.createElement('label');
          lab.className = 'form-option';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.name = q.key;
          cb.value = opt;
          if (Array.isArray(val) && val.includes(opt)) cb.checked = true;
          const span = document.createElement('span');
          span.textContent = opt; // verbatim option text
          lab.append(cb, span);
          opts.appendChild(lab);
        });
        wrap.appendChild(opts);
      }
      container.appendChild(wrap);
    });
    window.I18N.apply(container); // fill data-i18n-schema labels
    wireConditionals(container);
  }

  /* Show/hide Q4-1 based on Q4 selection. */
  function wireConditionals(container) {
    schema.questions.filter(q => q.conditional).forEach(q => {
      const wrap = container.querySelector(`.form-q[data-key="${q.key}"]`);
      const parent = container.querySelector(`.form-q[data-key="${q.conditional.on}"]`);
      if (!wrap || !parent) return;
      const update = () => {
        const checked = [...parent.querySelectorAll('input:checked')].map(i => i.value);
        const show = q.conditional.anyOf.some(v => checked.includes(v));
        wrap.style.display = show ? '' : 'none';
      };
      parent.addEventListener('change', update);
      update();
    });
  }

  /* Read the form into an answers object. */
  function readForm(container) {
    const answers = {};
    schema.questions.forEach(q => {
      const wrap = container.querySelector(`.form-q[data-key="${q.key}"]`);
      if (q.type === 'multi') {
        if (wrap && wrap.style.display === 'none') { answers[q.key] = []; return; }
        answers[q.key] = [...container.querySelectorAll(`input[name="${q.key}"]:checked`)].map(i => i.value);
      } else if (q.type === 'text') {
        const el = container.querySelector(`[name="${q.key}"]`);
        answers[q.key] = el ? el.value.trim() : '';
      }
      // files handled separately by the page (async fileToRecord)
    });
    return answers;
  }

  /* Validate: required multi needs >=1; required text non-empty. Returns [] or error keys. */
  function validate(answers) {
    const errs = [];
    schema.questions.forEach(q => {
      if (!q.required) return;
      if (q.conditional) return; // conditional handled by visibility
      if (q.type === 'multi' && (!answers[q.key] || !answers[q.key].length)) errs.push(q.key);
      if (q.type === 'text' && !answers[q.key]) errs.push(q.key);
    });
    return errs;
  }

  window.SCHEMA = { load, questions, get, filterable, buildForm, readForm, validate };
})();
