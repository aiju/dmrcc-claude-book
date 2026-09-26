// Theme toggle: cycles system -> light -> dark and remembers the choice.
(function () {
  var root = document.documentElement;
  function get() { try { return localStorage.getItem('theme') || ''; } catch (e) { return ''; } }
  function set(v) { try { v ? localStorage.setItem('theme', v) : localStorage.removeItem('theme'); } catch (e) {} }
  function apply(v) { if (v) root.setAttribute('data-theme', v); else root.removeAttribute('data-theme'); }
  apply(get());
  document.addEventListener('DOMContentLoaded', function () {
    var tools = document.querySelector('.topbar .tools');
    if (!tools) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'themebtn';
    function label() { var v = get(); b.textContent = v ? v[0].toUpperCase() + v.slice(1) : 'Auto'; b.title = 'Colour theme: ' + (v || 'follow system'); }
    b.addEventListener('click', function () {
      var v = get(), n = v === '' ? 'light' : v === 'light' ? 'dark' : '';
      set(n); apply(n); label();
    });
    label();
    tools.appendChild(b);
  });
})();
