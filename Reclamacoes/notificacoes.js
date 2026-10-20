(function () {
  let container;

  function getContainer() {
    if (container && container.isConnected) {
      return container;
    }

    container = document.querySelector(".toast-container");

    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      container.setAttribute("aria-live", "polite");
      container.setAttribute("aria-atomic", "false");
      document.body.appendChild(container);
    }

    return container;
  }

  window.showToast = function (message, type = "info", duration = 4500) {
    const allowedTypes = ["success", "error", "info"];

    if (!allowedTypes.includes(type)) {
      type = "info";
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.style.setProperty("--toast-duration", `${duration}ms`);
    toast.setAttribute("role", type === "error" ? "alert" : "status");

    const content = document.createElement("div");
    content.className = "toast-content";

    const icon = document.createElement("span");
    icon.className = "toast-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = type === "success" ? "✓" : type === "error" ? "!" : "i";

    const text = document.createElement("span");
    text.textContent = message;

    const progress = document.createElement("div");
    progress.className = "toast-progress";

    content.append(icon, text);
    toast.append(content, progress);
    getContainer().appendChild(toast);

    const removeToast = () => {
      if (!toast.isConnected) return;

      toast.classList.add("toast-leaving");
      toast.addEventListener("animationend", () => toast.remove(), {
        once: true,
      });

      // Fallback caso a animação não dispare.
      setTimeout(() => toast.remove(), 400);
    };

    const timeout = setTimeout(removeToast, duration);

    // Pausa a contagem enquanto o usuário passa o mouse.
    toast.addEventListener("mouseenter", () => {
      clearTimeout(timeout);
      progress.style.animationPlayState = "paused";
    });

    toast.addEventListener("mouseleave", () => {
      progress.style.animationPlayState = "running";
    });
  };

  // Exibe uma notificação pendente após o redirecionamento.
  document.addEventListener("DOMContentLoaded", () => {
    const notification = sessionStorage.getItem("fiscalizeToast");

    if (notification) {
      sessionStorage.removeItem("fiscalizeToast");

      try {
        const toast = JSON.parse(notification);

        window.showToast(toast.message, toast.type, toast.duration);
      } catch (error) {
        console.error("Erro ao exibir notificação:", error);
      }
    }
  });
})();
