document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');

  function toggleMenu() {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
  }

  menuBtn.addEventListener('click', toggleMenu);
  overlay.addEventListener('click', toggleMenu);
});