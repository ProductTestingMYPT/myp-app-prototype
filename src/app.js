(function () {
  const APP = (window.SupportShiftApp = window.SupportShiftApp || {});
  const store = APP.store;
  const ui = APP.ui;

  const root = document.getElementById("app");
  let weekGesture = null;
  let suppressNextDayTap = false;
  let pendingWeekAnimation = "";

  function render() {
    store.recomputeAllStatuses();
    root.innerHTML = ui.renderApp();
    bindWeekSwipe();
    applyWeekAnimation();
    updateLiveUi();
  }

  function applyWeekAnimation() {
    const slide = document.querySelector("[data-week-slide]");
    if (!slide || !pendingWeekAnimation) return;
    const animationDirection = pendingWeekAnimation;
    slide.classList.add("week-slide-enter", "week-slide-enter-" + animationDirection);
    window.setTimeout(function () {
      slide.classList.remove("week-slide-enter", "week-slide-enter-" + animationDirection);
    }, 220);
    pendingWeekAnimation = "";
  }

  function bindWeekSwipe() {
    const strip = document.querySelector("[data-week-strip]");
    if (!strip || strip.getAttribute("data-bound") === "true") return;
    strip.setAttribute("data-bound", "true");

    strip.addEventListener("touchstart", function (event) {
      const touch = event.touches[0];
      weekGesture = {
        startX: touch.clientX,
        startY: touch.clientY,
        handled: false,
      };
    });

    strip.addEventListener(
      "touchmove",
      function (event) {
        if (!weekGesture || weekGesture.handled) return;
        const touch = event.touches[0];
        const deltaX = touch.clientX - weekGesture.startX;
        const deltaY = touch.clientY - weekGesture.startY;

        if (Math.abs(deltaX) < 36 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

        const direction = deltaX < 0 ? 7 : -7;
        weekGesture.handled = true;
        suppressNextDayTap = true;
        pendingWeekAnimation = deltaX < 0 ? "next" : "previous";
        store.setActiveWeekStartDate(
          ui.plusDays(store.state.activeWeekStartDate, direction)
        );
        event.preventDefault();
      },
      { passive: false }
    );

    strip.addEventListener("touchend", function () {
      weekGesture = null;
      window.setTimeout(function () {
        suppressNextDayTap = false;
      }, 0);
    });

    strip.addEventListener("touchcancel", function () {
      weekGesture = null;
      suppressNextDayTap = false;
    });
  }

  function setAutosaveIndicator(type, shiftId, participantId) {
    const selector =
      '[data-autosave-indicator="' +
      type +
      '"][data-shift-id="' +
      shiftId +
      '"]' +
      (participantId ? '[data-participant-id="' + participantId + '"]' : "");
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = "Autosaved just now";
    }
  }

  function updateLiveUi() {
    const activeShift = store.getActiveShift();
    document.querySelectorAll("[data-live-timer]").forEach(function (node) {
      if (!activeShift || node.getAttribute("data-live-timer") !== activeShift.id) return;
      node.textContent = ui.renderTimerValue(activeShift.workflow.checkedInAt);
    });
  }

  function handleClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    const action = target.getAttribute("data-action");

    if (action === "toggle-menu") store.toggleMenu();
    if (action === "close-menu") store.closeMenu();
    if (action === "toggle-notifications") store.toggleNotifications();
    if (action === "close-notifications") store.closeNotifications();
    if (action === "close-overlays") store.closeOverlays();
    if (action === "go-page") store.setPage(target.getAttribute("data-page"));
    if (action === "select-date") {
      if (suppressNextDayTap) return;
      store.setSelectedDate(target.getAttribute("data-date"));
    }
    if (action === "open-calendar") store.openCalendarOverlay();
    if (action === "open-filters") store.openFilterOverlay();
    if (action === "apply-filters") store.applyFilterDraft();
    if (action === "clear-filters") store.clearFilters();
    if (action === "calendar-month") {
      store.shiftCalendarMonth(Number(target.getAttribute("data-offset") || 0));
    }
    if (action === "jump-to-date") store.jumpToDate(target.getAttribute("data-date"));
    if (action === "open-shift") store.openShift(target.getAttribute("data-shift-id"));
    if (action === "resume-active-shift") store.openActiveShift();
    if (action === "back-to-schedule") store.goBackToSchedule();
    if (action === "select-tab") store.setTab(target.getAttribute("data-tab"));
    if (action === "check-in") store.checkIn(target.getAttribute("data-shift-id"));
    if (action === "check-out") store.checkOut(target.getAttribute("data-shift-id"));
    if (action === "toggle-task") {
      store.toggleTask(target.getAttribute("data-shift-id"), target.getAttribute("data-task-id"));
    }
    if (action === "open-client-note") {
      store.openClientNoteOverlay(
        target.getAttribute("data-shift-id"),
        target.getAttribute("data-participant-id")
      );
    }
    if (action === "open-general-notes") {
      store.openGeneralNotesOverlay(target.getAttribute("data-shift-id"));
    }
    if (action === "toggle-forms-accordion") {
      store.toggleFormsAccordion(
        target.getAttribute("data-shift-id"),
        target.getAttribute("data-participant-id")
      );
    }
    if (action === "add-linked-form") {
      store.addLinkedForm(
        target.getAttribute("data-shift-id"),
        target.getAttribute("data-participant-id")
      );
    }
    if (action === "toggle-client-info") {
      store.toggleClientInfoAccordion(
        target.getAttribute("data-shift-id"),
        target.getAttribute("data-participant-id")
      );
    }
    if (action === "open-add-allowance") {
      store.openAllowanceOverlay(target.getAttribute("data-shift-id"));
    }
    if (action === "edit-allowance") {
      store.openAllowanceOverlay(
        target.getAttribute("data-shift-id"),
        target.getAttribute("data-allowance-id")
      );
    }
    if (action === "save-allowance") store.saveAllowanceDraft();
    if (action === "close-overlay") store.closeActiveOverlay();
    if (action === "placeholder") window.alert("Placeholder action for prototype only.");
  }

  function handleChange(event) {
    const target = event.target;
    const action = target.getAttribute("data-action");
    if (action === "set-client-attendance") {
      store.updateClientAttendance(
        target.getAttribute("data-shift-id"),
        target.getAttribute("data-participant-id"),
        target.value
      );
    }
    if (action === "form-select-change") {
      store.setFormSelection(target.value);
    }
    if (action === "allowance-type-change") {
      store.setAllowanceType(target.value);
    }
    if (action === "filter-change") {
      store.updateFilterDraft(target.getAttribute("data-field"), target.value);
    }
  }

  function handleInput(event) {
    const target = event.target;
    const action = target.getAttribute("data-action");

    if (action === "client-note-input") {
      store.updateClientNoteText(
        target.getAttribute("data-shift-id"),
        target.getAttribute("data-participant-id"),
        target.value
      );
      setAutosaveIndicator(
        "client-note",
        target.getAttribute("data-shift-id"),
        target.getAttribute("data-participant-id")
      );
    }

    if (action === "client-absence-input") {
      store.updateClientAbsenceReason(
        target.getAttribute("data-shift-id"),
        target.getAttribute("data-participant-id"),
        target.value
      );
      setAutosaveIndicator(
        "client-note",
        target.getAttribute("data-shift-id"),
        target.getAttribute("data-participant-id")
      );
    }

    if (action === "general-note-input") {
      store.updateGeneralNoteText(target.getAttribute("data-shift-id"), target.value);
      setAutosaveIndicator("general-notes", target.getAttribute("data-shift-id"));
    }

    if (action === "form-search-input") {
      store.setFormSearch(target.value);
    }

    if (action === "allowance-quantity-input") {
      store.updateAllowanceDraft("quantity", target.value);
    }
  }

  store.subscribe(render);
  document.addEventListener("click", handleClick);
  document.addEventListener("change", handleChange);
  document.addEventListener("input", handleInput);
  window.setInterval(updateLiveUi, 1000);

  render();
})();
